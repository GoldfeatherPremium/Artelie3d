import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Ledger domain errors. Typed, carries a stable machine `code`.
 */
export class LedgerError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LedgerError";
    this.code = code;
  }
}

export type LedgerEntryType = "sale" | "refund" | "adjustment" | "payout";

export interface LedgerEntryInput {
  sellerId: string;
  storeId: string;
  entryType: LedgerEntryType;
  amountCents: number;
  orderId?: string | null;
  payoutId?: string | null;
  description?: string | null;
  createdBy?: string | null;
}

export interface LedgerEntryRow {
  id: string;
  balanceAfterCents: number;
}

export interface PayoutPeriod {
  start?: string | null;
  end?: string | null;
}

/**
 * Commission math. Money is integer cents; rate is a decimal fraction (0.08 = 8%).
 */
export function computeCommission(
  grossCents: number,
  rate: number,
): { commissionCents: number; netCents: number } {
  if (!Number.isFinite(grossCents) || grossCents < 0) {
    throw new LedgerError("INVALID_GROSS", "grossCents must be a non-negative number");
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new LedgerError("INVALID_RATE", "rate must be between 0 and 1");
  }
  const commissionCents = Math.round(grossCents * rate);
  return { commissionCents, netCents: grossCents - commissionCents };
}

/** Last recorded balance for a seller within a store. */
async function readLastBalance(
  db: SupabaseClient,
  sellerId: string,
  storeId: string,
): Promise<number> {
  const { data, error } = await db
    .from("seller_ledger")
    .select("balance_after_cents")
    .eq("seller_id", sellerId)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new LedgerError("LEDGER_READ_FAILED", error.message);
  return data?.balance_after_cents ?? 0;
}

/**
 * Append an immutable ledger entry. balance_after = previous balance + amount.
 * Ledger rows are never updated/deleted in normal operation.
 */
export async function recordLedgerEntry(entry: LedgerEntryInput): Promise<LedgerEntryRow> {
  if (!Number.isInteger(entry.amountCents)) {
    throw new LedgerError("INVALID_AMOUNT", "amountCents must be an integer");
  }
  const db = createServiceClient();
  const previous = await readLastBalance(db, entry.sellerId, entry.storeId);
  const balanceAfterCents = previous + entry.amountCents;

  const { data, error } = await db
    .from("seller_ledger")
    .insert({
      seller_id: entry.sellerId,
      store_id: entry.storeId,
      entry_type: entry.entryType,
      amount_cents: entry.amountCents,
      balance_after_cents: balanceAfterCents,
      order_id: entry.orderId ?? null,
      payout_id: entry.payoutId ?? null,
      description: entry.description ?? null,
      created_by: entry.createdBy ?? null,
    })
    .select("id, balance_after_cents")
    .maybeSingle();
  if (error || !data) {
    throw new LedgerError("LEDGER_INSERT_FAILED", error?.message ?? "Failed to record ledger entry");
  }
  return { id: data.id, balanceAfterCents: data.balance_after_cents };
}

/**
 * Accrue one commission row per order item using the store's
 * platform_commission_rate, then record matching net-proceeds ledger entries.
 * Ledger balances are computed deterministically from a single initial read so
 * multiple entries written in one batch accumulate correctly.
 */
export async function accrueCommissionsForOrder(orderId: string): Promise<void> {
  const db = createServiceClient();

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, currency")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    throw new LedgerError("ORDER_NOT_FOUND", orderError?.message ?? "Order not found");
  }
  const currency = (order.currency ?? "USD") as string;

  const { data: itemRows, error: itemsError } = await db
    .from("order_items")
    .select("id, seller_id, store_id, line_total_cents")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (itemsError || !itemRows || itemRows.length === 0) {
    throw new LedgerError("ORDER_ITEMS_NOT_FOUND", itemsError?.message ?? "Order has no items");
  }
  const items = itemRows as {
    id: string;
    seller_id: string;
    store_id: string;
    line_total_cents: number;
  }[];

  const storeIds = [...new Set(items.map((item) => item.store_id))];
  const { data: storeRows } = await db
    .from("stores")
    .select("id, platform_commission_rate")
    .in("id", storeIds);
  const storeById = new Map<string, { platform_commission_rate: number }>(
    (storeRows ?? []).map((store) => [store.id, store as { platform_commission_rate: number }]),
  );

  // One commission row per order item.
  const commissionRows = items.map((item) => {
    const rate = Number(storeById.get(item.store_id)?.platform_commission_rate ?? 0);
    const { commissionCents, netCents } = computeCommission(item.line_total_cents, rate);
    return {
      order_item_id: item.id,
      order_id: orderId,
      seller_id: item.seller_id,
      store_id: item.store_id,
      gross_amount_cents: item.line_total_cents,
      commission_rate: rate,
      commission_amount_cents: commissionCents,
      net_amount_cents: netCents,
      currency,
      status: "accrued",
    };
  });
  const { error: commissionError } = await db.from("commissions").insert(commissionRows);
  if (commissionError) throw new LedgerError("COMMISSION_INSERT_FAILED", commissionError.message);

  // Ledger entries with explicit running balances.
  const balanceBySellerStore = new Map<string, number>();
  for (const item of items) {
    const key = `${item.seller_id}:${item.store_id}`;
    if (!balanceBySellerStore.has(key)) {
      balanceBySellerStore.set(key, await readLastBalance(db, item.seller_id, item.store_id));
    }
    const rate = Number(storeById.get(item.store_id)?.platform_commission_rate ?? 0);
    const { netCents } = computeCommission(item.line_total_cents, rate);
    const balanceAfterCents = (balanceBySellerStore.get(key) ?? 0) + netCents;
    balanceBySellerStore.set(key, balanceAfterCents);

    const { error: ledgerError } = await db.from("seller_ledger").insert({
      seller_id: item.seller_id,
      store_id: item.store_id,
      entry_type: "sale",
      amount_cents: netCents,
      balance_after_cents: balanceAfterCents,
      order_id: orderId,
      payout_id: null,
      description: `Net proceeds for order item ${item.id}`,
      created_by: null,
    });
    if (ledgerError) throw new LedgerError("LEDGER_INSERT_FAILED", ledgerError.message);
  }
}

/**
 * Create a payout request. Requires sufficient seller balance; balance is only
 * moved when an admin approves/processes the payout.
 */
export async function requestPayout(
  sellerId: string,
  storeId: string,
  amountCents: number,
  period?: PayoutPeriod,
): Promise<{ payoutId: string }> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new LedgerError("INVALID_PAYOUT_AMOUNT", "Payout amount must be a positive integer");
  }

  const db = createServiceClient();
  const balance = await readLastBalance(db, sellerId, storeId);
  if (balance < amountCents) {
    throw new LedgerError(
      "INSUFFICIENT_BALANCE",
      "Seller balance is less than the requested payout",
    );
  }

  const { data, error } = await db
    .from("payouts")
    .insert({
      seller_id: sellerId,
      store_id: storeId,
      amount_cents: amountCents,
      currency: "USD",
      status: "requested",
      period_start: period?.start ?? null,
      period_end: period?.end ?? null,
      requested_by: null,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    throw new LedgerError("PAYOUT_INSERT_FAILED", error?.message ?? "Failed to create payout");
  }
  return { payoutId: data.id };
}
