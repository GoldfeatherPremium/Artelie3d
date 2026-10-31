import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "customer" | "seller" | "admin";

const ROLE_LEVEL: Record<UserRole, number> = {
  customer: 0,
  seller: 1,
  admin: 2,
};

const PROTECTED_ROUTES: ReadonlyArray<{ prefix: string; minLevel: number }> = [
  { prefix: "/account", minLevel: 0 }, // any authenticated user
  { prefix: "/seller", minLevel: 1 }, // seller | admin
  { prefix: "/admin", minLevel: 2 }, // admin
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: refresh the session on every request (do not remove).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // API routes pass through; sensitive authorization is enforced in route handlers.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  const matched = PROTECTED_ROUTES.find(({ prefix }) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });

  if (!matched) {
    return supabaseResponse;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/auth/login";
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);

  if (!user) {
    return NextResponse.redirect(loginUrl);
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as { role?: UserRole } | null;
  const role = profile?.role ?? "customer";
  const level = ROLE_LEVEL[role] ?? 0;

  if (level < matched.minLevel) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2)).*)",
  ],
};
