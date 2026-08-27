export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

import { createClient } from '@supabase/supabase-js';

const DEFAULT_MODEL = 'gemini-1.5-flash-latest';

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || String(apiKey).includes('your_gemini_api_key')) {
    return Response.json(
      { error: { message: 'Gemini API key not configured.' } },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { draftId, actionType, userMessage, userId } = body;

    if (!draftId || !actionType || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch the document record from drafts
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('drafts')
      .select('amount, situation, party1_name')
      .eq('id', draftId)
      .eq('user_id', userId)
      .single();

    if (draftError || !draft || !draft.amount) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // 2. Fetch the actual file from Supabase Storage
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('documents')
      .download(draft.amount);

    if (fileError || !fileData) {
      return Response.json({ error: 'Failed to download document from storage' }, { status: 500 });
    }

    // 3. Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = draft.situation || 'application/pdf';

    // 4. Construct System Prompt based on Action Type
    let systemInstruction = '';
    
    switch (actionType) {
      case 'summary':
        systemInstruction = 'You are an expert legal assistant. Provide a highly concise, easy-to-read summary of the provided legal document. Use bullet points for key takeaways. Include a disclaimer at the end that this is an AI summary and not legal advice.';
        break;
      case 'analyze':
        systemInstruction = 'You are an expert legal assistant. Analyze the provided legal document. Extract and list: Document Type, Parties involved, Key Obligations, Important Clauses, and Important Dates. Format your response cleanly in Markdown without using any emojis.';
        break;
      case 'risks':
        systemInstruction = 'You are an expert legal assistant. Identify any potential risks, unusual clauses, or unfavorable terms in the provided legal document. For each issue, provide a brief title, an explanation of the risk, and reference the relevant section if possible. Use professional, cautious language. Remind the user that this is not definitive legal advice.';
        break;
      case 'extract':
        systemInstruction = 'You are an expert legal assistant. Extract all structured key information from the document. Provide it as a clean list of categories (e.g., Parties, Dates, Amounts, Addresses, Jurisdiction). Only show information actually derived from the document. Do not invent values.';
        break;
      case 'chat':
        systemInstruction = 'You are an expert legal assistant. Answer the user\'s question based ONLY on the provided legal document. If the answer is not in the document, say so. Do not hallucinate external facts.';
        break;
      default:
        return Response.json({ error: 'Invalid action type' }, { status: 400 });
    }

    // 5. Build Gemini Request payload
    const payload: any = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    };

    if (actionType === 'chat' && userMessage) {
      payload.contents[0].parts.push({ text: `User Question: ${userMessage}` });
    } else {
      payload.contents[0].parts.push({ text: `Please perform the requested action on this document.` });
    }

    // 6. Call Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    if (upstream.status !== 200) {
      console.error('[api/document-ai] Gemini Error:', data);
      return Response.json({ error: 'AI processing failed' }, { status: upstream.status });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // If it's a summary and we don't have generated_draft yet, maybe save it?
    // We'll leave the state management to the frontend for flexibility.

    return Response.json({ result: aiText }, { status: 200 });

  } catch (err: any) {
    console.error('[api/document-ai] Error:', err);
    return Response.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
