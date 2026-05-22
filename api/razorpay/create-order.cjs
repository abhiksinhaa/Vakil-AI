function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({
      error: { message: 'Razorpay keys not configured on server.' },
    });
  }

  try {
    const body = await readJsonBody(req);
    const amount = Number(body.amount) || 29900;
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
      return res.status(upstream.status).json({
        error: { message: data.error?.description || 'Order creation failed' },
      });
    }

    return res.status(200).json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
    });
  } catch (err) {
    console.error('[razorpay/create-order]', err);
    return res.status(500).json({ error: { message: 'Order creation failed' } });
  }
};
