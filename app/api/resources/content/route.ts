import { NextResponse } from 'next/server'
import { getResourceContent } from '@/lib/resources'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const lang = searchParams.get('lang') || 'en'
  if (!slug) {
    return NextResponse.json({ error: 'A resource slug is required.' }, { status: 400 })
  }

  try {
    const content = await getResourceContent(slug, lang)
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Resource content generation failed:', error)
    return NextResponse.json({ error: 'Unable to load resource content.' }, { status: 500 })
  }
}
