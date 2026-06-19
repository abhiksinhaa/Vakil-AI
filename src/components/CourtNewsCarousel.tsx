'use client';

import { useEffect, useRef, useState } from 'react';

const stripHtmlTags = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
};

const getCategoryBadge = (categories) => {
  if (!categories || categories.length === 0) return 'Court News';
  const category = categories[0];
  if (category.toLowerCase().includes('supreme')) return 'Supreme Court';
  if (category.toLowerCase().includes('high')) return 'High Court';
  if (category.toLowerCase().includes('supreme')) return 'Supreme Court';
  return 'Court News';
};

const SkeletonCard = () => (
  <div
    className="flex-shrink-0 rounded-[12px] p-4 border border-gold/30 bg-navy"
    style={{ width: 'calc(100vw - 48px)', maxWidth: '360px' }}
  >
    <div className="mb-3">
      <div className="h-5 w-24 rounded-full bg-gradient-to-r from-gold/20 to-gold/5 animate-pulse" />
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-4 bg-gradient-to-r from-gold/20 to-gold/5 rounded animate-pulse" />
      <div className="h-4 w-5/6 bg-gradient-to-r from-gold/20 to-gold/5 rounded animate-pulse" />
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-3 bg-gradient-to-r from-gold/10 to-transparent rounded animate-pulse" />
      <div className="h-3 w-4/5 bg-gradient-to-r from-gold/10 to-transparent rounded animate-pulse" />
      <div className="h-3 w-3/5 bg-gradient-to-r from-gold/10 to-transparent rounded animate-pulse" />
    </div>
    <div className="h-3 w-20 bg-gradient-to-r from-gold/10 to-transparent rounded animate-pulse" />
  </div>
);

const NewsCard = ({ item, onRead }) => {
  const category = getCategoryBadge(item.categories);
  const description = stripHtmlTags(item.description || '');
  const truncatedDesc = description.split('\n').slice(0, 3).join('\n').substring(0, 150);

  return (
    <div
      className="flex-shrink-0 rounded-[12px] p-4 border border-gold/30 bg-navy hover:border-gold/50 transition-colors flex flex-col"
      style={{ width: 'calc(100vw - 48px)', maxWidth: '360px' }}
    >
      <div className="mb-3">
        <span className="inline-block px-3 py-1 rounded-full bg-gold/15 text-gold text-xs font-medium">
          {category}
        </span>
      </div>
      <h3 className="font-serif text-sm font-semibold text-white mb-2 line-clamp-2 leading-tight">
        {item.title}
      </h3>
      <p className="text-xs text-gray-400 mb-3 line-clamp-3 leading-relaxed">
        {truncatedDesc}
      </p>
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gold/20">
        <span className="text-xs text-gray-500">
          {new Date(item.pubDate).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <button
          onClick={() => onRead(item.link)}
          className="text-xs text-gold hover:text-gold/80 font-medium transition-colors"
        >
          Read More →
        </button>
      </div>
    </div>
  );
};

export default function CourtNewsCarousel() {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const containerRef = useRef(null);
  const autoScrollTimerRef = useRef(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(
          'https://api.rss2json.com/v1/api.json?rss_url=https://www.livelaw.in/feed&api_key=n7glzj0m3554v5bwdzrhm6qszjct8glxqy4ignce'
        );
        const data = await response.json();
        if (data.items) {
          setItems(data.items.slice(0, 8));
        }
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  useEffect(() => {
    if (loading || items.length === 0 || autoScrollPaused) return;

    autoScrollTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [loading, items.length, autoScrollPaused]);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
    setAutoScrollPaused(true);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const deltaX = touchStart - e.changedTouches[0].clientX;

    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    }

    setTouchStart(0);
    setTimeout(() => setAutoScrollPaused(false), 100);
  };

  const handleReadMore = (link) => {
    window.open(link, '_blank');
  };

  if (loading) {
    return (
      <div className="mb-8 px-4 sm:px-6">
        <div
          className="flex gap-3 overflow-hidden pb-4"
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 px-4 sm:px-6">
      <div
        className="flex gap-3 overflow-hidden pb-4"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(calc(-${currentIndex} * (100vw - 48px - 12px)))`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {items.map((item) => (
          <NewsCard key={item.link} item={item} onRead={handleReadMore} />
        ))}
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-1.5">
        {items.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCurrentIndex(idx);
              setAutoScrollPaused(true);
              setTimeout(() => setAutoScrollPaused(false), 100);
            }}
            className={`rounded-full transition-all ${
              idx === currentIndex
                ? 'bg-gold w-2 h-2'
                : 'bg-gold/30 w-1.5 h-1.5 hover:bg-gold/50'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
