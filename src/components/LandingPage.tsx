'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import '../styles/landing.css';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const { session, theme, toggleTheme } = useApp();
  const router = useRouter();
  const videoEmbedUrl = 'https://www.youtube.com/embed/9b8OuLwqtFI';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-on-scroll').forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, []);

  // Count-up animation for stats
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const stats = document.querySelectorAll('.landing-stat-num');
          stats.forEach(stat => {
            const targetAttr = stat.getAttribute('data-val');
            if (!targetAttr) return;
            const target = parseInt(targetAttr, 10);
            const suffix = stat.getAttribute('data-suffix') || '';
            let current = 0;
            const duration = 2000;
            const stepTime = 30;
            const steps = duration / stepTime;
            const increment = target / steps;
            
            const timer = setInterval(() => {
              current += increment;
              if (current >= target) {
                current = target;
                clearInterval(timer);
              }
              stat.textContent = Math.floor(current).toLocaleString('en-IN') + suffix;
            }, stepTime);
            
            stat.removeAttribute('data-val');
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const statsContainer = document.querySelector('.landing-stats');
    if (statsContainer) observer.observe(statsContainer);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDemoModalOpen(false);
      }
    };

    if (isDemoModalOpen) {
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isDemoModalOpen]);

  return (
    <div className="landing-body">
      {/* Navbar */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link href="/" className="landing-logo">
          <img
            src="/logo"
            alt="Draftee"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
        </Link>
        <div className={`landing-nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <a href="#features" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#how-it-works" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
          <a href="#testimonials" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
        </div>
        <div className={`landing-nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button onClick={toggleTheme} className="landing-btn-ghost p-2 rounded-full" aria-label="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {session ? (
            <Link href="/dashboard" className="landing-btn-gold">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="landing-btn-ghost">Sign In</Link>
              <Link href="/signup" className="landing-btn-gold">Get Started Free</Link>
            </>
          )}
        </div>
        <button 
          className="landing-mobile-menu-btn md:hidden ml-auto text-2xl" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-badge">AI-Powered Legal Tech</span>
          <h1 className="landing-h1">AI Legal Intelligence for Indian Lawyers.</h1>
          <p className="landing-p">
            Generate court-ready legal drafts in seconds. Save hours. Win more cases.
          </p>
          <div className="landing-hero-btns">
            {session ? (
              <Link href="/dashboard" className="landing-btn-gold">
                Go to Dashboard →
              </Link>
            ) : (
              <Link href="/signup" className="landing-btn-gold">
                Start Free →
              </Link>
            )}
            <button className="landing-btn-ghost" onClick={() => setIsDemoModalOpen(true)}>
              Watch Demo
            </button>
          </div>
          
          <div className="landing-stats">
            <div className="landing-stat">
              <span className="landing-stat-num" data-val="1500000" data-suffix="+">0</span>
              <span className="landing-stat-label">Registered Lawyers in India</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-num" data-val="10" data-suffix=" Seconds">0</span>
              <span className="landing-stat-label">Average Draft Generation Time</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-num" data-val="10" data-suffix="+">0</span>
              <span className="landing-stat-label">Document Types Supported</span>
            </div>
          </div>
        </div>
        
        <div className="landing-hero-visual">
          <div className="torus-container">
            <div className="torus">
              <div className="torus-ring"></div>
              <div className="torus-ring"></div>
              <div className="torus-ring"></div>
              <div className="torus-ring"></div>
            </div>
          </div>
        </div>
      </header>

      <section className="landing-demo-section">
        <div className="landing-demo-card fade-in-on-scroll">
          <div className="landing-demo-copy">
            <span className="landing-badge">See it in action</span>
            <h2 className="landing-h2 landing-demo-title">Watch Draftee in Action</h2>
            <p className="landing-p landing-demo-subtitle">
              See how Draftee helps legal professionals generate court-ready legal drafts in seconds.
            </p>
          </div>
          <div className="landing-demo-player">
            <iframe
              src={videoEmbedUrl}
              title="Draftee demo video"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-section">
        <h2 className="landing-h2 fade-in-on-scroll">Everything a lawyer needs</h2>
        <div className="landing-grid">
          <div className="landing-card fade-in-on-scroll">
            <div className="landing-card-icon">⚖️</div>
            <h3 className="landing-card-title">Instant Legal Drafts</h3>
            <p className="landing-card-p">Generate Legal Notice, Cheque Bounce, Affidavit and more in seconds</p>
          </div>
          <div className="landing-card fade-in-on-scroll" style={{ transitionDelay: '0.1s' }}>
            <div className="landing-card-icon">🤖</div>
            <h3 className="landing-card-title">AI Legal Assistant</h3>
            <p className="landing-card-p">Ask any legal question, get answers based on BNS, BNSS, BSA</p>
          </div>
          <div className="landing-card fade-in-on-scroll" style={{ transitionDelay: '0.2s' }}>
            <div className="landing-card-icon">🔒</div>
            <h3 className="landing-card-title">Secure & Private</h3>
            <p className="landing-card-p">Your drafts are encrypted and visible only to you</p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="landing-section" style={{ backgroundColor: 'color-mix(in srgb, var(--landing-card) 50%, transparent)' }}>
        <h2 className="landing-h2 fade-in-on-scroll">Three steps to your perfect draft</h2>
        <div className="landing-grid">
          <div className="landing-card fade-in-on-scroll">
            <div className="landing-card-icon text-gold text-2xl font-bold">1</div>
            <h3 className="landing-card-title">Choose Document</h3>
            <p className="landing-card-p">Select from 10+ legal document types including NDAs, Affidavits, and Notices.</p>
          </div>
          <div className="landing-card fade-in-on-scroll" style={{ transitionDelay: '0.1s' }}>
            <div className="landing-card-icon text-gold text-2xl font-bold">2</div>
            <h3 className="landing-card-title">Fill the Details</h3>
            <p className="landing-card-p">Enter party names, facts, and situation. You can even use your voice to explain.</p>
          </div>
          <div className="landing-card fade-in-on-scroll" style={{ transitionDelay: '0.2s' }}>
            <div className="landing-card-icon text-gold text-2xl font-bold">3</div>
            <h3 className="landing-card-title">Download & Use</h3>
            <p className="landing-card-p">Get a court-ready draft in seconds. Edit if needed, or download straight to PDF.</p>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section id="testimonials" className="landing-section">
        <div className="text-center mb-6 fade-in-on-scroll">
          <span className="landing-badge mx-auto">⭐ Verified Reviews from Real Indian Advocates</span>
        </div>
        <h2 className="landing-h2 fade-in-on-scroll">Trusted by Indian Advocates</h2>
        <div className="landing-testimonials-grid">
          <div className="landing-testimonial fade-in-on-scroll">
            <div className="landing-stars">★★★★★</div>
            <p className="landing-testimonial-quote flex-grow">
              "I have done legal drafting worth more than ₹60,000 through legal school. If I had known about Draftee earlier, I wouldn't have invested that much. Draftee has made legal drafting incredibly easy. It is truly helpful for anyone in the legal fraternity."
            </p>
            <div className="landing-testimonial-author mt-auto">
              <div className="landing-avatar">SM</div>
              <div>
                <div className="font-semibold text-sm">Adv. Soniya Makwana</div>
                <div className="text-xs opacity-60">Advocate</div>
              </div>
            </div>
          </div>
          <div className="landing-testimonial fade-in-on-scroll" style={{ transitionDelay: '0.1s' }}>
            <div className="landing-stars">★★★★★</div>
            <p className="landing-testimonial-quote flex-grow">
              "Really impressed with Draftee.in. The app is easy to navigate, performs smoothly, and offers a great user experience.<br /><br />Draftee.in is one of the most useful legal apps I've used. It simplifies legal drafting and is very helpful for both practicing lawyers and law students.<br /><br />It stands out because it is designed around the real needs of lawyers and law students. It is intuitive, efficient, and genuinely useful. More than just an app, it is a valuable legal companion. Wishing the team continued success."
            </p>
            <div className="landing-testimonial-author mt-auto">
              <div className="landing-avatar">SK</div>
              <div>
                <div className="font-semibold text-sm">Adv. Shabnam Khan</div>
                <div className="text-xs opacity-60">Advocate</div>
              </div>
            </div>
          </div>
          <div className="landing-testimonial fade-in-on-scroll" style={{ transitionDelay: '0.2s' }}>
            <div className="landing-stars">★★★★★</div>
            <p className="landing-testimonial-quote flex-grow">
              "Great! Now it's perfect."
            </p>
            <div className="landing-testimonial-author mt-auto">
              <div className="landing-avatar">SS</div>
              <div>
                <div className="font-semibold text-sm">Adv. Shakshi Dhari Singh</div>
                <div className="text-xs opacity-60">Advocate</div>
              </div>
            </div>
          </div>
        </div>
        <p className="landing-p mx-auto text-center mt-12 fade-in-on-scroll">
          Built with continuous feedback from practicing advocates across India.
        </p>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <h2 className="landing-h2 mb-4">Ready to draft legal documents in minutes?</h2>
        <p className="landing-p mx-auto mb-8">Join thousands of Indian lawyers using Draftee.</p>
        {session ? (
          <Link href="/dashboard" className="landing-btn-gold text-lg px-8 py-4">
            Go to Dashboard →
          </Link>
        ) : (
          <Link href="/signup" className="landing-btn-gold text-lg px-8 py-4">
            Start Free →
          </Link>
        )}
      </section>

      {isDemoModalOpen && (
        <div className="landing-demo-modal-overlay" onClick={() => setIsDemoModalOpen(false)}>
          <div className="landing-demo-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="landing-demo-modal-close"
              onClick={() => setIsDemoModalOpen(false)}
              aria-label="Close demo video"
            >
              ×
            </button>
            <div className="landing-demo-modal-player">
              <iframe
                src={videoEmbedUrl}
                title="Draftee demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-logo text-xl">
          <img
            src="/logo"
            alt="Draftee"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
        </div>
        <div className="text-sm opacity-60">© 2025 Draftee. Legal Drafts in Seconds.</div>
        <div className="landing-footer-links">
          <a href="#" className="landing-footer-link">Terms of Use</a>
          <a href="#" className="landing-footer-link">Privacy Policy</a>
          <a href="#" className="landing-footer-link">Help Center</a>
        </div>
      </footer>
    </div>
  );
}
