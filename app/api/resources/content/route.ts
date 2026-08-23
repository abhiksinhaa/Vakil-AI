import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const lang = searchParams.get('lang') || 'en'

  // Check Supabase cache first
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cached } = await supabase
    .from('resource_content')
    .select('content, created_at')
    .eq('slug', slug)
    .eq('lang', lang)
    .single()

  // If cached and less than 30 days old, return cached
  if (cached) {
    const age = Date.now() - new Date(cached.created_at).getTime()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (age < thirtyDays) {
      return NextResponse.json({ content: cached.content, cached: true })
    }
  }

  // Generate with Gemini
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const langNames: Record<string, string> = {
    en: 'English', hi: 'Hindi', bn: 'Bengali',
    ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
    gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
    or: 'Odia', as: 'Assamese'
  }

  const docNames: Record<string, string> = {
    'legal-notice': 'Legal Notice',
    'affidavit': 'Affidavit',
    'plaint': 'Plaint',
    'written-statement': 'Written Statement',
    'reply-to-legal-notice': 'Reply to Legal Notice',
    'vakalatnama': 'Vakalatnama',
    'power-of-attorney': 'Power of Attorney',
    'writ-petition': 'Writ Petition',
    'appeal': 'Appeal',
    'revision': 'Revision',
    'review-petition': 'Review Petition',
    'execution-petition': 'Execution Petition',
  }

  const prompt = `You are an expert Indian lawyer. 
Write a comprehensive guide about "${docNames[slug!]}" 
in ${langNames[lang]} language for Indian advocates.

Structure the content as follows:
1. Introduction (what is this document, when is it used)
2. Legal Framework (relevant BNS/BNSS/BSA sections if applicable)
3. Key Components (what must be included)
4. Standard Format/Template (a complete example template)
5. Important Points to Remember
6. Common Mistakes to Avoid
7. FAQ (5 common questions with answers)

Write in ${langNames[lang]} language throughout.
Make it detailed, accurate, and useful for practicing Indian lawyers.
Minimum 800 words.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  })

  const content = response.text

  // TODO: Run in Supabase SQL Editor:
  // CREATE TABLE IF NOT EXISTS resource_content (
  //   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  //   slug text NOT NULL,
  //   lang text NOT NULL,
  //   content text NOT NULL,
  //   created_at timestamptz DEFAULT NOW(),
  //   UNIQUE(slug, lang)
  // );

  // Cache in Supabase
  await supabase
    .from('resource_content')
    .upsert({
      slug,
      lang,
      content,
      created_at: new Date().toISOString()
    }, { onConflict: 'slug,lang' })

  return NextResponse.json({ content, cached: false })
}
