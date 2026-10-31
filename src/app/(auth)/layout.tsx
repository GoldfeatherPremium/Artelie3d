import Link from "next/link";
import { Brandmark } from "@/components/layout/brandmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <div className="container-site flex h-20 items-center">
        <Brandmark />
      </div>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="container-site pb-8 text-center">
        <Link href="/" className="text-caption text-fog transition-colors hover:text-ink">
          ← Back to site
        </Link>
      </footer>
    </div>
  );
}
