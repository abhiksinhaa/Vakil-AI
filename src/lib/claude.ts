import { stripMarkdown } from './stripMarkdown';
import type { DocumentSchema } from './draftSchemas';

export async function generateLegalDraft(formData: any) {
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
13. ${styleInstruction}`;

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

LANGUAGE: ${language || 'English'}
DATE: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

Style: ${styleInstruction}

Generate the complete ${draftType} now:`;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.4,
      },
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

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

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error('Gemini API invalid JSON:', raw.slice(0, 300));
    throw new Error('Draft could not be generated. Please try again.');
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      'Draft generate nahi hua. Dobara try karo.';
    console.error('Gemini API error:', response.status, data);
    throw new Error(message);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part: any) => part.text).filter(Boolean).join('\n');
  const finishReason = data.candidates?.[0]?.finishReason;

  if (!text) {
    console.error('Gemini API empty response:', data);
    throw new Error(
      finishReason === 'SAFETY'
        ? 'Draft blocked by safety filters. Please modify the facts and try again.'
        : 'Draft could not be generated. Please try again.'
    );
  }

  let finalDraft = stripMarkdown(text);
  if (finishReason === 'MAX_TOKENS') {
    finalDraft += '\n\n[WARNING: Draft generation was truncated due to length limits. Please review the ending.]';
  }

  return finalDraft;
}
