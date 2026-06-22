'use client';

import Link from 'next/link';
import Navbar from './Navbar';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col relative overflow-hidden">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center justify-center">
        
        <div className="text-center mb-12 relative z-10">
          <h1 className="font-display text-4xl sm:text-5xl text-gold mb-6">
            Premium Version Coming Soon
          </h1>
          <p className="text-cream/80 text-lg max-w-xl mx-auto mb-10">
            We're building something special for you.
          </p>
          
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center bg-gold text-navy font-semibold px-8 py-3.5 rounded-full hover:bg-gold/90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
          >
            Return to Dashboard
          </Link>
        </div>

        {/* Decorative background elements matching the theme */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 blur-[120px] rounded-full pointer-events-none"></div>
      </div>
    </div>
  );
}
