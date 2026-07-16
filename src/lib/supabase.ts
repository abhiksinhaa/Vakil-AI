const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL is not set')
}

import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
export const supabase = typeof window !== 'undefined' ? createClient() : null as any
