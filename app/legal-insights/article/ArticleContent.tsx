'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Article } from '../../../src/components/LegalInsightsCarousel';

export default function ArticleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    try {
      const dataParam = searchParams.get('data');
      if (dataParam) {
        const decoded = JSON.parse(decodeURIComponent(atob(dataParam)));
        setArticle(decoded);
      } else {
        router.push('/legal-insights');
      }
    } catch (e) {
      console.error('Failed to parse article data', e);
      router.push('/legal-insights');
    }
  }, [searchParams, router]);

  if (!article) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin"></div>
      </div>
    );
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-cream/50 hover:text-gold text-sm font-medium transition-colors mb-8 group"
      >
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>

      <article className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
        
        {article.imageUrl ? (
          <div className="w-full h-[250px] sm:h-[400px] relative border-b border-border bg-navy">
            <img 
              src={article.imageUrl} 
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          </div>
        ) : (
          <div className="w-full h-32 sm:h-48 flex items-center justify-center border-b border-border bg-navy">
            <svg className="w-16 h-16 text-gold/10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" /></svg>
          </div>
        )}

        <div className="p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-gold/10 text-gold border border-gold/20">
              Legal Insight
            </span>
            <span className="text-sm font-medium text-cream/40">
              {formatDate(article.publishedAt)}
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-semibold text-cream leading-tight mb-6">
            {article.title}
          </h1>

          <div className="flex items-center gap-3 mb-10 pb-10 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-navy border border-border flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gold/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" /></svg>
            </div>
            <div>
              <p className="text-sm text-cream font-medium">Source</p>
              <p className="text-xs text-cream/50">{article.sourceName}</p>
            </div>
          </div>

          <div className="prose prose-invert prose-lg max-w-none prose-p:text-cream/80 prose-p:leading-relaxed mb-12">
            <p className="text-xl sm:text-2xl text-cream/90 font-medium mb-6 leading-relaxed">
              {article.description}
            </p>
            
            {article.content && article.content !== article.description && (
              <p className="opacity-80">
                {/* News API truncates content, so we clean it up lightly */}
                {article.content.replace(/\[\+\d+ chars\]$/, '...')}
              </p>
            )}
          </div>

          <div className="bg-navy border border-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h3 className="text-cream font-medium text-lg mb-1">Continue reading</h3>
              <p className="text-cream/50 text-sm">Read the full article at {article.sourceName}</p>
            </div>
            <a 
              href={article.articleUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gold text-navy font-semibold hover:bg-gold/90 transition-colors text-center inline-flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              Read Full Article
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </a>
          </div>

        </div>
      </article>
    </main>
  );
}
