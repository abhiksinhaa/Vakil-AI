import 'server-only';

export async function fetchRazorpayOrder(orderId: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys not configured');
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const upstream = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    throw new Error(data?.error?.description || 'Unable to fetch Razorpay order');
  }

  return data as {
    id: string;
    amount: number;
    currency: string;
    receipt?: string;
    status?: string;
    notes?: { plan?: string; userId?: string; billingCycle?: string };
  };
}

export function getRazorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}
