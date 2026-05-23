import { Link } from 'react-router-dom';
import Navbar from './Navbar';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center justify-center">
        <div className="card w-full max-w-lg flex flex-col items-center text-center p-10 border-gold/40 ring-1 ring-gold/20 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gold/10 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-gold/30">
            <svg
              className="w-8 h-8 text-gold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-gold mb-3">
            Premium Version Coming Soon
          </h1>
          
          <p className="text-cream/90 text-lg mb-6 font-medium italic">
            "We are building something special for you" ✨
          </p>

          <p className="text-cream/50 text-sm mb-8 max-w-sm">
            We are working hard to bring you advanced AI legal tools, unlimited drafts, and much more. Stay tuned for our upcoming launch!
          </p>

          <Link to="/" className="btn-primary w-full sm:w-auto px-10">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
