import { Suspense } from 'react';
import Navbar from '../../../src/components/Navbar';
import BottomNav from '../../../src/components/BottomNav';
import ArticleContent from './ArticleContent';

export default function ArticleDetailPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col pb-24">
      <Navbar />
      
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin"></div>
        </div>
      }>
        <ArticleContent />
      </Suspense>

      <BottomNav />
    </div>
  );
}
