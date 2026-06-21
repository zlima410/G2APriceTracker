import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns true when real Supabase credentials are configured. UI can use this
 * to show a "backend not connected" state instead of failing silently.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function createClient() {
  // Fall back to harmless placeholders when env vars are missing so the app
  // renders (data calls will simply fail into empty/error states) instead of
  // throwing during render and crashing the whole page with a 500.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

  return createBrowserClient(url, anonKey);
}
