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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('Claude API error:', response.status, errBody);
    throw new Error('Draft generation failed. Please try again.');
  }

  const data = await response.json();
  return data.content[0].text;
}
