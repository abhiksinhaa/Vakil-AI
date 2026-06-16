'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';

const HELP_DATA = [
  {
    section: "Getting Started",
    articles: [
      {
        question: "How to create an account",
        answer: "Click Sign Up on the homepage, enter your email and password, verify your email, and you are ready to use Draftee."
      },
      {
        question: "How to complete your advocate profile",
        answer: "After logging in, go to Settings and tap Profile. Fill in your Advocate Name, Bar Council Number, and City/Court/Jurisdiction. This information will appear on your generated drafts."
      },
      {
        question: "How to generate your first draft",
        answer: "Tap Create New Draft from the dashboard. Select the document type, fill in party details and facts, then tap Generate Draft. Your draft will appear within seconds."
      }
    ]
  },
  {
    section: "Draft Generation",
    articles: [
      {
        question: "Which document types are supported",
        answer: "Draftee supports Legal Notice, Cheque Bounce Notice (Section 138 NI Act), Rent Agreement, Affidavit, Demand Letter, Power of Attorney, Consumer Complaint, Employment Agreement, Partnership Agreement, and Vakalatnama."
      },
      {
        question: "How to use voice input",
        answer: "In the Situation/Facts field, tap the microphone icon in the bottom-right corner of the text box. Speak your facts clearly and they will appear as text automatically. Tap the mic again to stop recording. Works best on Chrome browser."
      },
      {
        question: "Why should I verify drafts with an advocate",
        answer: "Draftee uses AI to generate drafts. While the drafts are professionally structured, AI can make errors. Always have a qualified advocate review the draft before using it in any legal proceeding. Draftee is a drafting assistant, not a substitute for legal advice."
      }
    ]
  },
  {
    section: "Account & Profile",
    articles: [
      {
        question: "How to update my advocate details",
        answer: "Go to Settings, tap Profile, update your Advocate Name, Bar Council Number, or City/Court/Jurisdiction, and tap Save."
      },
      {
        question: "How to view draft history",
        answer: "Tap History in the navigation menu. All your saved drafts will appear here with date, document type, and party names. Tap any draft to view the full content."
      },
      {
        question: "How to delete my account",
        answer: 'To delete your account and all associated data, send an email to abhiksinha1523@gmail.com with subject "Account Deletion Request" and your registered email address. We will process your request within 30 days.'
      }
    ]
  },
  {
    section: "Legal & Privacy",
    articles: [
      {
        question: "Is my data safe",
        answer: "Yes. All your data is encrypted and stored securely using Google Firebase. Security rules ensure only you can access your drafts. We never sell your personal data to third parties."
      },
      {
        question: "What laws does Draftee follow",
        answer: "Draftee complies with Indian law including the Digital Personal Data Protection Act 2023 (DPDP Act). Our platform uses updated Indian laws including BNS, BNSS, and BSA in draft generation."
      },
      {
        question: "Terms of Use and Privacy Policy",
        answer: "You can read our full Terms of Use and Privacy Policy in Settings under Legal section. For any legal queries contact abhiksinha1523@gmail.com."
      }
    ]
  }
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedArticle, setExpandedArticle] = useState(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return HELP_DATA;
    const lowerQuery = searchQuery.toLowerCase();
    
    return HELP_DATA.map(section => {
      const filteredArticles = section.articles.filter(
        article => 
          article.question.toLowerCase().includes(lowerQuery) || 
          article.answer.toLowerCase().includes(lowerQuery)
      );
      return { ...section, articles: filteredArticles };
    }).filter(section => section.articles.length > 0);
  }, [searchQuery]);

  const toggleArticle = (question) => {
    setExpandedArticle(prev => prev === question ? null : question);
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-gold/10 text-cream/70 hover:text-gold transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl text-gold">Help Center</h1>
        </div>

        <div className="relative mb-8">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-cream placeholder:text-cream/30 focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
          />
        </div>

        <div className="space-y-8 flex-1">
          {filteredData.length === 0 ? (
            <div className="text-center py-12 text-cream/50">
              No articles found matching "{searchQuery}"
            </div>
          ) : (
            filteredData.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h2 className="font-display text-lg text-gold/80 px-1">{section.section}</h2>
                <div className="card overflow-hidden !p-0">
                  {section.articles.map((article, aIdx) => {
                    const isExpanded = expandedArticle === article.question;
                    return (
                      <div 
                        key={aIdx} 
                        className={`border-border ${aIdx !== section.articles.length - 1 ? 'border-b' : ''}`}
                      >
                        <button
                          onClick={() => toggleArticle(article.question)}
                          className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gold/5 transition-colors group"
                        >
                          <span className={`text-sm font-medium ${isExpanded ? 'text-gold' : 'text-cream group-hover:text-gold/90'}`}>
                            {article.question}
                          </span>
                          <svg 
                            className={`w-5 h-5 text-cream/40 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-gold' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 text-cream/70 text-sm leading-relaxed animate-in slide-in-from-top-2 fade-in duration-200">
                            {article.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-cream/60 text-sm mb-4">Still need help?</p>
          <a 
            href="mailto:abhiksinha1523@gmail.com" 
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
}
