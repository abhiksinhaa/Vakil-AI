interface CheckoutOptions {
  plan: 'basic';
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  onSuccess?: () => Promise<void> | void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
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

export async function startCheckout({ plan, userId, userEmail, userName, onSuccess }: CheckoutOptions) {
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  // 1. Create Order
  const orderRes = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, userId }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(orderData?.error || 'Could not create payment order');
  }

  // 2. Load SDK
  const Razorpay = await loadRazorpayScript();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Initialize Razorpay and open checkout
  return new Promise((resolve, reject) => {
    const options = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: 'INR',
      name: 'Draftee',
      description: orderData.discountApplied 
        ? 'Premium Plan - Launch Price ₹99' 
        : 'Premium Plan ₹149',
      order_id: orderData.orderId,
      prefill: {
        email: userEmail || '',
        name: userName || '',
      },
      theme: { color: '#c9a84c' },
      handler: async (response: any) => {
        console.log('=== PAYMENT HANDLER CALLED ===');
        console.log('Response:', response);
        try {
          // 4. Verify payment
          console.log('Calling verify API...');
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
              userId,
              amount: orderData.amount,
            }),
          });
          
          const verifyData = await verifyRes.json();
          console.log('Verify result:', verifyData);
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

    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (res: any) => {
        reject(new Error(res.error?.description || 'Payment failed'));
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay init error:', err);
      reject(new Error('Payment could not be initialized'));
    }
  });
}
