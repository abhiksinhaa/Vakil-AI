import { PRO_PRICE_PAISE } from './userAccount';

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

export async function startProCheckout({ userEmail, userName, onSuccess }) {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!keyId || keyId.includes('your_')) {
    throw new Error(
      'Razorpay is not configured. Add VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.'
    );
  }

  const orderRes = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: PRO_PRICE_PAISE, currency: 'INR' }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(orderData?.error?.message || 'Could not create payment order');
  }

  const Razorpay = await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Draftee',
      description: 'Pro Plan — Unlimited drafts & chat (1 month)',
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
            headers: { 'Content-Type': 'application/json' },
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
