'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Send, Scale, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import { useApp } from '../../src/context/AppContext';

const RESEARCH_PROMPT = `You are a specialized Legal Research AI for Indian Law.
Your primary focus is:
1. Case Law Research & Precedent Search (Supreme Court, High Courts).
2. Explaining legal sections, especially the new BNS (Bharatiya Nyaya Sanhita), BNSS, and BSA 2023.
3. Comparing old IPC/CrPC with new BNS/BNSS.
Always cite the exact sections and verifiable case laws. If unsure about a specific case law, state clearly that it needs verification. Never hallucinate case names. Provide thorough, structured, and highly professional legal analysis.`;

export default function LegalResearchPage() {
  const router = useRouter();
  const { profile } = useApp();
  
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', content: 'Welcome to the Legal Research Assistant. How can I help you analyze case laws, precedents, or understand the new BNS/BNSS/BSA laws today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { id: `user-${Date.now()}`, role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const historyForApi = newMessages.filter(m => m.id !== 'welcome').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: RESEARCH_PROMPT }] },
          contents: historyForApi,
          generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
        })
      });

      if (!res.ok) throw new Error('Research analysis failed. Please try again.');
      
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const replyText = parts.map((p: any) => p.text).filter(Boolean).join('\n');
      
      if (!replyText) throw new Error('No valid response received.');

      // Strip basic markdown bold for cleaner raw text display
      const cleanedReply = replyText.replace(/\*\*/g, '').replace(/\*/g, '');

      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: cleanedReply }]);
    } catch (err: any) {
      setError(err.message);
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      setInput(userMsg.content);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans">
      <header className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1c3065] to-[#08122e] flex items-center justify-center border border-white/10">
              <Scale className="w-5 h-5 text-[#a8b8d8]" />
            </div>
            <div>
              <h1 className="text-xl font-medium tracking-tight">Legal Research</h1>
              <p className="text-xs text-white/50">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 relative">
        <div className="flex-1 overflow-y-auto py-8 space-y-6">
          {messages.length === 1 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto animate-in fade-in zoom-in duration-500 min-h-[60vh]">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1c3065]/50 to-transparent flex items-center justify-center mb-8 border border-[#1c3065]">
                <BookOpen className="w-10 h-10 text-[#a8b8d8]" />
              </div>
              <h2 className="text-3xl font-medium mb-4 tracking-tight">Case Law & Precedent Search</h2>
              <p className="text-white/50 mb-12">Ask specific legal questions, compare BNS/BNSS sections, or search for established case laws.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {[
                  { title: 'Compare IPC & BNS', desc: 'Find equivalent sections in the new laws', icon: <Scale className="w-5 h-5 text-[#a8b8d8]" /> },
                  { title: 'Landmark Judgments', desc: 'Search precedents on fundamental rights', icon: <BookOpen className="w-5 h-5 text-[#a8b8d8]" /> }
                ].map((chip, i) => (
                  <button 
                    key={i}
                    onClick={() => { setInput(chip.title); }}
                    className="flex flex-col items-start p-5 bg-[#121212] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl transition-all text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/5 rounded-lg">{chip.icon}</div>
                      <span className="font-medium">{chip.title}</span>
                    </div>
                    <span className="text-sm text-white/40">{chip.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start flex-col animate-in fade-in slide-in-from-bottom-2'}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1c3065] to-[#08122e] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-white/90">Research AI</span>
                    </div>
                  )}
                  <div className={`${msg.role === 'user' ? 'max-w-[85%] sm:max-w-[75%] px-5 py-3.5 bg-[#1e1e1e] text-white rounded-3xl rounded-br-sm' : 'w-full pl-11 pr-4 text-white/90'} text-[15px] leading-relaxed whitespace-pre-wrap`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start flex-col animate-in fade-in">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1c3065] to-[#08122e] flex items-center justify-center">
                       <Sparkles className="w-4 h-4 text-white animate-pulse" />
                     </div>
                     <span className="text-sm font-medium text-white/90">Analyzing case laws...</span>
                  </div>
                  <div className="pl-11 py-2 flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse delay-150" />
                    <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse delay-300" />
                  </div>
                </div>
              )}
              {error && (
                <div className="pl-11 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        <div className="shrink-0 pb-8 pt-4 sticky bottom-0 bg-[#080808] z-20">
          <form onSubmit={handleSend} className="flex items-center gap-2 p-2 bg-[#1a1a1a] border border-white/10 rounded-full focus-within:border-white/20 transition-all shadow-xl">
            <div className="w-10 h-10 flex items-center justify-center rounded-full text-white/40 shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Search case laws, BNSS sections, or legal precedents..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none text-white placeholder:text-white/30 focus:ring-0 text-[15px] py-3 px-2 min-w-0"
              autoComplete="off"
            />
            <div className="pr-1">
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
