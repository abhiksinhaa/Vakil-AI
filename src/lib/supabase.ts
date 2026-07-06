import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const defaultUrl = 'https://bbmojmpekooflbbyuroz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'sb_publishable_02rNAgsG7O92u6K05xhgWQ_vuyaApv8';

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const supabaseUrl = isValidHttpUrl(rawUrl) ? rawUrl : (isValidHttpUrl(defaultUrl) ? defaultUrl : rawUrl);
if (!isValidHttpUrl(supabaseUrl)) {
  console.warn('Supabase URL appears invalid:', rawUrl);
} else {
  console.log('Supabase URL:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
