export const SUPABASE_URL = "YOUR_SUPABASE_URL";
export const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_") &&
  SUPABASE_ANON_KEY.length > 30;

