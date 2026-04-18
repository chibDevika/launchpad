import { createBrowserClient } from "@supabase/ssr";

// TODO: replace with supabase gen types output for full type safety
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
