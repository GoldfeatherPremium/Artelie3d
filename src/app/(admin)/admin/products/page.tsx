import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton, type ActionResult } from "@/components/admin/admin-shell";
import { reviewProduct } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: string;
  featured: boolean;
  base_price_cents: number;
  sale_price_cents: number | null;
  currency: string;
  inventory_quantity: number;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
  stores: { name: string } | { name: string }[] | null;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function productStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "rejected" || status === "archived" || status === "inactive") return "danger";
  return "warning";
}

function sellerLabel(product: ProductRow): string {
  const profile = firstRow(product.profile);
  return profile?.full_name || profile?.email || "Unknown seller";
}

function productPrice(product: ProductRow): React.ReactNode {
  if (product.sale_price_cents != null && product.sale_price_cents < product.base_price_cents) {
    return (
      <span>
        <span className="mr-1.5 text-caption text-fog line-through">
          {formatCurrency(product.base_price_cents / 100)}
        </span>
        <span className="font-medium text-ink">{formatCurrency(product.sale_price_cents / 100)}</span>
      </span>
    );
  }
  return formatCurrency(product.base_price_cents / 100);
}

export default async function AdminProductsPage() {
  await requireRole(["admin"]);
  const db = createServiceClient();

  const [{ data: pendingRows }, { data: allRows }] = await Promise.all([
    db
      .from("products")
      .select(
        "id, name, slug, sku, status, featured, base_price_cents, sale_price_cents, currency, inventory_quantity, created_at, profiles(full_name, email), stores(name)",
      )
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("products")
      .select(
        "id, name, slug, sku, status, featured, base_price_cents, sale_price_cents, currency, inventory_quantity, created_at, profiles(full_name, email), stores(name)",
      )
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const pending = ((pendingRows ?? []) as unknown) as ProductRow[];
  const all = ((allRows ?? []) as unknown) as ProductRow[];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Products</h1>
        <p className="text-body-sm text-fog">Moderation queue and full product catalog.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moderation queue</CardTitle>
          <CardDescription>{pending.length} product(s) awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState title="Queue is clear" description="No products are pending review right now." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium text-ink">{product.name}</div>
                      <div className="text-caption text-fog">{firstRow(product.stores)?.name ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-fog">{sellerLabel(product)}</TableCell>
                    <TableCell>{productPrice(product)}</TableCell>
                    <TableCell className="text-fog">
                      {format(new Date(product.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <ConfirmButton
                          title="Approve product"
                          description={`“${product.name}” will be published to the storefront.`}
                          confirmLabel="Approve"
                          variant="primary"
                          action={reviewProduct.bind(null, product.id, "approved") as () => Promise<ActionResult>}
                        >
                          Approve
                        </ConfirmButton>
                        <ConfirmButton
                          title="Reject product"
                          description={`“${product.name}” will be hidden and the seller notified.`}
                          confirmLabel="Reject"
                          variant="danger"
                          notePlaceholder="Reason (sent to the seller)"
                          requireNote
                          action={reviewProduct.bind(null, product.id, "rejected") as () => Promise<ActionResult>}
                        >
                          Reject
                        </ConfirmButton>
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
          <CardTitle>All products</CardTitle>
          <CardDescription>{all.length} product(s) total</CardDescription>
        </CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <EmptyState title="No products" description="No products exist yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium text-ink">{product.name}</div>
                      <div className="text-caption text-fog">
                        {firstRow(product.stores)?.name ?? "—"} · {product.sku ?? "no SKU"}
                      </div>
                    </TableCell>
                    <TableCell className="text-fog">{sellerLabel(product)}</TableCell>
                    <TableCell>{productPrice(product)}</TableCell>
                    <TableCell>
                      <Badge variant={productStatusVariant(product.status)}>
                        {product.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.featured ? (
                        <Badge variant="success">Featured</Badge>
                      ) : (
                        <Badge variant="neutral">Not featured</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-fog">
                      {format(new Date(product.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
