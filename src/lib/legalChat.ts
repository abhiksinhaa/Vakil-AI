const BASE_SYSTEM_PROMPT = `You are an expert Indian legal assistant. Answer only law, legal procedures, BNS (Bharatiya Nyaya Sanhita) 2023, BNSS (Bharatiya Nagarik Suraksha Sanhita) 2023, BSA (Bharatiya Sakshya Adhiniyam) 2023, court cases, and legal rights questions.

For cases registered before 1 July 2024, use old IPC/CrPC/Evidence Act. For cases after 1 July 2024, use BNS/BNSS/BSA 2023. If the user has not stated when the incident occurred, ask whether it was before or after 1 July 2024 before citing criminal law sections.

For every answer:
1. Give a clear explanation
2. Cite relevant Indian laws/sections (BNS, BNSS, BSA, CPC, and other applicable Acts)
3. For case law: only cite well-known, verified landmark judgments you are certain about. If a specific case is needed but you are unsure, write [Case Law Required - Please verify with advocate]. NEVER invent, fabricate, or hallucinate case names, court citations, or judgments
4. Give practical options/next steps the person can take
5. End with: Note: Please verify all legal citations and sections with a qualified advocate before use.

Never answer non-legal questions. If asked something non-legal, politely decline and ask for a legal question instead.

CRITICAL: Never fabricate case laws, judgments, or citations. When in doubt, omit the citation entirely.`;

const PRO_EXTRAS = `

You are serving a Pro subscriber. Provide thorough, priority-quality responses promptly.
When the user uploads a document (PDF or text), analyze it carefully and cite relevant sections from the document and applicable Indian law.
When asked to generate a draft, produce a complete court-ready legal document with proper format, parties, numbered paragraphs, and signature block — output ONLY the document text.`;

const DRAFT_MODE_PROMPT = `

The user wants a formal legal draft based on this conversation. Generate a complete, court-ready Indian legal document (appropriate type: notice, agreement, affidavit, etc.) with proper headings, parties, numbered paragraphs, date placeholders, and advocate signature block. Output ONLY the draft document.`;

function buildSystemPrompt({ isPro, draftMode, profile }: { isPro: boolean; draftMode: boolean; profile?: any }) {
  let prompt = BASE_SYSTEM_PROMPT;
  if (isPro) prompt += PRO_EXTRAS;
  if (draftMode) prompt += DRAFT_MODE_PROMPT;
  
  if (profile) {
    const { 
      response_style, 
      response_length, 
      preferred_court_format, 
      preferred_draft_language, 
      default_jurisdiction,
      language
    } = profile;

    let profileExtras = `\n\nUSER PREFERENCES:\n`;
    let hasExtras = false;

    if (response_style) {
      profileExtras += `- Tone/Style: ${response_style}\n`;
      hasExtras = true;
    }
    if (response_length) {
      profileExtras += `- Output Length: ${response_length}\n`;
      hasExtras = true;
    }
    if (language && language !== 'English') {
      profileExtras += `- Interaction Language: Respond primarily in ${language}\n`;
      hasExtras = true;
    }
    if (draftMode) {
      if (preferred_court_format) profileExtras += `- Court Format: ${preferred_court_format}\n`;
      if (preferred_draft_language) profileExtras += `- Draft Language: ${preferred_draft_language}\n`;
      if (default_jurisdiction) profileExtras += `- Default Jurisdiction: ${default_jurisdiction}\n`;
      if (profile.preferred_date_format) profileExtras += `- Date Format: ${profile.preferred_date_format}\n`;
      hasExtras = true;
    }

    if (hasExtras) {
      prompt += profileExtras;
    }
  }

  return prompt;
}

function messageToParts(msg) {
  const parts = [];
  const text = msg.content || '';
  if (text) parts.push({ text });

  if (msg.attachment?.inlineData) {
    parts.push({ inline_data: msg.attachment.inlineData });
  }

  if (!parts.length) parts.push({ text: ' ' });
  return parts;
}

function toGeminiContents(messages) {
  return messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: messageToParts(msg),
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

export async function sendLegalChatMessage(messages, options: { isPro?: boolean; draftMode?: boolean; signal?: AbortSignal; profile?: any } = {}) {
  const { isPro = false, draftMode = false, signal, profile } = options;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemPrompt({ isPro, draftMode, profile }) }],
      },
      contents: toGeminiContents(messages),
      generationConfig: {
        maxOutputTokens: isPro ? 4096 : 2048,
        temperature: isPro ? 0.45 : 0.5,
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

export function buildChatTranscript(messages) {
  return messages
    .filter((m) => m.id !== 'welcome')
    .map((m) => {
      const label = m.role === 'user' ? 'Client / User' : 'Draftee Assistant';
      return `${label}:\n${m.content || ''}`;
    })
    .join('\n\n---\n\n');
}
