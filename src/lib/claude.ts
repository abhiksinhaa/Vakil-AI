import { stripMarkdown } from './stripMarkdown';
import type { DocumentSchema } from './draftSchemas';
import { DRAFT_TYPES } from '../data/legalDraftTypes';

export function buildDraftPrompt(draftTypeId: string, userFactsText: string, structure: string[], language: string, incidentTiming: string) {
  const structureList = structure.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const incidentLawGuide =
    incidentTiming === 'before'
      ? 'Incident before 1 July 2024 — cite IPC, CrPC, and Indian Evidence Act'
      : incidentTiming === 'after'
        ? 'Incident on or after 1 July 2024 — cite BNS, BNSS, and BSA 2023'
        : 'Incident timing not specified — ask advocate to confirm applicable code';

  const systemPrompt = `You are an expert Indian lawyer with 20+ years of experience drafting legal documents. You specialize in Indian law.
Your task is to generate a professional, court-ready ${draftTypeId} document under Indian law.

CRITICAL INSTRUCTIONS:
1. Cover EVERY section listed in the structure provided below.
2. Write original, legally sound content for each section.
3. Use the provided user facts to fill in the content.
4. DO NOT copy or reproduce any fixed template wording — generate fresh, original legal language every time.
5. Output the complete document with headings matching the structure sections.
6. NO placeholder brackets except for genuinely unspecified details like [Court Name].
7. Include correct legal citations per incident timing: ${incidentLawGuide}
8. Language: Generate the draft in ${language || 'English'}. Keep all legal terminology accurate.
9. STRICTLY PROHIBITED: inventing or fabricating case laws.`;

  const userPrompt = `Draft Type: ${draftTypeId}

REQUIRED STRUCTURE:
${structureList}

USER FACTS & SITUATION:
${userFactsText}

Generate the complete document now following the required structure and facts.`;

  return { systemPrompt, userPrompt };
}

export async function generateLegalDraft(formData: any, onStatusChange?: (status: string) => void) {
  const {
    draftType,
    affidavitSubType,
    advocateName,
    barCouncilNumber,
    advocateCity,
    party1Name,
    party1Address,
    party2Name,
    party2Address,
    partyMentionStyle,
    situation,
    dynamicFields,
    schema,
    language,
    incidentTiming,
  } = formData;

  const typedSchema = schema as DocumentSchema;

  const isSimpleFormat = partyMentionStyle === 'simple';
  const isParty1Only = partyMentionStyle === 'party1_only';
  const includeBothParties = partyMentionStyle === 'include';

  let styleInstruction = '';
  if (isSimpleFormat) {
    styleInstruction = 'Generate this document in first person simple format without mentioning opposing parties.';
  } else if (isParty1Only) {
    styleInstruction = `Generate this document with clear ${typedSchema.party1Label} details as provided. Do not mention opposing parties directly.`;
  } else {
    styleInstruction = `Generate this document with clear ${typedSchema.party1Label} and ${typedSchema.party2Label} details as provided.`;
  }

  const incidentLawGuide =
    incidentTiming === 'before'
      ? 'Incident before 1 July 2024 — cite IPC, CrPC, and Indian Evidence Act'
      : incidentTiming === 'after'
        ? 'Incident on or after 1 July 2024 — cite BNS, BNSS, and BSA 2023'
        : 'Incident timing not specified — ask advocate to confirm applicable code';

  const systemPrompt = `You are an expert Indian lawyer with 20+ years of experience drafting legal documents. You specialize in Indian law — BNS (Bharatiya Nyaya Sanhita) 2023, BNSS (Bharatiya Nagarik Suraksha Sanhita) 2023, BSA (Bharatiya Sakshya Adhiniyam) 2023, CPC, Transfer of Property Act, Consumer Protection Act, Negotiable Instruments Act, and all major Indian statutes.

For cases registered before 1 July 2024, use old IPC/CrPC/Evidence Act. For cases after 1 July 2024, use BNS/BNSS/BSA 2023. Follow the incident timing provided by the user for all criminal law citations.

Your task is to generate professional, legally sound ${draftType} documents for Indian courts and legal proceedings.

Rules:
1. Always use proper legal language and format
2. Include correct legal citations per incident timing: IPC/CrPC/Evidence Act if before 1 July 2024; BNS/BNSS/BSA 2023 if on or after 1 July 2024 — do not mix old and new criminal codes in the same draft
3. Format the document professionally with proper spacing and structure
4. If language is Hindi, write in Devanagari script
5. If language is Hinglish, write formal parts in English and explanatory parts in Hindi
6. If language is English, write entirely in formal English
7. Always include: Date, To/From addresses, Subject line, numbered paragraphs, signature block
8. Make the document court-ready and professional
9. Do NOT add any explanations or notes outside the document itself — output ONLY the document, except for the mandatory disclaimer in rule 12
10. STRICTLY PROHIBITED: inventing or fabricating case laws, judgments, or court citations; creating fictional court citations; hallucinating landmark cases
11. CRITICAL: Never fabricate case laws, judgments, or citations. If a specific case law is needed, write [Case Law Required - Please verify with advocate] as placeholder. Only use well-known, verified landmark judgments you are certain about. When in doubt, omit the citation entirely.
12. End every generated draft with this disclaimer on its own line at the bottom:
Note: Please verify all legal citations and sections with a qualified advocate before use.
13. If any field, fact, or detail (e.g., Names, Addresses, Amounts, Dates) is left empty or missing, you MUST generate the draft using placeholder text like "[To be filled]" or "[Empty]" for that specific field.
14. ${styleInstruction}`;

  // Build Party Details Section
  let partyDetailsSection = '';
  if (!isSimpleFormat) {
    partyDetailsSection += `\n${typedSchema.party1Label.toUpperCase()}:\nName: ${party1Name}\nAddress: ${party1Address}\n`;
    if (includeBothParties) {
      partyDetailsSection += `\n${typedSchema.party2Label.toUpperCase()}:\nName: ${party2Name}\nAddress: ${party2Address}\n`;
    }
  }

  // Build Dynamic Fields Section
  let dynamicFieldsSection = '';
  if (typedSchema.fields.length > 0) {
    dynamicFieldsSection = '\nSPECIFIC DETAILS:\n';
    typedSchema.fields.forEach(field => {
      const val = dynamicFields[field.id];
      if (val && val.trim()) {
        dynamicFieldsSection += `- ${field.label}: ${val}\n`;
      }
    });
  }

  let affidavitInstructions = '';
  if (draftType === 'Affidavit') {
    affidavitInstructions = `
CRITICAL INSTRUCTION FOR AFFIDAVITS:
You are generating a "${affidavitSubType}". Ensure the facts/declarations you generate are specifically tailored to this exact sub-type.
You MUST ALWAYS follow this exact format for the affidavit:

---
AFFIDAVIT

I, [Name of Deponent], Son/Daughter/Wife of
[Father's/Husband's Name], aged about [Age] years,
residing at [Full Address], do hereby solemnly
affirm and state as under:

1. That I am the deponent herein and competent
   to swear this affidavit.

2. That [fact/declaration relevant to the purpose].

3. That [additional facts].

4. That the statements made above are true and
   correct to my knowledge and belief.

VERIFICATION

Verified at [Place] on this [Date] that the
contents of this affidavit are true and correct
to my knowledge and belief and nothing material
has been concealed therefrom.

DEPONENT

(Signature)

Attested before me

(Notary/Oath Commissioner)
---

Replace the bracketed placeholders with the actual provided facts or logical, highly relevant clauses for the "${affidavitSubType}".
`;
  }

  const userPrompt = `Generate a ${draftType} with the following details:

${affidavitInstructions}

ADVOCATE DETAILS:
Name: ${advocateName || 'Advocate'}
Bar Council No: ${barCouncilNumber || 'N/A'}
City/Court: ${advocateCity || 'India'}
${partyDetailsSection}
INCIDENT TIMING (applicable criminal law):
${incidentLawGuide}

FACTS & SITUATION:
${situation}
${dynamicFieldsSection}

LANGUAGE INSTRUCTION: Generate this legal draft in ${language || 'English'}. Keep all legal terminology accurate and use formal legal language appropriate for Indian courts in that language.
DATE: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

Style: ${styleInstruction}

Generate the complete ${draftType} now:`;

  let finalSystemPrompt = systemPrompt;
  let finalUserPrompt = userPrompt;

  if (formData.customPrompt) {
    finalSystemPrompt = formData.customPrompt.systemPrompt;
    finalUserPrompt = formData.customPrompt.userPrompt;
  }

  const requestTraceId = (formData as any)?.draftId || (formData as any)?.sessionId || `${draftType}-${Date.now()}`;

  let currentModel = 'gemini-2.5-flash';
  let attempt = 0;
  const maxRetries = 1;

  while (attempt <= maxRetries) {
    try {
      console.log(`[Draft Generation] Attempt ${attempt + 1}: Calling Gemini API with model ${currentModel}`);
      console.log('[Draft Generation] Starting draft generation...');
      console.log('[Draft Generation] Form data:', {
        draftType,
        advocateName,
        party1Name,
        party2Name,
        language,
        incidentTiming,
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const requestPayload = {
        userId: formData.userId,
        model: currentModel,
        systemInstruction: {
          parts: [{ text: finalSystemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: finalUserPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 5000,
          temperature: 0.4,
        },
      };
      
      console.log('[Draft Generation] Request payload keys:', Object.keys(requestPayload));

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[Draft Generation] Attempt ${attempt + 1}: Received response from Gemini API (status: ${response.status})`);

      const contentType = response.headers.get('content-type') || '';
      const raw = await response.text();
      
      console.log('[Draft Generation] Response content-type:', contentType);
      console.log('[Draft Generation] Response body (first 500 chars):', raw.slice(0, 500));

      if (!contentType.includes('application/json')) {
        console.error(
          'Gemini API returned non-JSON (API route may be misconfigured):',
          response.status,
          raw.slice(0, 300)
        );
        throw new Error(
          'Draft API route not reachable. Redeploy with api/gemini serverless function.'
        );
      }

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch (parseErr: any) {
        console.error('[GEMINI_RAW_RESPONSE]', {
          traceId: requestTraceId,
          draftType,
          phase: 'parse-error',
          errorType: 'API_RESPONSE_PARSE_ERROR',
          status: response.status,
          contentType,
          message: parseErr?.message || 'Unable to parse Gemini response',
          rawPreview: raw.slice(0, 1000),
        });
        throw new Error('Generation failed, please try again.');
      }

      console.log('[GEMINI_RAW_RESPONSE]', {
        traceId: requestTraceId,
        draftType,
        status: response.status,
        ok: response.ok,
        candidates: data?.candidates ?? [],
        finishReasons: (data?.candidates ?? []).map((candidate: any) => candidate?.finishReason),
        safetyRatings: data?.candidates?.map((candidate: any) => candidate?.safetyRatings) ?? [],
        promptFeedback: data?.promptFeedback ?? null,
        error: data?.error ?? null,
        rawResponse: data,
      });

      if (!response.ok) {
        console.error('[GEMINI_RAW_RESPONSE]', {
          traceId: requestTraceId,
          draftType,
          phase: 'api-error',
          errorType: 'API_ERROR',
          status: response.status,
          error: data?.error ?? null,
          message: data?.error?.message || data?.error?.status || 'Gemini API returned an error',
        });
        
        if (response.status === 404) {
           const err = new Error('Generation failed, please try again.');
           (err as any).status = 404;
           throw err;
        }
        
        const err = new Error('Generation failed, please try again.');
        (err as any).status = response.status;
        throw err;
      }

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((part: any) => part.text).filter(Boolean).join('\n');
      const finishReason = data.candidates?.[0]?.finishReason;
      
      console.log('[Draft Generation] Gemini response received successfully');
      console.log('[Draft Generation] Generated text length:', text?.length);

      if (!text) {
        console.error('Gemini API empty response:', data);
        console.error('[Draft Generation] Error: Empty response from Gemini');
        throw new Error(
          finishReason === 'SAFETY'
            ? 'Draft blocked by safety filters. Please modify the facts and try again.'
            : 'Generation failed, please try again.'
        );
      }

      let finalDraft = stripMarkdown(text);
      if (finishReason === 'MAX_TOKENS') {
        finalDraft += '\n\n[WARNING: Draft generation was truncated due to length limits. Please review the ending.]';
      }

      console.log('[Draft Generation] Draft generated successfully');
      console.log('[Draft Generation] Final draft length:', finalDraft.length);
      return finalDraft;

    } catch (err: any) {
      const isNetworkError =
        err?.name === 'AbortError' ||
        err instanceof TypeError ||
        /fetch|network|socket|ECONNRESET|ENOTFOUND|ETIMEDOUT|aborted/i.test(err?.message || '');

      if (err?.name === 'AbortError') {
        console.error('[GEMINI_RAW_RESPONSE]', {
          traceId: requestTraceId,
          draftType,
          phase: 'network-error',
          errorType: 'NETWORK_TIMEOUT',
          message: err?.message || 'Request timed out',
        });
        console.error('[Draft Generation] Network timeout error:', err.message);
        throw new Error('Generation failed, please try again.');
      }

      console.error('[GEMINI_RAW_RESPONSE]', {
        traceId: requestTraceId,
        draftType,
        phase: isNetworkError ? 'network-error' : 'api-error',
        errorType: isNetworkError ? 'NETWORK_ERROR' : 'API_ERROR',
        message: err?.message || 'Unknown Gemini error',
        cause: err,
      });
      
      console.error('[Draft Generation] Error in attempt', attempt + 1, ':', {
        message: err?.message,
        isNetworkError,
        errorName: err?.name,
        attempt: attempt + 1,
        maxRetries,
      });

      if (attempt < maxRetries) {
        const isTransient = isNetworkError || (err as any)?.status >= 500;
        
        if (!isTransient) {
          console.error('[Draft Generation] Non-transient error (e.g. 404), skipping retry.');
          throw new Error('Generation failed, please try again.');
        }

        attempt++;
        currentModel = 'gemini-2.5-flash'; // Fallback model
        console.log('[Draft Generation] Retrying with fallback model:', currentModel);
        continue;
      }

      console.error('[Draft Generation] Max retries exceeded, throwing error');
      throw new Error('Generation failed, please try again.');
    }
  }
  
  console.error('[Draft Generation] Failed after all retry attempts');
  throw new Error('Generation failed, please try again.');
}
