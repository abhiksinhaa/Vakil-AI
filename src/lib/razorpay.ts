import { supabase } from './supabase';

interface CheckoutOptions {
  plan?: 'basic' | 'standard' | 'pro';
  userEmail?: string | null;
  userName?: string | null;
  onSuccess?: () => Promise<void> | void;
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  if (!token) {
    throw new Error('Please sign in to continue.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
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

export async function startPlanCheckout({ plan = 'pro', userEmail, userName, onSuccess }: CheckoutOptions) {
  // ENV CHECK (presence only, small prefix)
  console.log('ENV CHECK:', {
    hasPublicKey: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    keyPrefix: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.substring(0, 10),
  });

  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  if (!razorpayKey) {
    console.error('Razorpay key missing');
    throw new Error('Payment not configured');
  }

  const orderRes = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ plan }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(orderData?.error?.message || 'Could not create payment order');
  }

  const Razorpay: any = await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Draftee',
      description: `${orderData.planName || 'Premium'} Plan — ${orderData.plan === 'basic' ? '30 drafts' : orderData.plan === 'standard' ? '40 drafts' : '100 drafts'} (1 month)`,
      order_id: orderData.id,
      prefill: {
        email: userEmail || '',
        name: userName || '',
      },
      theme: { color: '#c9a84c' },
      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData?.error?.message || 'Payment verification failed');
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
    rzp.on('payment.failed', (res) => {
      reject(new Error(res.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}

export async function startProCheckout(options: CheckoutOptions) {
  return startPlanCheckout({ ...options, plan: options.plan || 'pro' });
}

export async function startPayPerUseCheckout({ userEmail, userName, onSuccess }: CheckoutOptions) {
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  if (!razorpayKey) {
    console.error('Razorpay key missing');
    throw new Error('Payment not configured');
  }

  const orderRes = await fetch('/api/razorpay/create-order-draft', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({}),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(orderData?.error?.message || 'Could not create payment order');
  }

  const Razorpay: any = await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Draftee',
      description: 'Pay Per Use — Generate 1 Draft',
      order_id: orderData.id,
      prefill: {
        email: userEmail || '',
        name: userName || '',
      },
      theme: { color: '#c9a84c' },
      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/razorpay/verify-draft', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData?.error?.message || 'Payment verification failed');
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
    rzp.on('payment.failed', (res) => {
      reject(new Error(res.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}

export async function startSubscriptionCheckout({ plan = 'pro', userEmail, userName, onSuccess }: CheckoutOptions) {
  console.log('startSubscriptionCheckout: begin', { plan });
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  console.log('startSubscriptionCheckout: has public key?', !!razorpayKey);
  if (!razorpayKey) {
    console.error('Razorpay key missing');
    throw new Error('Payment not configured');
  }

  // create subscription on server
  const subRes = await fetch('/api/razorpay/create-subscription', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ plan }),
  });
  const subData = await subRes.json();
  console.log('startSubscriptionCheckout: create-subscription response', { ok: subRes.ok, body: subData });
  if (!subRes.ok) {
    throw new Error(subData?.error?.message || 'Could not create subscription');
  }

  const subscriptionId = subData.subscription_id;
  if (!subscriptionId) {
    throw new Error('Subscription id missing from server');
  }

  const Razorpay: any = await loadRazorpayScript();
  console.log('startSubscriptionCheckout: Razorpay SDK loaded', { hasRazorpay: !!Razorpay });

  return new Promise((resolve, reject) => {
    const options = {
      key: razorpayKey,
      subscription_id: subscriptionId,
      name: 'Draftee',
      description: `${plan} subscription`,
      prefill: { email: userEmail || '', name: userName || '' },
      theme: { color: '#c9a84c' },
      handler: async (response: any) => {
        try {
          console.log('startSubscriptionCheckout: handler response', response);
          // verify payment on server (reuse verify endpoint)
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData?.error?.message || 'Payment verification failed');
          }
          await onSuccess?.();
          resolve(response);
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', (res: any) => {
      reject(new Error(res.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}
