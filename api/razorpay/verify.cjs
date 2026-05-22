const crypto = require('crypto');

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

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({
      error: { message: 'Razorpay secret not configured' },
      success: false,
    });
  }

  try {
    const body = await readJsonBody(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: { message: 'Missing payment fields' },
        success: false,
      });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({
        error: { message: 'Invalid payment signature' },
        success: false,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[razorpay/verify]', err);
    return res.status(500).json({
      error: { message: 'Verification failed' },
      success: false,
    });
  }
};
