const DEFAULT_MODEL = 'gemini-2.5-flash';

/** gemini-1.5-flash was removed from the Generative Language API (404). */
function resolveModel(requested) {
  if (!requested || requested === 'gemini-1.5-flash') {
    return DEFAULT_MODEL;
  }
  return requested;
}

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return Promise.resolve(req.body);
    }
    if (typeof req.body === 'string') {
      return Promise.resolve(req.body ? JSON.parse(req.body) : {});
    }
    if (Buffer.isBuffer(req.body)) {
      return Promise.resolve(JSON.parse(req.body.toString('utf8')));
    }
  }

  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  console.log('[api/gemini] request', req.method, new Date().toISOString());

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!apiKey || String(apiKey).includes('your_gemini_api_key')) {
    console.error('[api/gemini] missing API key');
    return res.status(500).json({
      error: {
        message:
          'Gemini API key not configured. Add GEMINI_API_KEY in Vercel Project Settings → Environment Variables.',
      },
    });
  }

  const model = resolveModel(process.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const body = await readJsonBody(req);
    console.log('[api/gemini] calling model', model);

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    console.log('[api/gemini] upstream status', upstream.status);

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[api/gemini] error:', err);
    return res.status(500).json({
      error: { message: 'Draft generation failed. Please try again.' },
    });
  }
};
