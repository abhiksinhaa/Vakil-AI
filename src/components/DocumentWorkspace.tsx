'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

type Tab = 'overview' | 'content' | 'details';
type AIAction = 'summary' | 'analyze' | 'risks' | 'extract' | null;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function DocumentWorkspace({ draftId }: { draftId: string }) {
  const router = useRouter();
  const { session } = useApp();

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // AI State
  const [aiAction, setAiAction] = useState<AIAction>(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Organization State
  const [matters, setMatters] = useState<any[]>([]);
  const [showMatterSelect, setShowMatterSelect] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase
          .from('drafts')
          .select('*')
          .eq('id', draftId)
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;
        setDoc(data);

        // Pre-fetch matters for 'Add to Matter'
        const { data: mData } = await supabase
          .from('matters')
          .select('id, title, case_type')
          .eq('user_id', session.user.id);
        if (mData) setMatters(mData);

        // Generate signed URL for PDF viewing
        if (data.amount) {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(data.amount, 3600);
          
          if (!urlError && urlData) {
            setPdfUrl(urlData.signedUrl);
          }
        }
      } catch (err: any) {
        console.error('Failed to load document', err);
        setError('Document not found or access denied.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [draftId, session?.user?.id]);

  const runAIAction = async (action: AIAction) => {
    if (!action) return;
    setAiAction(action);
    setAiResult('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/document-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          userId: session?.user?.id,
          actionType: action
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze document');
      
      setAiResult(data.result);
      
      // If it's a summary and we don't have one saved, optionally save it to generated_draft
      if (action === 'summary' && !doc.generated_draft) {
        const { error } = await supabase
          .from('drafts')
          .update({ generated_draft: data.result })
          .eq('id', draftId);
          
        if (!error) setDoc(prev => ({ ...prev, generated_draft: data.result }));
      }
      
    } catch (err: any) {
      setAiResult(`Error: ${err.message}. Please try again.`);
    } finally {
      setAiLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/document-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          userId: session?.user?.id,
          actionType: 'chat',
          userMessage: userText
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.result }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    setSavingAction(true);
    try {
      const { error } = await supabase
        .from('drafts')
        .update({ draft_type: 'Uploaded Document' })
        .eq('id', draftId);
        
      if (error) throw error;
      setDoc(prev => ({ ...prev, draft_type: 'Uploaded Document' }));
      alert('Saved to Library successfully.');
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddToMatter = async (matterId: string) => {
    setShowMatterSelect(false);
    setSavingAction(true);
    try {
      const { error } = await supabase
        .from('drafts')
        .update({ matter_id: matterId })
        .eq('id', draftId);
        
      if (error) throw error;
      setDoc(prev => ({ ...prev, matter_id: matterId }));
      alert('Added to matter successfully.');
    } catch (err: any) {
      alert('Failed to link to matter: ' + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const formatText = (text: string) => {
    // Basic markdown formatting
    return text.split('\\n').map((line, i) => {
      // Bold
      let formatted = line.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
      return (
        <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: formatted || '<br/>' }} />
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-cream/50">Loading Document...</div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-navy flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-card border border-border rounded-3xl max-w-sm mx-4">
            <h3 className="text-red-400 font-medium mb-2">Document Unavailable</h3>
            <p className="text-cream/50 text-sm mb-6">{error}</p>
            <button onClick={() => router.push('/upload')} className="px-6 py-2 rounded-full bg-card-elevated border border-border text-cream text-sm">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSaved = doc.draft_type === 'Uploaded Document';

  return (
    <div className="min-h-screen bg-navy flex flex-col pb-24">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-gold/10 text-gold border border-gold/20">
                Workspace
              </span>
              {isSaved && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  In Library
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl text-cream truncate">
              {doc.party1_name || 'Document Workspace'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setShowMatterSelect(!showMatterSelect)}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-card-elevated text-sm text-cream transition-colors relative"
              disabled={savingAction}
            >
              Add to Matter
              
              {showMatterSelect && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto">
                  <div className="px-4 py-2 text-xs font-semibold text-cream/50 uppercase tracking-wider">Select Matter</div>
                  {matters.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-cream/50">No active matters.</div>
                  ) : (
                    matters.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => handleAddToMatter(m.id)}
                        className="w-full text-left px-4 py-3 hover:bg-card-elevated text-sm text-cream truncate transition-colors"
                      >
                        {m.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </button>
            {!isSaved && (
              <button 
                onClick={handleSaveToLibrary}
                className="px-4 py-2 rounded-xl bg-gold text-navy font-medium text-sm hover:bg-gold/90 transition-colors"
                disabled={savingAction}
              >
                Save to Library
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border mb-6 overflow-x-auto hide-scrollbar">
          {(['overview', 'content', 'details'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-gold text-gold' 
                  : 'border-transparent text-cream/50 hover:text-cream/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {activeTab === 'overview' && (
              <>
                <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-cream font-medium text-lg mb-1">{doc.party1_name}</h3>
                    <p className="text-cream/50 text-sm">{doc.party2_name} • {doc.situation}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center border border-border">
                    <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                </div>

                {/* AI Result Area */}
                {aiAction && (
                  <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in relative">
                    <button 
                      onClick={() => setAiAction(null)}
                      className="absolute top-4 right-4 text-cream/40 hover:text-cream/80"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    
                    <h3 className="text-gold font-display text-xl capitalize mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      AI {aiAction}
                    </h3>
                    
                    {aiLoading ? (
                      <div className="py-8 flex flex-col items-center justify-center space-y-3">
                        <svg className="w-8 h-8 text-gold animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <span className="text-cream/50 text-sm animate-pulse">Analyzing document...</span>
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:text-cream/90 prose-headings:text-cream prose-strong:text-gold prose-ul:text-cream/80">
                        {formatText(aiResult)}
                        {aiAction === 'risks' && (
                          <div className="mt-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-cream/50">
                            <strong>Disclaimer:</strong> This is an AI-generated analysis of potential issues. It does not constitute definitive legal advice. Please review carefully.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Pre-existing Summary */}
                {!aiAction && doc.generated_draft && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-cream font-medium text-lg mb-4">Document Summary</h3>
                    <div className="text-sm text-cream/80 leading-relaxed whitespace-pre-wrap">
                      {doc.generated_draft}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'content' && (
              <div className="bg-card border border-border rounded-2xl p-2 h-[600px] overflow-hidden flex items-center justify-center">
                {pdfUrl ? (
                  <iframe src={pdfUrl} className="w-full h-full rounded-xl bg-white" title="Document Preview" />
                ) : (
                  <div className="text-cream/50 flex flex-col items-center">
                    <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Preview unavailable
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="text-cream font-medium text-lg mb-4">Document Details</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-cream/50">File Name</div>
                  <div className="text-cream text-right break-all">{doc.party1_name}</div>
                  
                  <div className="text-cream/50">Size</div>
                  <div className="text-cream text-right">{doc.party2_name}</div>
                  
                  <div className="text-cream/50">Type</div>
                  <div className="text-cream text-right">{doc.situation}</div>
                  
                  <div className="text-cream/50">Uploaded</div>
                  <div className="text-cream text-right">{new Date(doc.created_at).toLocaleString()}</div>
                  
                  <div className="text-cream/50">Matter Link</div>
                  <div className="text-cream text-right">{doc.matter_id ? (matters.find(m => m.id === doc.matter_id)?.title || 'Linked') : 'None'}</div>
                  
                  <div className="text-cream/50">Library Status</div>
                  <div className="text-cream text-right">{isSaved ? 'Saved' : 'Temporary'}</div>
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar - AI Actions */}
          <div className="space-y-4">
            
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-cream font-medium text-sm mb-4 uppercase tracking-wider">AI Capabilities</h3>
              
              <div className="space-y-2">
                {[
                  { id: 'summary', title: 'AI Summary', desc: 'Get a concise summary', icon: 'M4 6h16M4 12h16M4 18h7' },
                  { id: 'analyze', title: 'Analyze Document', desc: 'Understand obligations & structure', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                  { id: 'risks', title: 'Find Risks & Issues', desc: 'Identify unfavorable clauses', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                  { id: 'extract', title: 'Extract Key Information', desc: 'Parties, dates, amounts', icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' },
                ].map(action => (
                  <button 
                    key={action.id}
                    onClick={() => { setActiveTab('overview'); runAIAction(action.id as AIAction); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      aiAction === action.id 
                        ? 'bg-gold/10 border-gold/50 text-gold' 
                        : 'bg-navy border-border hover:border-gold/30 hover:bg-card-elevated text-cream'
                    }`}
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                    </svg>
                    <div>
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className={`text-[10px] ${aiAction === action.id ? 'text-gold/70' : 'text-cream/40'}`}>{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ask AI Trigger */}
            <button 
              onClick={() => setIsChatOpen(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-navy to-card border border-gold/30 hover:border-gold/60 transition-colors group shadow-lg shadow-gold/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <div className="text-left">
                  <div className="text-gold font-medium text-sm">Ask AI</div>
                  <div className="text-cream/50 text-[10px]">Chat with this document</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-gold group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
            </button>
            
            <div className="pt-2 text-center">
              <button 
                onClick={() => router.push('/generate')}
                className="text-xs text-cream/40 hover:text-gold transition-colors underline underline-offset-4"
              >
                Create new Draft from this Document
              </button>
            </div>
            
          </div>
        </div>
      </main>

      {/* Ask AI Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/80 backdrop-blur-sm sm:p-4">
          <div className="w-full sm:w-[400px] h-full bg-card sm:rounded-3xl border-l sm:border-y sm:border-r border-border shadow-2xl flex flex-col animate-slide-in-right">
            
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-navy/50 sm:rounded-t-3xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <h3 className="text-cream font-medium text-sm">Ask AI</h3>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 text-cream/50 hover:text-cream bg-card rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
              {chatMessages.length === 0 && (
                <div className="text-center mt-10 text-cream/40 text-sm px-6">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-30 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Ask any questions about <strong>{doc.party1_name}</strong>. The AI will answer based strictly on the document content.
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gold text-navy font-medium rounded-tr-sm' 
                      : 'bg-navy border border-border text-cream/90 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-navy border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-gold/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gold/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gold/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border bg-card sm:rounded-b-3xl">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask anything about this document..."
                  className="w-full bg-navy border border-border rounded-full pl-5 pr-12 py-3.5 text-sm text-cream focus:border-gold/50 outline-none transition-colors"
                  disabled={chatLoading}
                />
                <button 
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gold text-navy flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
