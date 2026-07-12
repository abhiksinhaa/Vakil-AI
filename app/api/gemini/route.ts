export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s execution on Vercel

const DEFAULT_MODEL = 'gemini-2.5-flash';

/** gemini-1.5-flash was removed from the Generative Language API (404). */
function resolveModel(requested?: string) {
  if (!requested || requested === 'gemini-1.5-flash') return DEFAULT_MODEL;
  return requested;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('[api/gemini] POST request received');
  console.log('[api/gemini] GEMINI_API_KEY env var exists:', !!apiKey);
  console.log('[api/gemini] GEMINI_API_KEY value length:', apiKey?.length);

  if (!apiKey || String(apiKey).includes('your_gemini_api_key')) {
    console.error('[api/gemini] API key not configured');
    return Response.json(
      {
        error: {
          message:
            'Gemini API key not configured. Add GEMINI_API_KEY in your environment variables.',
        },
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    console.log('[api/gemini] Request body received, model:', body.model);
    
    const requestedModel = body.model || process.env.GEMINI_MODEL;
    const model = resolveModel(requestedModel);
    console.log('[api/gemini] Using model:', model);
    
    delete body.model; // Don't send this to Gemini API
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    console.log('[api/gemini] Making request to Gemini API...');
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    console.log('[api/gemini] Gemini API response status:', upstream.status);
    const data = await upstream.json();
    
    if (upstream.status !== 200) {
      console.error('[api/gemini] Gemini API error response:', data);
    }
    
    return Response.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[api/gemini] Caught error:', err);
    console.error('[api/gemini] Error details:', {
      name: (err as any)?.name,
      message: (err as any)?.message,
      cause: (err as any)?.cause,
    });
    return Response.json(
      { error: { message: 'Please try again' } },
      { status: 500 }
    );
  }
}
