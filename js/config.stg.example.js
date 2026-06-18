// Public browser credentials from the Supabase stg project:
// Project Settings > API Keys.
// Never place the secret/service_role key in this frontend file.
export const SUPABASE_URL = 'https://dlucnxhpqulhirhqtabw.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_ZcwYk0dMbPGp5JweBrhtfw_zn1v8zmN';

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_') &&
  !SUPABASE_URL.includes('YOUR-') &&
  SUPABASE_ANON_KEY.length > 30;
