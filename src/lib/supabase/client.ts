import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (anon key).
 * Use this in client components; never import the service role client here.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
