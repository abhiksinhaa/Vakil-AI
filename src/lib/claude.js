export async function generateLegalDraft(formData) {
  const {
    draftType,
    advocateName,
    barCouncilNumber,
    advocateCity,
    party1Name,
    party1Address,
    party2Name,
    party2Address,
    situation,
    amount,
    responseTime,
    language,
    incidentTiming,
  } = formData;

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
Note: Please verify all legal citations and sections with a qualified advocate before use.`;

  const userPrompt = `Generate a ${draftType} with the following details:

ADVOCATE DETAILS:
Name: ${advocateName || 'Advocate'}
Bar Council No: ${barCouncilNumber || 'N/A'}
City/Court: ${advocateCity || 'India'}

PARTY 1 (CLIENT/SENDER):
Name: ${party1Name}
Address: ${party1Address}

PARTY 2 (OPPOSITE PARTY/RECIPIENT):
Name: ${party2Name}
Address: ${party2Address}

INCIDENT TIMING (applicable criminal law):
${incidentLawGuide}

FACTS & SITUATION:
${situation}

${amount ? `AMOUNT INVOLVED: ₹${amount}` : ''}
${responseTime ? `RESPONSE TIME DEMANDED: ${responseTime}` : '15 days'}

LANGUAGE: ${language || 'English'}
DATE: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

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
        maxOutputTokens: 2000,
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
    throw new Error('Draft generate nahi hua. Dobara try karo.');
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      'Draft generate nahi hua. Dobara try karo.';
    console.error('Gemini API error:', response.status, data);
    throw new Error(message);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text).filter(Boolean).join('\n');

  if (!text) {
    const blockReason = data.candidates?.[0]?.finishReason;
    console.error('Gemini API empty response:', data);
    throw new Error(
      blockReason === 'SAFETY'
        ? 'Draft blocked by safety filters. Facts thoda modify karke try karo.'
        : 'Draft generate nahi hua. Dobara try karo.'
    );
  }

  return text;
}
