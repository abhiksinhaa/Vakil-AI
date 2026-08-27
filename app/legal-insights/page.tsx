'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../src/components/Navbar';
import BottomNav from '../../src/components/BottomNav';
import type { Article } from '../../src/components/LegalInsightsCarousel';

const CATEGORIES = [
  'All',
  'Supreme Court',
  'High Court',
  'Corporate',
  'Employment',
  'Property',
  'Contracts',
  'Litigation',
  'Legal Tech'
];

export default function LegalInsightsPage() {
  const router = useRouter();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        // Fetch a larger batch for the listing page
        const res = await fetch('/api/legal-insights?q=Supreme Court OR High Court OR Indian Law OR Corporate Law OR Litigation OR Legal Tech');
        const data = await res.json();
        
        if (data.articles && data.articles.length > 0) {
          setArticles(data.articles);
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

  const getCategory = (title: string, description: string) => {
    const text = (title + ' ' + description).toLowerCase();
    if (text.includes('supreme court')) return 'Supreme Court';
    if (text.includes('high court')) return 'High Court';
    if (text.includes('corporate')) return 'Corporate';
    if (text.includes('property') || text.includes('real estate')) return 'Property';
    if (text.includes('contract')) return 'Contracts';
    if (text.includes('employment') || text.includes('labour')) return 'Employment';
    if (text.includes('tech') || text.includes('ai ')) return 'Legal Tech';
    if (text.includes('litigation') || text.includes('suit')) return 'Litigation';
    return 'Legal Update';
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = (article.title + ' ' + article.description).toLowerCase().includes(searchQuery.toLowerCase());
      const category = getCategory(article.title, article.description);
      const matchesCategory = activeCategory === 'All' || category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, activeCategory]);

  const handleArticleClick = (article: Article) => {
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

  const SkeletonCard = () => (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col animate-pulse">
      <div className="h-48 bg-navy"></div>
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
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy flex flex-col pb-24">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="font-display text-3xl text-cream mb-4">Legal Insights</h1>
          
          <div className="relative mb-6">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-cream/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text"
              placeholder="Search legal updates..."
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-cream focus:border-gold/50 outline-none transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-gold text-navy'
                    : 'bg-card border border-border text-cream/70 hover:border-gold/30 hover:text-cream'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error && articles.length === 0 ? (
          <div className="w-full card text-center py-16 rounded-3xl border border-border bg-[#0f1525]">
            <svg className="w-10 h-10 text-cream/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-cream/50 text-base mb-6">Unable to load the latest legal insights right now.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary text-sm inline-block px-8 py-3"
            >
              Try again
            </button>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-cream/50 text-base">No articles found matching your criteria.</p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
              className="mt-4 text-gold hover:underline text-sm font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, idx) => {
              const category = getCategory(article.title, article.description);
              
              return (
                <div 
                  key={idx}
                  onClick={() => handleArticleClick(article)}
                  className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col cursor-pointer group hover:border-gold/40 transition-all duration-300 shadow-sm hover:shadow-gold/5"
                >
                  <div className="h-48 w-full overflow-hidden bg-navy relative border-b border-border">
                    {article.imageUrl ? (
                      <img 
                        src={article.imageUrl} 
                        alt={article.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
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
                  
                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-3">
                      <span className="inline-block px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-gold/10 text-gold border border-gold/20">
                        {category}
                      </span>
                    </div>
                    
                    <h3 className="font-display text-cream font-medium text-lg mb-2 leading-tight group-hover:text-gold transition-colors">
                      {article.title}
                    </h3>
                    
                    <p className="text-cream/60 text-sm mb-5 line-clamp-3 leading-relaxed">
                      {article.description}
                    </p>
                    
                    <div className="mt-auto flex justify-between items-center pt-4 border-t border-border text-xs text-cream/40">
                      <span className="font-medium text-cream/70 truncate max-w-[150px]">{article.sourceName}</span>
                      <span>{formatDate(article.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
