// Public browser credentials from Supabase: Project Settings > API Keys.
// Never place the secret/service_role key in this frontend file.
export const SUPABASE_URL = 'https://kvleebjfmnbapdfvpgtk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_lkp5AUs4InTgC8PREudUAg_euE_DsPO';

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_') &&
  SUPABASE_ANON_KEY.length > 30;
