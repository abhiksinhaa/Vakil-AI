'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'mr', name: 'मराठी' },
  { code: 'gu', name: 'ગજરાતી' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'or', name: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'অসমীয়া' },
];

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
};

export default function DocumentResourcePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const slug = params.slug as string;
  const lang = searchParams.get('lang') || 'en';
  
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/resources/content?slug=${slug}&lang=${lang}`);
        if (!res.ok) throw new Error('Failed to fetch content');
        const data = await res.json();
        setContent(data.content);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      fetchContent();
    }
  }, [slug, lang]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/resources/${slug}?lang=${e.target.value}`);
  };

  const docTitle = docNames[slug] || 'Legal Document';

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-[#e8e0d0] py-12 px-4 sm:px-6 lg:px-8">
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
          
          <div className="flex items-center gap-2">
            <label htmlFor="language-select" className="text-sm text-[#e8e0d0]/70">Language:</label>
            <select
              id="language-select"
              value={lang}
              onChange={handleLanguageChange}
              className="bg-[#1a2333] border border-[#1e2a3a] text-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-[#1a2333] border border-[#1e2a3a] rounded-xl p-6 md:p-8 mb-8 shadow-lg">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-2 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin" />
              <p className="text-[#e8e0d0]/70 text-sm">Generating comprehensive guide in {LANGUAGES.find(l => l.code === lang)?.name}...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-400">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-[#1e2a3a] rounded hover:bg-[#2a3a4a] text-sm"
              >
                Try Again
              </button>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-[15px] text-[#e8e0d0]/90 leading-relaxed">
              {content}
            </pre>
          )}
        </div>

        {/* TODO: Add AdSense ad here after approval */}
        <div className="my-8 flex justify-center hidden" aria-hidden="true">
          {/* Ad Placeholder */}
        </div>

        <div className="bg-gradient-to-r from-[#1a2333] to-[#221c10] border border-[#d4af37]/30 rounded-xl p-8 text-center mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Need this specific document right now?</h2>
          <p className="text-[#e8e0d0]/80 mb-6 max-w-2xl mx-auto">
            Stop copy-pasting formats. Let Draftee's AI generate a customized, court-ready {docTitle} for your specific case facts in 10 seconds.
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
