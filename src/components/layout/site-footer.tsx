import Link from "next/link";
import { Brandmark } from "./brandmark";
import { listCategories, listCollections } from "@/lib/data/catalog";

export async function SiteFooter() {
  const [categories, collections] = await Promise.all([listCategories(), listCollections()]);

  return (
    <footer className="border-t border-line bg-paper">
      <div className="container-site py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Brandmark />
            <p className="mt-4 max-w-xs text-body-sm text-fog">
              Discover, customize, visualize and purchase beautifully designed furniture through immersive 3D experiences.
            </p>
            <p className="mt-6 text-caption text-fog">
              Demonstration build — sample data labeled accordingly.
            </p>
          </div>
          <div className="lg:col-span-2">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-fog">Shop</p>
            <ul className="grid gap-2">
              <li><Link href="/shop" className="text-body-sm text-ink/70 transition-colors hover:text-ink">All products</Link></li>
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link href={`/shop/${category.slug}`} className="text-body-sm text-ink/70 transition-colors hover:text-ink">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-fog">Collections</p>
            <ul className="grid gap-2">
              {collections.slice(0, 5).map((collection) => (
                <li key={collection.id}>
                  <Link href={`/collections/${collection.slug}`} className="text-body-sm text-ink/70 transition-colors hover:text-ink">
                    {collection.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-fog">Experience</p>
            <ul className="grid gap-2">
              <li><Link href="/showroom" className="text-body-sm text-ink/70 transition-colors hover:text-ink">3D Showroom</Link></li>
              <li><Link href="/room-designer" className="text-body-sm text-ink/70 transition-colors hover:text-ink">Room Designer</Link></li>
              <li><Link href="/designers" className="text-body-sm text-ink/70 transition-colors hover:text-ink">Designers</Link></li>
              <li><Link href="/brands" className="text-body-sm text-ink/70 transition-colors hover:text-ink">Brands</Link></li>
            </ul>
          </div>
          <div className="lg:col-span-2">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-fog">Support</p>
            <ul className="grid gap-2">
              <li><Link href="/about" className="text-body-sm text-ink/70 transition-colors hover:text-ink">About us</Link></li>
              <li><Link href="/contact" className="text-body-sm text-ink/70 transition-colors hover:text-ink">Contact</Link></li>
              <li><Link href="/faq" className="text-body-sm text-ink/70 transition-colors hover:text-ink">FAQ</Link></li>
              <li><Link href="/shipping-policy" className="text-body-sm text-ink/70 transition-colors hover:text-ink">Shipping</Link></li>
              <li><Link href="/returns-policy" className="text-body-sm text-ink/70 transition-colors hover:text-ink">Returns</Link></li>
              <li><Link href="/privacy" className="text-body-sm text-ink/70 transition-colors hover:text-ink">Privacy</Link></li>
              <li><Link href="/terms" className="text-body-sm text-ink/70 transition-colors hover:text-ink">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-caption text-fog">© {new Date().getFullYear()} ATELIER 3D. All rights reserved.</p>
          <p className="text-caption text-fog">Crafted as a demonstration of the future of online shopping.</p>
        </div>
      </div>
    </footer>
  );
}
