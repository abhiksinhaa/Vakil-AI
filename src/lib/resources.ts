import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'node:crypto';

export const docNames: Record<string, string> = {
  'legal-notice': 'Legal Notice',
  affidavit: 'Affidavit',
  plaint: 'Plaint',
  'written-statement': 'Written Statement',
  'reply-to-legal-notice': 'Reply to Legal Notice',
  vakalatnama: 'Vakalatnama',
  'power-of-attorney': 'Power of Attorney',
  'writ-petition': 'Writ Petition',
  appeal: 'Appeal',
  revision: 'Revision',
  'review-petition': 'Review Petition',
  'execution-petition': 'Execution Petition',
};

export const resourceLanguages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'or', name: 'Odia' },
  { code: 'as', name: 'Assamese' },
] as const;

export type ResourceLanguage = (typeof resourceLanguages)[number]['code'];
export type ResourceBlock = { type: 'heading' | 'paragraph'; text: string };

const resourceLanguageNames = Object.fromEntries(
  resourceLanguages.map(({ code, name }) => [code, name]),
) as Record<ResourceLanguage, string>;
const RESOURCE_CACHE_DAYS = 30;
const RESOURCE_MODEL = 'gemini-flash-lite-latest';
const pendingResourceContent = new Map<string, Promise<string>>();

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Resource content requires Supabase URL and service role key.');
  }
  return createClient(url, serviceRoleKey, {
    global: {
      fetch: (input, init) => {
        if (process.env.NEXT_PHASE !== 'phase-production-build') {
          return fetch(input, init);
        }
        const headers = new Headers(init?.headers);
        headers.set('x-resource-build-read', randomUUID());
        return fetch(input, { ...init, headers });
      },
    },
  });
}

async function loadResourceContent(
  slug: string,
  lang: string,
): Promise<string> {
  const documentName = docNames[slug];
  if (!documentName) {
    throw new Error(`Unknown legal resource slug: ${slug}`);
  }
  if (!(lang in resourceLanguageNames)) {
    throw new Error(`Unsupported resource language: ${lang}`);
  }

  const supabase = getSupabase();
  const { data: cached, error: cacheError } = await supabase
    .from('resource_content')
    .select('content, created_at')
    .eq('slug', slug)
    .eq('lang', lang)
    .maybeSingle();

  if (cacheError) {
    throw new Error(`Failed to read cached resource content: ${cacheError.message}`);
  }

  if (cached) {
    const age = Date.now() - new Date(cached.created_at).getTime();
    const cacheLifetime = RESOURCE_CACHE_DAYS * 24 * 60 * 60 * 1000;
    if (
      cached.content &&
      (process.env.NEXT_PHASE === 'phase-production-build' ||
        (age >= 0 && age < cacheLifetime))
    ) {
      return cached.content;
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Resource generation requires GEMINI_API_KEY.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an expert Indian lawyer.
Write a comprehensive guide about "${documentName}"
in ${resourceLanguageNames[lang as ResourceLanguage]} language for Indian advocates.

Structure the content as follows:
1. Introduction (what is this document, when it is used)
2. Legal Framework (relevant BNS/BNSS/BSA sections if applicable)
3. Key Components (what must be included)
4. Standard Format/Template (a complete example template)
5. Important Points to Remember
6. Common Mistakes to Avoid
7. FAQ (5 common questions with answers)

Write in ${resourceLanguageNames[lang as ResourceLanguage]} language throughout.
Make it detailed, accurate, and useful for practicing Indian lawyers.
Minimum 800 words.`;

  let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await ai.models.generateContent({
        model: RESOURCE_MODEL,
        contents: prompt,
      });
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      console.warn(
        `Resource generation attempt ${attempt + 1} failed for "${slug}" (${lang}); retrying.`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }

  if (!response) {
    throw new Error(`Resource generation failed for "${slug}" (${lang}).`);
  }

  const content = response.text?.trim();
  if (!content) {
    throw new Error(`Gemini returned empty content for resource "${slug}" (${lang}).`);
  }

  const { error: saveError } = await supabase
    .from('resource_content')
    .upsert(
      { slug, lang, content, created_at: new Date().toISOString() },
      { onConflict: 'slug,lang' },
    );

  if (saveError) {
    throw new Error(`Failed to cache generated resource content: ${saveError.message}`);
  }

  return content;
}

export function getResourceContent(slug: string, lang: string): Promise<string> {
  const key = `${slug}:${lang}`;
  const pending = pendingResourceContent.get(key);
  if (pending) return pending;

  const request = loadResourceContent(slug, lang);
  pendingResourceContent.set(key, request);
  return request.finally(() => {
    pendingResourceContent.delete(key);
  });
}

function toPlainText(line: string): string {
  return line
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function parseResourceContent(content: string): ResourceBlock[] {
  const blocks: ResourceBlock[] = [];
  let paragraph: string[] = [];
  const lines = content.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim());
  const firstFollowingLine = lines
    .slice(firstContentIndex + 1)
    .find((line) => line.trim());

  const flushParagraph = () => {
    const text = toPlainText(paragraph.join(' ').replace(/\s+/g, ' '));
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) {
      flushParagraph();
      continue;
    }

    const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);
    const boldHeading = line.match(/^\*\*(.+)\*\*$/);
    const numberedHeading = line.match(/^\d+[.)]\s+(.+)$/);
    const openingTitle =
      index === firstContentIndex && /^[-*_]{3,}$/.test(firstFollowingLine?.trim() || '');
    const heading =
      markdownHeading?.[1] ??
      boldHeading?.[1] ??
      numberedHeading?.[1] ??
      (openingTitle ? line : undefined);

    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', text: toPlainText(heading) });
      continue;
    }

    paragraph.push(line.replace(/^>\s?/, '').replace(/^[-*]\s+/, ''));
  }

  flushParagraph();
  return blocks;
}

export function getResourceDescription(content: string): string {
  const firstParagraph = parseResourceContent(content).find(
    (block) => block.type === 'paragraph',
  )?.text;
  const description = firstParagraph || `${content}`.trim().replace(/\s+/g, ' ');
  if (description.length <= 154) return description;
  return `${description.slice(0, 153).trimEnd()}…`;
}
