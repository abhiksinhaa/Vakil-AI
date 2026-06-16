export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Response.json(
      { error: { message: 'Razorpay keys not configured on server.' } },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount) || 139900;
    const currency = body.currency || 'INR';
    const receipt = `draftee_pro_${Date.now()}`;

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const upstream = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, currency, receipt }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error('[razorpay/create-order]', data);
      return Response.json(
        { error: { message: data.error?.description || 'Order creation failed' } },
        { status: upstream.status }
      );
    }

    return Response.json({ id: data.id, amount: data.amount, currency: data.currency });
  } catch (err) {
    console.error('[razorpay/create-order]', err);
    return Response.json({ error: { message: 'Order creation failed' } }, { status: 500 });
  }
}
