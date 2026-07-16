import { supabase } from './supabase';

interface CheckoutOptions {
  plan: 'starter' | 'standard' | 'pro';
  userEmail?: string | null;
  userName?: string | null;
  onSuccess?: () => Promise<void> | void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

async function getAuthHeaders() {
  const { data, error } = await supabase.auth.getSession();
  let token = data.session?.access_token ?? null;

  if (!token) {
    const refreshResult = await supabase.auth.refreshSession();
    token = refreshResult.data.session?.access_token ?? null;
  }

  if (!token) {
    throw new Error('Please sign in to continue.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function loadRazorpayScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
    document.body.appendChild(script);
  });
}

export async function startCheckout({ plan, userEmail, userName, onSuccess }: CheckoutOptions) {
  const razorpayKey = 'rzp_live_TDQGNB6HCxWwNq';

  // 1. Create Order
  const orderRes = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ plan }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(orderData?.error || 'Could not create payment order');
  }

  // 2. Load SDK
  const Razorpay = await loadRazorpayScript();

  // 3. Initialize Razorpay and open checkout
  return new Promise((resolve, reject) => {
    const options = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Draftee',
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (one-time)`,
      order_id: orderData.id,
      prefill: {
        email: userEmail || '',
        name: userName || '',
      },
      theme: { color: '#c9a84c' },
      handler: async (response: any) => {
        try {
          // 4. Verify payment
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            }),
          });
          
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData?.error || 'Payment verification failed');
          }
          
          await onSuccess?.();
          resolve(response);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', (res: any) => {
      reject(new Error(res.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}
