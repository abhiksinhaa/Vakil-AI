import Link from 'next/link';

const DOCUMENT_TYPES = [
  { slug: 'legal-notice', name: 'Legal Notice' },
  { slug: 'affidavit', name: 'Affidavit' },
  { slug: 'plaint', name: 'Plaint' },
  { slug: 'written-statement', name: 'Written Statement' },
  { slug: 'reply-to-legal-notice', name: 'Reply to Legal Notice' },
  { slug: 'vakalatnama', name: 'Vakalatnama' },
  { slug: 'power-of-attorney', name: 'Power of Attorney' },
  { slug: 'writ-petition', name: 'Writ Petition' },
  { slug: 'appeal', name: 'Appeal' },
  { slug: 'revision', name: 'Revision' },
  { slug: 'review-petition', name: 'Review Petition' },
  { slug: 'execution-petition', name: 'Execution Petition' },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-[#e8e0d0] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-[#d4af37] mb-4 sm:text-5xl">
            Free Legal Document Formats
          </h1>
          <p className="text-xl text-[#e8e0d0]/80">
            Court-ready formats in 11 Indian languages
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DOCUMENT_TYPES.map((doc) => (
            <Link 
              key={doc.slug} 
              href={`/resources/${doc.slug}?lang=en`}
              className="bg-[#1a2333] border border-[#1e2a3a] hover:border-[#d4af37]/50 rounded-xl p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] flex flex-col justify-between h-full"
            >
              <h3 className="text-xl font-bold text-[#e8e0d0] mb-2">{doc.name}</h3>
              <div className="flex items-center text-[#d4af37] text-sm font-semibold mt-4">
                View Format
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
