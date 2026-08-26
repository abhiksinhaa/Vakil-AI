import { createClient } from '@supabase/supabase-js';

async function migrate() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Starting migration...');
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ drafts_limit: 90 })
    .eq('plan', 'basic')
    .eq('drafts_limit', 999999)
    .select();

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log(`Migration successful. Updated ${data?.length || 0} rows.`);
  }
}

migrate();
