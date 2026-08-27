'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface Article {
  title: string;
  description: string;
  imageUrl: string;
  sourceName: string;
  publishedAt: string;
  articleUrl: string;
  content: string;
}

const getCategoryBadge = (title: string, description: string) => {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('supreme court')) return 'Supreme Court';
  if (text.includes('high court')) return 'High Court';
  if (text.includes('corporate')) return 'Corporate';
  if (text.includes('property') || text.includes('real estate')) return 'Property';
  if (text.includes('contract')) return 'Contracts';
  if (text.includes('employment') || text.includes('labour')) return 'Employment';
  return 'Legal Update';
};

const SkeletonCard = () => (
  <div className="flex-shrink-0 w-[280px] sm:w-[320px] rounded-2xl border border-border bg-card overflow-hidden flex flex-col snap-start animate-pulse">
    <div className="h-40 bg-navy"></div>
    <div className="p-4 flex flex-col flex-1">
      <div className="h-5 w-24 bg-navy rounded mb-3"></div>
      <div className="space-y-2 mb-3">
        <div className="h-4 w-full bg-navy rounded"></div>
        <div className="h-4 w-5/6 bg-navy rounded"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-navy rounded"></div>
        <div className="h-3 w-4/5 bg-navy rounded"></div>
      </div>
      <div className="mt-auto flex justify-between items-center">
        <div className="h-3 w-16 bg-navy rounded"></div>
        <div className="h-3 w-20 bg-navy rounded"></div>
      </div>
    </div>
  </div>
);

export default function LegalInsightsCarousel() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/legal-insights?q=Supreme Court OR High Court OR Indian Law');
        const data = await res.json();
        
        if (data.articles && data.articles.length > 0) {
          setArticles(data.articles.slice(0, 6)); // Display 6 articles
        } else if (data.error) {
          setError(data.error);
        } else {
          setError('No articles found.');
        }
      } catch (err) {
        console.error('Failed to fetch legal insights:', err);
        setError('Unable to load the latest legal insights right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const handleArticleClick = (article: Article) => {
    // Pass metadata securely via URL parameters to the detail page
    const params = new URLSearchParams({
      data: btoa(encodeURIComponent(JSON.stringify(article)))
    });
    router.push(`/legal-insights/article?${params.toString()}`);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-cream font-semibold tracking-wide">Legal Insights</h2>
        <Link href="/legal-insights" className="text-xs text-gold hover:underline uppercase tracking-wider font-medium transition-colors">
          View all →
        </Link>
      </div>

      <div className="relative -mx-4 sm:mx-0">
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 px-4 sm:px-0 hide-scrollbar snap-x snap-mandatory"
        >
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : error && articles.length === 0 ? (
            <div className="w-full card text-center py-12 rounded-2xl border border-border bg-[#0f1525]">
              <svg className="w-8 h-8 text-cream/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-cream/50 text-sm mb-4">Unable to load the latest legal insights right now.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="btn-primary text-sm inline-block px-6 py-2"
              >
                Try again
              </button>
            </div>
          ) : (
            articles.map((article, idx) => {
              const category = getCategoryBadge(article.title, article.description);
              
              return (
                <div 
                  key={idx}
                  onClick={() => handleArticleClick(article)}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] rounded-2xl border border-border bg-card overflow-hidden flex flex-col snap-start cursor-pointer group hover:border-gold/40 transition-all duration-300 shadow-sm"
                >
                  <div className="h-40 w-full overflow-hidden bg-navy relative border-b border-border">
                    {article.imageUrl ? (
                      <img 
                        src={article.imageUrl} 
                        alt={article.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback to Draftee themed icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          const svg = document.createElement('div');
                          svg.innerHTML = '<svg class="w-12 h-12 text-gold/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>';
                          e.currentTarget.parentElement?.appendChild(svg.firstChild as Node);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gold/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <div className="mb-2">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-gold/10 text-gold border border-gold/20">
                        {category}
                      </span>
                    </div>
                    
                    <h3 className="font-display text-cream font-medium text-base mb-2 line-clamp-2 leading-tight group-hover:text-gold transition-colors">
                      {article.title}
                    </h3>
                    
                    <p className="text-cream/50 text-xs mb-4 line-clamp-3 leading-relaxed">
                      {article.description}
                    </p>
                    
                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-border text-[11px] text-cream/40">
                      <span className="font-medium text-cream/60 truncate max-w-[120px]">{article.sourceName}</span>
                      <span>{formatDate(article.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
