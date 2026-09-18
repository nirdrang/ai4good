import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredVite(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = import.meta.env[name];
  if (value === undefined) {
    throw new Error(`${name} is missing`);
  }
  return value;
}

export function supabaseUrl(): string {
  return requiredVite("VITE_SUPABASE_URL");
}

export function supabasePublishableKey(): string {
  return requiredVite("VITE_SUPABASE_PUBLISHABLE_KEY");
}

let browserClient: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (browserClient) return browserClient;
  browserClient = createClient(supabaseUrl(), supabasePublishableKey());
  return browserClient;
}
