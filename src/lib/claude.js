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
  } = formData;

  const systemPrompt = `You are an expert Indian lawyer with 20+ years of experience drafting legal documents. You specialize in Indian law — IPC, CrPC, CPC, Transfer of Property Act, Consumer Protection Act, Negotiable Instruments Act, and all major Indian statutes.

Your task is to generate professional, legally sound ${draftType} documents for Indian courts and legal proceedings.

Rules:
1. Always use proper legal language and format
2. Include correct legal citations where relevant (IPC sections, Acts, etc.)
3. Format the document professionally with proper spacing and structure
4. If language is Hindi, write in Devanagari script
5. If language is Hinglish, write formal parts in English and explanatory parts in Hindi
6. If language is English, write entirely in formal English
7. Always include: Date, To/From addresses, Subject line, numbered paragraphs, signature block
8. Make the document court-ready and professional
9. Do NOT add any explanations or notes outside the document itself — output ONLY the document`;

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
