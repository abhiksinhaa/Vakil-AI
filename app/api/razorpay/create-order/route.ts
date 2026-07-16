import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    
    if (!token) {
      return Response.json({ error: 'No token' }, { status: 401 })
    }

    console.log('SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    
    if (!keyId || !keySecret) {
      return Response.json({ 
        error: `Keys missing: keyId=${!!keyId} secret=${!!keySecret}` 
      }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const plan = String(body.plan || 'starter')
    
    const amounts: Record<string, number> = {
      starter: 14900,
      standard: 19900,
      pro: 29900
    }
    
    const amount = amounts[plan] || 14900
    
    const authStr = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authStr}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `draftee_${plan}_${Date.now()}`
      })
    })
    
    const rzpData = await rzpRes.json()
    
    if (!rzpRes.ok) {
      return Response.json({ 
        error: rzpData?.error?.description || 'Razorpay error',
        details: rzpData
      }, { status: 500 })
    }
    
    return Response.json({
      id: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      plan
    })
    
  } catch (err: any) {
    return Response.json({ 
      error: err?.message || String(err) 
    }, { status: 500 })
  }
}
