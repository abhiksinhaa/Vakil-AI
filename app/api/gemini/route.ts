export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s execution on Vercel

import { createClient } from '@supabase/supabase-js';

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

/** gemini-1.5-flash was removed from the Generative Language API (404). */
function resolveModel(requested?: string) {
  if (!requested || requested === 'gemini-1.5-flash' || requested === 'gemini-2.0-flash') return DEFAULT_MODEL;
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

  let body: any;
  let userId: string = 'unknown';

  try {
    body = await req.json();
    userId = body.userId || 'unknown';
    console.log('[api/gemini] Request body received, model:', body.model);
    
    const requestedModel = body.model || process.env.GEMINI_MODEL;
    const model = resolveModel(requestedModel);
    console.log('[api/gemini] Using model:', model);

    if (userId !== 'unknown') {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('plan, drafts_limit, drafts_used')
        .eq('id', userId)
        .single();
        
      if (profile?.plan === 'free') {
        const used = profile.drafts_used ?? 0;
        const limit = profile.drafts_limit ?? 30;
        
        if (used >= limit) {
          return Response.json(
            { error: 'Draft limit reached. Please upgrade.' },
            { status: 403 }
          );
        }
      }
    }
    
    delete body.model; // Don't send this to Gemini API
    delete body.userId; // Don't send this to Gemini API
    
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
    
    const outputTokens = data?.usageMetadata?.candidatesTokenCount || 0;
    
    console.log(JSON.stringify({
      event: 'GEMINI_API_CALL',
      timestamp: new Date().toISOString(),
      user_id: userId,
      status: upstream.status === 200 ? 'success' : 'failure',
      output_tokens: upstream.status === 200 ? outputTokens : 0,
      model_used: model,
      http_status: upstream.status
    }));

    if (upstream.status !== 200) {
      console.error('[api/gemini] Gemini API error response:', data);
    } else if (userId !== 'unknown') {
      // Drafts table is the source of truth now, no manual increment needed here.
      // The client will call saveDraft which inserts a row into the drafts table.
    }
    
    return Response.json(data, { status: upstream.status });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'GEMINI_API_CALL',
      timestamp: new Date().toISOString(),
      user_id: userId,
      status: 'failure',
      output_tokens: 0,
      error_message: (err as any)?.message || 'Unknown error'
    }));

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
