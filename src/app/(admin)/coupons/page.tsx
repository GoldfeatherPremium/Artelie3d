import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Checkbox, Textarea, Field } from "@/components/ui/input";
import { saveCoupon } from "@/app/actions/admin";

interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_cents: number | null;
  max_discount_cents: number | null;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
}

const COUPON_SELECT =
  "id, code, description, discount_type, discount_value, min_order_cents, max_discount_cents, usage_limit, used_count, per_user_limit, starts_at, ends_at, active, created_at";

function discountLabel(coupon: CouponRow): string {
  const value = Number(coupon.discount_value);
  if (coupon.discount_type === "fixed") return `${formatCurrency(value / 100)} off`;
  return `${value}% off`;
}

function dateWindowLabel(coupon: CouponRow): string {
  const start = coupon.starts_at ? format(new Date(coupon.starts_at), "MMM d, yyyy") : null;
  const end = coupon.ends_at ? format(new Date(coupon.ends_at), "MMM d, yyyy") : null;
  if (start && end) return `${start} → ${end}`;
  return start ?? end ?? "No window";
}

function dateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const db = createServiceClient();

  const { data: rows } = await db
    .from("coupons")
    .select(COUPON_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  const coupons = (rows ?? []) as unknown as CouponRow[];

  const editing = sp.edit ? coupons.find((c) => c.id === sp.edit) ?? null : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-display-md text-ink">Coupons</h1>
          <p className="text-body-sm text-fog">Discount codes and their usage across orders.</p>
        </div>
        {editing ? (
          <Link
            href="/admin/coupons"
            className="inline-flex h-9 items-center rounded-full border border-charcoal/20 px-3 text-body-sm font-medium text-ink transition-colors hover:border-charcoal/50 hover:bg-charcoal/5"
          >
            + New coupon
          </Link>
        ) : null}
      </div>

      {sp.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-body-sm text-danger" role="alert">
          {sp.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Coupons</CardTitle>
          <CardDescription>{coupons.length} coupon(s) on file</CardDescription>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <EmptyState title="No coupons yet" description="Create your first discount code below." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="font-medium text-ink">{coupon.code}</div>
                      {coupon.description ? (
                        <div className="text-caption text-fog">{coupon.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{discountLabel(coupon)}</TableCell>
                    <TableCell>
                      <div>
                        {coupon.used_count} / {coupon.usage_limit ?? "∞"}
                      </div>
                      <div className="text-caption text-fog">{coupon.per_user_limit} per user</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.active ? "success" : "neutral"}>
                        {coupon.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-fog">{dateWindowLabel(coupon)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link
                          href={`/admin/coupons?edit=${coupon.id}`}
                          className="inline-flex h-9 items-center rounded-full border border-charcoal/20 px-3 text-body-sm font-medium text-ink transition-colors hover:border-charcoal/50 hover:bg-charcoal/5"
                        >
                          Edit
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Edit coupon · ${editing.code}` : "Create coupon"}</CardTitle>
          <CardDescription>
            {editing ? "Update the coupon details below." : "Add a new discount code."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveCoupon} className="grid gap-4 sm:grid-cols-2">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <Field label="Code" htmlFor="cp-code" className="sm:col-span-2">
              <Input
                id="cp-code"
                name="code"
                required
                maxLength={50}
                defaultValue={editing?.code ?? ""}
                placeholder="e.g. SUMMER25"
              />
            </Field>
            <Field label="Description" htmlFor="cp-description" className="sm:col-span-2">
              <Textarea
                id="cp-description"
                name="description"
                rows={2}
                defaultValue={editing?.description ?? ""}
                placeholder="Optional internal note"
              />
            </Field>
            <Field label="Discount type" htmlFor="cp-type">
              <Select id="cp-type" name="discount_type" defaultValue={editing?.discount_type ?? "percent"}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount ($)</option>
              </Select>
            </Field>
            <Field label="Discount value" htmlFor="cp-value">
              <Input
                id="cp-value"
                type="number"
                name="discount_value"
                min="0"
                step="0.01"
                required
                defaultValue={editing?.discount_value ?? ""}
                placeholder="10"
              />
            </Field>
            <Field label="Min order (cents)" htmlFor="cp-min">
              <Input
                id="cp-min"
                type="number"
                name="min_order_cents"
                min="0"
                step="1"
                defaultValue={editing?.min_order_cents ?? ""}
                placeholder="e.g. 5000"
              />
            </Field>
            <Field label="Max discount (cents)" htmlFor="cp-max">
              <Input
                id="cp-max"
                type="number"
                name="max_discount_cents"
                min="0"
                step="1"
                defaultValue={editing?.max_discount_cents ?? ""}
                placeholder="e.g. 2500"
              />
            </Field>
            <Field label="Usage limit" htmlFor="cp-usage">
              <Input
                id="cp-usage"
                type="number"
                name="usage_limit"
                min="0"
                step="1"
                defaultValue={editing?.usage_limit ?? ""}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Per-user limit" htmlFor="cp-peruser">
              <Input
                id="cp-peruser"
                type="number"
                name="per_user_limit"
                min="0"
                step="1"
                defaultValue={editing?.per_user_limit ?? 1}
              />
            </Field>
            <Field label="Starts at" htmlFor="cp-start">
              <Input id="cp-start" type="datetime-local" name="starts_at" defaultValue={dateInputValue(editing?.starts_at ?? null)} />
            </Field>
            <Field label="Ends at" htmlFor="cp-end">
              <Input id="cp-end" type="datetime-local" name="ends_at" defaultValue={dateInputValue(editing?.ends_at ?? null)} />
            </Field>
            <label className="flex items-center gap-2.5 sm:col-span-2">
              <Checkbox name="active" defaultChecked={editing ? editing.active : true} />
              <span className="text-body-sm text-ink">Active (redeemable now)</span>
            </label>
            <div className="sm:col-span-2">
              <Button type="submit">{editing ? "Update coupon" : "Create coupon"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
