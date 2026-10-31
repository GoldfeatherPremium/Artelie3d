import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfigActions } from "@/components/account/config-actions";

export default async function ConfigurationsPage() {
  const user = await requireUser();
  const db = createServiceClient();

  const { data } = await db
    .from("product_configurations")
    .select("id, name, options, option_summary, unit_price_cents, share_token, products(id, name, slug, product_images(url, position))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const configs = (data ?? []) as unknown as {
    id: string;
    name: string;
    options: Record<string, string>;
    option_summary: string | null;
    unit_price_cents: number;
    share_token: string | null;
    products: {
      id: string;
      name: string;
      slug: string;
      product_images: { url: string; position: number }[];
    } | null;
  }[];

  return (
    <div>
      <h2 className="font-display text-title-lg text-ink">Saved configurations</h2>

      {configs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No saved configurations"
            description="Open any configurable product, customize it and save it here."
            action={<Link href="/shop" className="text-body-sm font-medium text-bronze hover:text-ink">Browse products →</Link>}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {configs.map((config) => {
            const image = [...(config.products?.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
            return (
              <li key={config.id} className="rounded-2xl border border-line bg-paper p-5">
                <div className="flex items-start gap-4">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <span className="h-16 w-16 rounded-lg bg-stone/50" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-ink">{config.name}</h3>
                        <p className="text-caption text-fog">
                          {config.products?.name ?? "Product"} · {`$${(config.unit_price_cents / 100).toFixed(2)}`}
                        </p>
                      </div>
                      {config.share_token ? <Badge variant="bronze">Shared</Badge> : null}
                    </div>
                    {config.option_summary ? (
                      <p className="mt-2 line-clamp-2 text-caption text-fog">{config.option_summary.replaceAll(" | ", " · ")}</p>
                    ) : null}
                    <ConfigActions
                      configId={config.id}
                      productId={config.products?.id ?? ""}
                      options={config.options}
                      shareToken={config.share_token}
                      initialName={config.name}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
