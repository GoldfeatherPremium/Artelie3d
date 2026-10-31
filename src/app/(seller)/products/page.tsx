import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SellerContext {
  sellerProfileId: string;
  storeId: string | null;
}

async function resolveSeller(
  db: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<SellerContext | null> {
  const { data: sellerRow } = await db
    .from("seller_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const seller = sellerRow as { id: string } | null;
  if (!seller) return null;

  const { data: storeRow } = await db
    .from("stores")
    .select("id")
    .eq("seller_profile_id", seller.id)
    .maybeSingle();
  const store = storeRow as { id: string } | null;

  return { sellerProfileId: seller.id, storeId: store?.id ?? null };
}

interface SellerProductRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  base_price_cents: number;
  sale_price_cents: number | null;
  currency: string;
  inventory_quantity: number;
  low_stock_threshold: number;
  status: string;
  created_at: string;
  product_images:
    | { url: string; alt_text: string | null; position: number }[]
    | { url: string; alt_text: string | null; position: number }
    | null;
  categories: { name: string } | { name: string }[] | null;
}

function productStatusVariant(status: string): "neutral" | "warning" | "success" | "danger" | "info" {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
    case "suspended":
      return "danger";
    case "pending_review":
      return "warning";
    case "draft":
      return "neutral";
    default:
      return "info";
  }
}

function firstImage(product: SellerProductRow): string | null {
  const images = Array.isArray(product.product_images)
    ? product.product_images
    : product.product_images
      ? [product.product_images]
      : [];
  return [...images].sort((a, b) => a.position - b.position)[0]?.url ?? null;
}

export const dynamic = "force-dynamic";

export default async function SellerProductsPage() {
  await requireRole(["seller"]);
  const user = await getUser();
  const db = createServiceClient();
  const seller = user ? await resolveSeller(db, user.id) : null;

  let products: SellerProductRow[] = [];
  if (seller?.storeId) {
    const { data } = await db
      .from("products")
      .select(
        "id, name, slug, type, base_price_cents, sale_price_cents, currency, inventory_quantity, low_stock_threshold, status, created_at, " +
          "product_images(url, alt_text, position), categories(name)",
      )
      .eq("store_id", seller.storeId)
      .order("created_at", { ascending: false })
      .limit(200);
    products = (data ?? []) as unknown as SellerProductRow[];
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-ink">Products</h1>
          <p className="text-body-sm text-fog">Everything your store sells.</p>
        </div>
        <Link href="/seller/products/new">
          <Button>New product</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My products</CardTitle>
          <CardDescription>{products.length} product(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="Create your first product draft to get started."
              action={
                <Link href="/seller/products/new">
                  <Button>New product</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base price</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const image = firstImage(product);
                  const lowStock = product.inventory_quantity <= product.low_stock_threshold;
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link href={`/seller/products/${product.id}`} className="flex items-center gap-3">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span className="h-12 w-12 shrink-0 rounded-lg bg-stone/50" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink hover:underline">{product.name}</span>
                            <span className="block text-caption text-fog">/{product.slug}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{product.type.replaceAll("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-ink">
                          {formatCurrency(product.base_price_cents / 100, product.currency)}
                        </span>
                        {product.sale_price_cents != null ? (
                          <span className="ml-2 text-caption text-fog line-through">
                            {formatCurrency(product.sale_price_cents / 100, product.currency)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={lowStock ? "font-medium text-danger" : "text-ink"}>
                            {product.inventory_quantity}
                          </span>
                          {lowStock ? <Badge variant="warning">Low stock</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={productStatusVariant(product.status)}>
                          {product.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-fog">
                        {format(new Date(product.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
