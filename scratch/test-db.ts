import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbmojmpekooflbbyuroz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_02rNAgsG7O92u6K05xhgWQ_vuyaApv8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking RLS policies...");
  // Using anon key, we cannot query pg_policies directly.
  // But wait! We can just try to insert a dummy row to see the exact error.
  
  // Try to insert a dummy subscription for a fake UUID
  const { data, error } = await supabase.from('subscriptions').insert([
    {
      id: '00000000-0000-0000-0000-000000000000',
      plan: 'free',
      drafts_used: 0,
      chat_day_key: '2026-07-10',
      chat_count: 0,
      drafts_count: 0,
      last_reset: new Date().toISOString()
    }
  ]);
  
  console.log("Insert response:", { data, error });
  
  // Let's try to query information_schema if possible (usually denied)
  const schemaReq = await supabase.from('subscriptions').select('*').limit(1);
  console.log("Select response:", schemaReq.error ? schemaReq.error : "Success");
}

check();
