const SYSTEM_PROMPT = `You are an expert Indian legal assistant. Answer only law, legal procedures, IPC sections, court cases, and legal rights questions. For every answer:
1. Give a clear explanation
2. Cite relevant Indian laws/sections (IPC, CrPC, etc.)
3. Give 1-2 real landmark case examples with case name and year
4. Give practical options/next steps the person can take
Never answer non-legal questions. If asked something non-legal, politely decline and ask for a legal question instead.`;

function toGeminiContents(messages) {
  return messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

function extractReply(data) {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text).filter(Boolean).join('\n');
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason;
    if (reason === 'SAFETY') {
      throw new Error('Response blocked. Please rephrase your question.');
    }
    throw new Error('No response received. Please try again.');
  }
  return text;
}

export async function sendLegalChatMessage(messages) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: toGeminiContents(messages),
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.5,
      },
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (!contentType.includes('application/json')) {
    throw new Error('Chat service unavailable. Please try again later.');
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid response from chat service.');
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to get a response. Please try again.');
  }

  return extractReply(data);
}
