import Link from 'next/link';
import {
  docNames,
  getResourceContent,
  getResourceDescription,
  parseResourceContent,
} from '@/lib/resources';
import LanguageSelector from './LanguageSelector';

export default async function ResourceArticle({
  slug,
  lang,
}: {
  slug: string;
  lang: string;
}) {
  const docTitle = docNames[slug] || 'Legal Document';
  const content = await getResourceContent(slug, lang);
  const blocks = parseResourceContent(content);
  const description = getResourceDescription(content);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${docTitle} Format`,
    description,
    inLanguage: lang,
    mainEntityOfPage: `https://draftee.in/resources/${encodeURIComponent(slug)}`,
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-[#e8e0d0] py-12 px-4 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2a3a] pb-6">
          <div>
            <Link href="/resources" className="text-[#d4af37] text-sm hover:underline mb-2 inline-block">
              ← Back to Resources
            </Link>
            <h1 className="text-3xl font-extrabold text-white">
              {docTitle} Format
            </h1>
          </div>
          <LanguageSelector slug={slug} lang={lang} />
        </div>

        <article className="bg-[#1a2333] border border-[#1e2a3a] rounded-xl p-6 md:p-8 mb-8 shadow-lg">
          {blocks.map((block, index) =>
            block.type === 'heading' ? (
              <h2 key={index} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">
                {block.text}
              </h2>
            ) : (
              <p key={index} className="font-sans text-[15px] text-[#e8e0d0]/90 leading-relaxed mb-4 last:mb-0">
                {block.text}
              </p>
            ),
          )}
        </article>

        <div className="my-8 flex justify-center hidden" aria-hidden="true">
          {/* Ad Placeholder */}
        </div>

        <div className="bg-gradient-to-r from-[#1a2333] to-[#221c10] border border-[#d4af37]/30 rounded-xl p-8 text-center mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Need this specific document right now?</h2>
          <p className="text-[#e8e0d0]/80 mb-6 max-w-2xl mx-auto">
            Stop copy-pasting formats. Let Draftee&apos;s AI generate a customized, court-ready {docTitle} for your specific case facts in 10 seconds.
          </p>
          <Link
            href="/generate"
            className="inline-block bg-gradient-to-r from-[#c9a84c] to-[#e3c47e] text-[#0a0f1e] font-bold px-8 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all transform hover:-translate-y-1"
          >
            Generate this document with AI in seconds →
          </Link>
        </div>
      </div>
    </div>
  );
}
