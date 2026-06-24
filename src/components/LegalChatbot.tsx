'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Volume2, VolumeX, Copy, Check, ThumbsUp, ThumbsDown,
  Menu, X, Plus, Mic, Send, MessageSquare, History, FileText, Search, Settings, FileUp, FileDown, ChevronDown, Sparkles, Star, PlusSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { downloadDraftPdf } from '../lib/exportDraftPdf';
import { buildChatTranscript, sendLegalChatMessage } from '../lib/legalChat';
import { readFileForChat } from '../lib/readChatFile';
import { stripMarkdown } from '../lib/stripMarkdown';

const WELCOME_PRO = 'Welcome! Pro Legal Assistant — unlimited messages, document upload, draft generation, and PDF export. How can I help?';

export default function LegalChatbot() {
  const router = useRouter();
  const { refreshAccount, profile } = useApp();
  
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [messageFeedback, setMessageFeedback] = useState({});
  
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [appFeedbackRating, setAppFeedbackRating] = useState(0);
  const [appFeedbackText, setAppFeedbackText] = useState('');
  const [appFeedbackSubmitted, setAppFeedbackSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const speechUtteranceRef = useRef(null);
  const copiedTimeoutRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const recognitionRef = useRef<any>(null);

  const getWelcomeMessage = () => ({
    id: 'welcome',
    role: 'assistant',
    content: WELCOME_PRO,
  });

  const resetChat = () => {
    setMessages([getWelcomeMessage()]);
    setInput('');
    setError(null);
    setPendingAttachment(null);
    setCopiedId(null);
    setMessageFeedback({});
    setSidebarOpen(false);
  };

  useEffect(() => {
    setMessages([getWelcomeMessage()]);
    const stored = localStorage.getItem('chatFeedback');
    if (stored) {
      try {
        setMessageFeedback(JSON.parse(stored));
      } catch {
        setMessageFeedback({});
      }
    }
    
    // Click outside handler for attachment menu
    const handleClickOutside = (e: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setAttachmentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('chatFeedback', JSON.stringify(messageFeedback));
  }, [messageFeedback]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please allow permissions.');
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFeedbackSubmit = () => {
    if (!appFeedbackRating && !appFeedbackText.trim()) return;
    // For now we simulate saving to Firebase.
    console.log('Feedback submitted:', { rating: appFeedbackRating, text: appFeedbackText });
    setAppFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackModalOpen(false);
      setAppFeedbackSubmitted(false);
      setAppFeedbackRating(0);
      setAppFeedbackText('');
    }, 2000);
  };

  const getSpeechLanguage = () => {
    const appLanguage = profile?.language || 'English';
    return appLanguage === 'Hindi' || appLanguage === 'Hinglish' ? 'hi-IN' : 'en-IN';
  };

  const stopSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    speechUtteranceRef.current = null;
    setActiveSpeechId(null);
  };

  const speakMessage = (msg) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (activeSpeechId === msg.id) {
      stopSpeech();
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(msg.content || '');
    utterance.lang = getSpeechLanguage();
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setActiveSpeechId(null);
    utterance.onerror = () => setActiveSpeechId(null);
    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setActiveSpeechId(msg.id);
  };

  const copyToClipboard = async (text, msgId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const toggleLike = (msgId) => {
    setMessageFeedback((prev) => {
      const current = prev[msgId] || null;
      const newFeedback = { ...prev };
      if (current === 'like') {
        delete newFeedback[msgId];
      } else {
        newFeedback[msgId] = 'like';
      }
      return newFeedback;
    });
  };

  const toggleDislike = (msgId) => {
    setMessageFeedback((prev) => {
      const current = prev[msgId] || null;
      const newFeedback = { ...prev };
      if (current === 'dislike') {
        delete newFeedback[msgId];
      } else {
        newFeedback[msgId] = 'dislike';
      }
      return newFeedback;
    });
  };

  const sendMessage = async ({
    text,
    attachment,
    draftMode = false,
  }: {
    text?: string;
    attachment?: any;
    draftMode?: boolean;
  }) => {
    const trimmed = text?.trim() || '';
    if (!trimmed && !attachment) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed || attachment?.textContent || 'Please analyze the attached document.',
      attachment: attachment?.inlineData
        ? { inlineData: attachment.inlineData, fileName: attachment.fileName }
        : null,
    };

    const historyForApi = [...messages.filter((m) => m.id !== 'welcome'), userMessage];
    
    // Optimistic update
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPendingAttachment(null);
    setError(null);
    setIsLoading(true);

    try {
      const reply = await sendLegalChatMessage(historyForApi, { isPro: true, draftMode });
      await refreshAccount();

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: stripMarkdown(reply),
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter(m => m.id !== userMessage.id));
      setInput(trimmed);
      setPendingAttachment(attachment);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (isLoading) return;
    sendMessage({
      text: input,
      attachment: pendingAttachment,
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setAttachmentMenuOpen(false);
    if (!file) return;

    try {
      const parsed = await readFileForChat(file);
      setPendingAttachment(parsed);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateDraft = () => {
    setAttachmentMenuOpen(false);
    sendMessage({
      text: 'Based on our entire conversation, generate a complete court-ready legal draft appropriate for this matter. Include all necessary parties, facts, legal grounds, and relief sought.',
      draftMode: true,
    });
  };

  const handleExportChatPdf = async () => {
    setAttachmentMenuOpen(false);
    const transcript = buildChatTranscript(messages);
    if (!transcript.trim()) return;
    try {
      await downloadDraftPdf(transcript, {
        draftType: 'Chat Conversation',
        party1Name: 'Chat Export',
      });
    } catch (err) {
      setError(err.message || 'PDF export failed');
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Check if we are showing the empty state
  const isEmptyState = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <>
      <div
        className={`fixed inset-0 w-screen h-dvh z-[200] bg-[#000000] overflow-y-auto overflow-x-hidden transition-opacity duration-300 ease-out font-sans flex flex-col
          ${isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'}`}
        role="dialog"
        aria-label="Neikx AI"
        aria-hidden={!isOpen}
      >
        {/* Sidebar Overlay */}
        {sidebarOpen && (
           <div 
             className="fixed inset-0 bg-black/60 z-[210] backdrop-blur-sm transition-opacity" 
             onClick={() => setSidebarOpen(false)} 
           />
        )}
        
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 w-72 bg-[#121212] z-[220] transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <h2 className="text-xl font-medium text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#a8b8d8]" /> Neikx AI
            </h2>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <button onClick={resetChat} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
              <MessageSquare className="w-5 h-5 text-white/70" />
              <span className="font-medium text-sm">New Chat</span>
            </button>
            <button onClick={() => { setSidebarOpen(false); router.push('/history'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
              <History className="w-5 h-5 text-white/70" />
              <span className="font-medium text-sm">Chat History</span>
            </button>
            <button onClick={() => { setSidebarOpen(false); router.push('/generate'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
              <FileText className="w-5 h-5 text-white/70" />
              <span className="font-medium text-sm">Draft Generator</span>
            </button>
            <button onClick={() => { setSidebarOpen(false); router.push('/research'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
              <Search className="w-5 h-5 text-white/70" />
              <span className="font-medium text-sm">Legal Research</span>
            </button>
          </div>
          
          <div className="p-4 border-t border-white/10">
            <button onClick={() => { setSidebarOpen(false); router.push('/profile'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
              <Settings className="w-5 h-5 text-white/70" />
              <span className="font-medium text-sm">Settings</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="shrink-0 px-4 py-3 flex items-center justify-between gap-2 bg-transparent z-[10]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-medium text-white tracking-tight">Neikx AI</h1>
              <div className="flex items-center gap-1 mt-0.5 text-white/50 cursor-pointer hover:text-white/80 transition-colors">
                <span className="text-[11px] font-medium tracking-wide">Gemini 2.5 Flash</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
              title="Leave Feedback"
            >
              <Star className="w-5 h-5" />
            </button>
            <button
              onClick={resetChat}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
              title="New Chat"
            >
              <PlusSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="px-4 sm:px-8 relative z-[5] w-full max-w-4xl mx-auto flex-1 min-h-[60vh] flex flex-col justify-end">
          {isEmptyState ? (
            <div className="h-full flex flex-col items-center justify-center -mt-10 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1c3065] to-[#08122e] flex items-center justify-center shadow-[0_0_40px_rgba(28,48,101,0.5)] mb-8">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-12">Where should we start?</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                {[
                  { title: 'Draft a legal notice', desc: 'Create a formal notice for a dispute', icon: <FileText className="w-5 h-5 text-[#a8b8d8]" /> },
                  { title: 'Review a contract', desc: 'Analyze an agreement for risks', icon: <Search className="w-5 h-5 text-[#a8b8d8]" /> },
                  { title: 'Research case laws', desc: 'Find precedents for your matter', icon: <History className="w-5 h-5 text-[#a8b8d8]" /> },
                  { title: 'Analyze a document', desc: 'Upload a file for summary', icon: <FileUp className="w-5 h-5 text-[#a8b8d8]" /> }
                ].map((chip, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(chip.title)}
                    className="flex flex-col items-start p-4 bg-[#1e1e1e]/50 hover:bg-[#1e1e1e] border border-white/5 rounded-2xl transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                        {chip.icon}
                      </div>
                      <span className="font-medium text-white/90">{chip.title}</span>
                    </div>
                    <span className="text-sm text-white/50">{chip.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-6 space-y-2 pb-6">
              {messages.filter(m => m.id !== 'welcome').map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end mb-6' : 'justify-start flex-col mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-3 mb-3">
                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1c3065] to-[#08122e] flex items-center justify-center shadow-sm shrink-0">
                         <Sparkles className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-medium text-white/90">Neikx AI</span>
                    </div>
                  )}

                  <div
                    className={`${
                      msg.role === 'user'
                        ? 'max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap bg-[#1e1e1e] text-white rounded-3xl rounded-br-sm'
                        : 'w-full pl-11 pr-4 text-[15px] leading-relaxed whitespace-pre-wrap text-white/90'
                    }`}
                  >
                    {msg.attachment?.fileName && (
                      <div className={`flex items-center gap-2 text-xs text-white/60 bg-white/5 p-2 rounded-lg mb-2 ${msg.role === 'assistant' ? 'w-fit' : ''}`}>
                        <FileText className="w-4 h-4" />
                        <span className="truncate">{msg.attachment.fileName}</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-3 pl-10 text-white/40">
                      <button onClick={() => copyToClipboard(msg.content, msg.id)} className="p-1.5 rounded-full transition-all hover:text-white hover:bg-white/10" title="Copy">
                        {copiedId === msg.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => speakMessage(msg)} className="p-1.5 rounded-full transition-all hover:text-white hover:bg-white/10" title="Read Aloud">
                        {activeSpeechId === msg.id ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <button onClick={() => toggleLike(msg.id)} className={`p-1.5 rounded-full transition-all ${messageFeedback[msg.id] === 'like' ? 'text-white' : 'hover:text-white hover:bg-white/10'}`}>
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleDislike(msg.id)} className={`p-1.5 rounded-full transition-all ${messageFeedback[msg.id] === 'dislike' ? 'text-white' : 'hover:text-white hover:bg-white/10'}`}>
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start flex-col mb-8 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1c3065] to-[#08122e] flex items-center justify-center shadow-sm shrink-0">
                       <Sparkles className="w-4 h-4 text-white animate-pulse" />
                     </div>
                     <span className="text-sm font-medium text-white/90">Neikx AI is thinking...</span>
                  </div>
                  <div className="pl-11">
                    <div className="flex gap-1.5 items-center py-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/40 animate-pulse" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/40 animate-pulse delay-150" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/40 animate-pulse delay-300" />
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <p className="text-red-400/90 text-sm text-center bg-red-400/10 border border-red-400/20 rounded-2xl px-4 py-3 mx-auto max-w-md">
                  {error}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="sticky bottom-0 bg-gradient-to-t from-[#000000] via-[#000000]/95 to-transparent pt-8 pb-6 w-full z-[20]">
          <div className="max-w-4xl mx-auto px-4 sm:px-8">
          {pendingAttachment && (
            <div className="mb-2 px-4 py-2 bg-[#1e1e1e]/80 backdrop-blur-md rounded-2xl flex items-center justify-between gap-3 text-sm text-white/80 border border-white/5 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-white/50 shrink-0" />
                <span className="truncate">{pendingAttachment.fileName}</span>
              </div>
              <button onClick={() => setPendingAttachment(null)} className="text-white/40 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="relative" ref={attachmentMenuRef}>
            {/* Attachment Popover Menu */}
            {attachmentMenuOpen && (
              <div className="absolute bottom-[calc(100%+12px)] left-0 w-56 bg-[#1e1e1e] border border-white/10 rounded-3xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/90 hover:bg-white/10 rounded-2xl transition-colors">
                  <FileUp className="w-4 h-4 text-white/50" />
                  Upload File
                </button>
                <button onClick={handleGenerateDraft} disabled={isLoading} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/90 hover:bg-white/10 rounded-2xl transition-colors disabled:opacity-50">
                  <FileText className="w-4 h-4 text-white/50" />
                  Generate Draft
                </button>
                <button onClick={handleExportChatPdf} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/90 hover:bg-white/10 rounded-2xl transition-colors">
                  <FileDown className="w-4 h-4 text-white/50" />
                  Export to PDF
                </button>
              </div>
            )}

            {/* Input Pill Container */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 p-2 bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-full shadow-2xl focus-within:bg-white/10 focus-within:border-white/20 transition-all duration-300"
            >
              <button
                type="button"
                onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Neikx AI"
                disabled={isLoading}
                className="flex-1 bg-transparent border-none text-white placeholder:text-white/40 focus:ring-0 text-[15px] py-3 px-2 min-w-0"
                autoComplete="off"
              />
              
              <div className="flex items-center gap-1 shrink-0 pr-1">
                {input.trim() || pendingAttachment ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                      isListening ? 'text-red-400 bg-red-400/10 animate-pulse' : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        </div>
      </div>

      {/* FAB Trigger */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed z-50 bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-[#08122e] border border-white/20 text-white hover:scale-105 hover:bg-[#0c1a40]"
          aria-label="Open Neikx AI"
          aria-expanded={isOpen}
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Feedback Modal */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-medium text-white mb-4">Leave Feedback</h3>
            {appFeedbackSubmitted ? (
              <div className="text-center py-8 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-white/90">Thank you for your feedback!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 justify-center py-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setAppFeedbackRating(star)}
                      className={`p-2 transition-transform hover:scale-110 ${appFeedbackRating >= star ? 'text-yellow-400' : 'text-white/20'}`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
                <textarea
                  value={appFeedbackText}
                  onChange={e => setAppFeedbackText(e.target.value)}
                  placeholder="Tell us what you think..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 min-h-[100px] resize-none"
                />
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setFeedbackModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-white/70 hover:bg-white/10 transition-colors font-medium">
                    Cancel
                  </button>
                  <button onClick={handleFeedbackSubmit} disabled={!appFeedbackRating && !appFeedbackText.trim()} className="flex-1 py-3 px-4 rounded-xl bg-white text-black hover:bg-white/90 transition-colors font-medium disabled:opacity-50">
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
