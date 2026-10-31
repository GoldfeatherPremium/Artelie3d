"use server";

import { getUser } from "@/lib/supabase/server";
import { requestCancellation, refundOrder } from "@/lib/commerce/orders";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function requestCancellationAction(orderId: string): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "Please sign in." };
    await requestCancellation(orderId, user.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not request cancellation." };
  }
}

export async function requestRefundAction(input: { orderId: string; amountCents: number; reason: string }): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "Please sign in." };
    await refundOrder(input.orderId, input.amountCents, input.reason, user.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not request a refund." };
  }
}
