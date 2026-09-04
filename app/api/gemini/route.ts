export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s execution on Vercel

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { calculateDraftAllowance } from '../../../src/lib/userAccount';
import { requireUser } from '../../../src/lib/supabaseAdmin';

function buildJurisdictionPrompt(state: string, courtLevel: string): string {
  const courtFormats: Record<string, string> = {
    'Supreme Court of India': `
COURT FORMAT: SUPREME COURT OF INDIA
- Cause Title: "IN THE SUPREME COURT OF INDIA"
- "CIVIL/CRIMINAL APPELLATE/ORIGINAL JURISDICTION"
- Case: "CIVIL APPEAL/SPECIAL LEAVE PETITION (CIVIL) NO. ___ OF ____"
- Parties: "BETWEEN: [Appellant] ...Appellant(s) AND [Respondent] ...Respondent(s)"
- Opening: "MOST RESPECTFULLY SHOWETH:"
- Prayer must begin: "It is, therefore, most respectfully prayed..."
- Follow Supreme Court Rules, 2013
- Use refined formal legal English throughout
- Attach list of dates if applicable
- Index of documents required`,

    'High Court': `
COURT FORMAT: HIGH COURT
- Cause Title: "IN THE HIGH COURT OF ${state?.toUpperCase() || 'JUDICATURE'}"
- Include bench details if applicable (Division Bench / Single Bench)
- Use proper writ petition format if applicable (Article 226/227)
- Follow respective High Court Rules
- Formal legal English required
- Include proper index if petition
${state === 'Maharashtra' ? '- Follow Bombay High Court Original Side Rules\n- Proper pagination and indexing required' : ''}
${state === 'Delhi' ? '- Follow Delhi High Court Rules, 2021\n- Include proper synopsis and list of dates for writ petitions' : ''}
${state === 'Tamil Nadu' ? '- Follow Madras High Court Original Side Rules\n- Include proper cause title format as per Madras HC practice' : ''}
${state === 'West Bengal' ? '- Follow Calcutta High Court Rules\n- Include proper format as per Calcutta HC practice' : ''}
${state === 'Karnataka' ? '- Follow Karnataka High Court Rules\n- Dharwad/Gulbarga Bench format if applicable' : ''}
${state === 'Uttar Pradesh' ? '- Follow Allahabad High Court Rules\n- Lucknow Bench format if applicable' : ''}
${state === 'Gujarat' ? '- Follow Gujarat High Court Rules' : ''}
${state === 'Rajasthan' ? '- Follow Rajasthan High Court Rules\n- Jaipur/Jodhpur Bench format as applicable' : ''}
${state === 'Assam' ? '- Follow Gauhati High Court Rules\n- Applicable for Northeast states' : ''}
${state === 'Madhya Pradesh' ? '- Follow MP High Court Rules\n- Jabalpur/Indore/Gwalior Bench as applicable' : ''}`,

    'District Court / Sessions Court': `
COURT FORMAT: DISTRICT COURT / SESSIONS COURT
- Cause Title: "IN THE COURT OF [DESIGNATION OF JUDGE], [CITY/DISTRICT]"
- Standard district court format for ${state || 'India'}
- Use CPC format for civil matters
- Use BNSS format for criminal matters  
- Local bar conventions for ${state || 'India'} to be followed
- Simple, clear legal English preferred
- Avoid overly complex language`,

    'Consumer Court (DCDRC/SCDRC/NCDRC)': `
COURT FORMAT: CONSUMER COURT
- For DCDRC (District): "BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, [DISTRICT]"
- For SCDRC (State): "BEFORE THE STATE CONSUMER DISPUTES REDRESSAL COMMISSION, ${state?.toUpperCase()}"
- For NCDRC (National): "BEFORE THE NATIONAL CONSUMER DISPUTES REDRESSAL COMMISSION, NEW DELHI"
- Follow Consumer Protection Act, 2019
- Include: Complaint under Section 35 (DCDRC) / Section 47 (SCDRC) / Section 58 (NCDRC)
- Prayer must include: compensation, replacement/refund, litigation costs
- Attach: purchase proof, warranty card, correspondence with company`,

    'Family Court': `
COURT FORMAT: FAMILY COURT
- Cause Title: "IN THE FAMILY COURT AT [CITY]"
- Follow Family Courts Act, 1984
- State applicable personal law (Hindu Marriage Act / Special Marriage Act / Muslim Personal Law etc.)
- Sensitive and dignified language required
- Include proper prayer for relief sought
- ${state || 'Local'}-specific family court rules to be followed`,

    'Magistrate Court': `
COURT FORMAT: MAGISTRATE COURT
- "IN THE COURT OF JUDICIAL MAGISTRATE [FIRST/SECOND CLASS], [CITY]"
- OR "IN THE COURT OF CHIEF JUDICIAL MAGISTRATE, [DISTRICT]"
- Follow BNSS, 2023 for criminal matters
- Simple clear language
- Include proper prayer for relief`,

    'Tribunal': `
COURT FORMAT: TRIBUNAL
- Specify the exact tribunal name
- Follow tribunal-specific rules and procedures
- Include proper cause title as per tribunal format
- ${state || 'Local'}-based tribunal rules to be followed`,

    'Lok Adalat': `
COURT FORMAT: LOK ADALAT
- "BEFORE THE LOK ADALAT ORGANIZED BY [ORGANIZING BODY]"
- Follow Legal Services Authorities Act, 1987
- Conciliatory language preferred
- Focus on settlement terms
- Simple clear language`,

    'Revenue Court': `
COURT FORMAT: REVENUE COURT
- Follow ${state || 'Local'} Land Revenue Code/Act
- Include Survey numbers, Khasra numbers as applicable
- Revenue court specific terminology
- Follow local revenue laws of ${state || 'India'}`
  };

  const courtInstruction = courtFormats[courtLevel] || courtFormats['District Court / Sessions Court'];

  return `
=== JURISDICTION INSTRUCTIONS (MANDATORY — FOLLOW STRICTLY) ===

State/UT: ${state || 'India (General)'}
Court: ${courtLevel || 'District Court'}

${courtInstruction}

GENERAL INSTRUCTIONS:
- Generate the draft EXACTLY as it would appear when filed in the above court
- Use the correct cause title format for this court
- Number all paragraphs correctly
- Include proper prayer/relief section
- Add verification/affidavit if required by this court
- Do NOT use IPC sections — use BNS 2023 sections
- Do NOT use CrPC sections — use BNSS 2023 sections  
- Do NOT use Indian Evidence Act — use BSA 2023

=== END JURISDICTION INSTRUCTIONS ===

`;
}

const DEFAULT_MODEL = 'gemini-flash-lite-latest';

/** gemini-1.5-flash was removed from the Generative Language API (404). */
function resolveModel(requested?: string) {
  if (!requested || requested === 'gemini-1.5-flash' || requested === 'gemini-2.0-flash') return DEFAULT_MODEL;
  return requested;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  let body: any;
  let userId = 'unknown';

  try {
    const authenticatedUser = await requireUser(req);
    userId = authenticatedUser.id;
    body = await req.json();
    const documentType = body.documentType || body.document_type || body.draftType;

    console.log('Generate request received:', {
      userId,
      documentType,
      hasApiKey: !!apiKey,
    });
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

    console.log('[api/gemini] Request body received, model:', body.model);
    
    const requestedModel = body.model || process.env.GEMINI_MODEL;
    const model = resolveModel(requestedModel);
    console.log('[api/gemini] Using model:', model);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('plan, drafts_limit, drafts_used, plan_expires_at, org_id, organizations(*)')
        .eq('id', userId)
        .maybeSingle();

    if (profileError) {
      console.error('[api/gemini] Profile lookup failed:', profileError);
      return Response.json({ error: 'Unable to verify account entitlement.' }, { status: 500 });
    }

    if (!profile) {
      return Response.json({ error: 'User profile not found.' }, { status: 403 });
    }

    const isChatRequest = body.actionType === 'chat';
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('id', userId)
      .maybeSingle();
    // Ask Draftee AI is premium-only; draft generation uses the configured draft allowance.
    if (isChatRequest) {
      const premiumPlans = ['basic', 'pro', 'premium', 'firm'];
      const isPremium = premiumPlans.includes(profile.plan || '') ||
                        premiumPlans.includes(subscription?.plan || '') ||
                        (profile.org_id !== null && profile.org_id !== undefined);

      if (!isPremium) {
        return Response.json({
          error: 'Ask Draftee AI requires a Premium plan. Please upgrade.'
        }, { status: 403 });
      }
    }

    const now = new Date()
    const expiresAt = profile.plan_expires_at
        ? new Date(profile.plan_expires_at)
        : null

    // If plan expired, preserve the existing downgrade behavior.
    if (
        profile.plan !== 'free' &&
        expiresAt && 
        expiresAt < now
    ) {
        await supabaseAdmin
          .from('profiles')
          .update({ 
            plan: 'free',
            drafts_limit: 10,
            drafts_used: 0,
          })
          .eq('id', userId)
        
        profile.plan = 'free'
        profile.drafts_limit = 10
    }

    console.log('Draft check:', {
      plan: profile.plan,
      draftsUsed: profile.drafts_used,
      draftsLimit: profile.drafts_limit,
      orgId: profile.org_id,
    });

    if (!isChatRequest) {
      const allowance = await calculateDraftAllowance(profile as any, userId, supabaseAdmin);

      if (!allowance.allowed) {
        return Response.json(
          { error: allowance.message || 'Draft limit reached. Please upgrade to continue.' },
          { status: 403 }
        )
      }
    }
    
    const state = body.state;
    const courtLevel = body.court_level;
    
    delete body.model; // Don't send this to Gemini API
    delete body.userId; // Do not send client identity to Gemini API
    delete body.actionType; // Route-only authorization metadata
    delete body.state;
    delete body.court_level;

    if (body.systemInstruction?.parts?.[0]?.text) {
      const jurisdictionPrompt = buildJurisdictionPrompt(state, courtLevel);
      body.systemInstruction.parts[0].text = jurisdictionPrompt + body.systemInstruction.parts[0].text;
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    let upstream: Response;
    let data: any;

    try {
      console.log('[api/gemini] Making request to Gemini API...');
      upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      console.log('[api/gemini] Gemini API response status:', upstream.status);
      data = await upstream.json();

      if (!upstream.ok) {
        const apiError = new Error(data?.error?.message || `Gemini API returned status ${upstream.status}`) as Error & {
          status?: number;
          code?: string | number;
        };
        apiError.status = upstream.status;
        apiError.code = data?.error?.status || data?.error?.code;
        throw apiError;
      }
    } catch (error: any) {
      console.error('Gemini API error:', {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      if (error.message?.includes('quota')) {
        return NextResponse.json({
          error: 'AI service is temporarily busy. Please try again in a moment.',
        }, { status: 429 });
      }
      if (error.message?.includes('API key')) {
        return NextResponse.json({
          error: 'Service configuration error. Please contact support.',
        }, { status: 500 });
      }
      return NextResponse.json({
        error: 'Generation failed. Please try again.',
      }, { status: 500 });
    }
    
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
      // Drafts table is the single source of truth for counting. No manual increment needed.
    }
    
    return Response.json(data, { status: upstream.status });
  } catch (err) {
    if ((err as any)?.message === 'Unauthorized' || (err as any)?.message === 'No token provided') {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

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
