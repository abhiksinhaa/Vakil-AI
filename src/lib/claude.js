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

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key missing. Set VITE_GEMINI_API_KEY in .env');
  }

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Gemini API error:', response.status, data);
    throw new Error('Draft generation failed. Please try again.');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error('Gemini API unexpected response:', data);
    throw new Error('Draft generation failed. Please try again.');
  }

  return text;
}
