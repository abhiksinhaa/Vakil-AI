'use client';

import Link from 'next/link';
import Navbar from './Navbar';

const GLITTER_STYLES = `
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .glitter-text {
    background: linear-gradient(to right, #d4af37, #fff, #d4af37);
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: gradient-shift 3s linear infinite;
  }
  .sparkle-container {
    position: relative;
    display: inline-block;
  }
  .sparkle-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #d4af37;
    box-shadow: 0 0 10px 2px rgba(212, 175, 55, 0.6);
    animation: sparkle 2s ease-in-out infinite;
  }
`;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#020b14] flex flex-col relative overflow-hidden">
      <style>{GLITTER_STYLES}</style>
      <Navbar />

      <div className="flex-1 w-full px-4 flex flex-col items-center justify-center relative z-10">
        
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#d4af37]/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="text-center relative z-20 animate-[float_6s_ease-in-out_infinite]">
          <div className="sparkle-container mb-8">
            <span className="sparkle-dot" style={{ top: '-10px', left: '-20px', animationDelay: '0s' }}></span>
            <span className="sparkle-dot" style={{ top: '20px', right: '-30px', animationDelay: '0.7s' }}></span>
            <span className="sparkle-dot" style={{ bottom: '-15px', left: '40%', animationDelay: '1.2s' }}></span>
            <span className="sparkle-dot" style={{ top: '-5px', right: '10%', animationDelay: '0.4s' }}></span>
            
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight px-8 py-4">
              <span className="text-gold/80">✨</span>
              <span className="mx-4 glitter-text">Premium Version Coming Next Month</span>
              <span className="text-gold/80">✨</span>
            </h1>
          </div>

          <p className="text-cream/90 text-lg sm:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            "We're crafting something extraordinary for you. Stay tuned."
          </p>
          
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center bg-transparent border border-gold/40 text-gold font-medium px-8 py-4 rounded-full hover:bg-gold hover:text-[#020b14] transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.1)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
          >
            Return to Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
