import { createServiceClient } from "@/lib/supabase/admin";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { ShowroomClient, type ShowroomProduct } from "@/components/showroom/showroom-client";

export const metadata = {
  title: "3D Showroom",
  description: "Explore featured ATELIER 3D pieces in live 3D.",
};

export const dynamic = "force-dynamic";

export default async function ShowroomPage() {
  const db = createServiceClient();
  const { data: rows } = await db
    .from("products")
    .select(
      "id, name, slug, model_config, product_images(url, position)",
    )
    .eq("status", "approved")
    .not("model_config", "is", null)
    .order("created_at", { ascending: false })
    .limit(6);

  const products: ShowroomProduct[] = ((rows ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    model_config: unknown;
    product_images: { url: string; position: number }[];
  }[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    modelConfig: (row.model_config as Record<string, unknown> | null) ?? null,
    imageUrl:
      [...(row.product_images ?? [])]
        .sort((a, b) => a.position - b.position)[0]?.url ?? null,
  }));

  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="3D Showroom"
          title="Tour the collection in 3D"
          description="Rotate, zoom and inspect featured pieces up close before you customize them."
        />

        <Reveal className="mt-10">
          <ShowroomClient products={products} />
        </Reveal>
      </div>
    </div>
  );
}
