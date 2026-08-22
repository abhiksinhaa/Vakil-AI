const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
  const { data, error } = await supabaseAdmin.rpc('run_sql', {
    sql: "SELECT * FROM pg_policies WHERE tablename = 'profiles';"
  });
  
  if (error) {
    console.log('RPC failed (maybe run_sql not defined), trying to use REST API against a view or just reporting error:', error.message);
  } else {
    console.log('Policies:', data);
  }
}

checkRLS();
