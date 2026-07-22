import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { count } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('plan', 'free')
    .not('plan', 'is', null)

  const paidCount = count ?? 0
  const discountAvailable = paidCount < 100
  const remaining = Math.max(0, 100 - paidCount)

  return NextResponse.json({ 
    discountAvailable, 
    paidCount,
    remaining,
    discountPrice: 99,
    originalPrice: 149,
  })
}
