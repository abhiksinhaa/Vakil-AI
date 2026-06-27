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
import { saveChatSession, fetchChatHistory, type ChatSession } from '../lib/firestore';
import LiveVoiceMode from './LiveVoiceMode';
import NeikxSettingsPanel from './NeikxSettingsPanel';

const WELCOME_PRO = 'Welcome! Pro Legal Assistant — unlimited messages, document upload, draft generation, and PDF export. How can I help?';

export default function LegalChatbot() {
  const router = useRouter();
  const { refreshAccount, profile, session } = useApp();
  
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
  const [isLiveModeOpen, setIsLiveModeOpen] = useState(false);
  
  const [sessionId, setSessionId] = useState(`chat-${Date.now()}`);
  const [historyList, setHistoryList] = useState<ChatSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showNeikxSettings, setShowNeikxSettings] = useState(false);
  
  const [position, setPosition] = useState<{x: number, y: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, lastPos: null as {x: number, y: number} | null });
  const fabRef = useRef<HTMLButtonElement>(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const speechUtteranceRef = useRef(null);
  const copiedTimeoutRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getWelcomeMessage = () => ({
    id: 'welcome',
    role: 'assistant',
    content: WELCOME_PRO,
  });

  const getBoundedPosition = (x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const buttonSize = 56; // 14 * 4 = 56px
    const padding = 16;
    let newX = x;
    let newY = y;
    if (newX < padding) newX = padding;
    if (newX > window.innerWidth - buttonSize - padding) newX = window.innerWidth - buttonSize - padding;
    if (newY < padding) newY = padding;
    if (newY > window.innerHeight - buttonSize - padding) newY = window.innerHeight - buttonSize - padding;
    return { x: newX, y: newY };
  };

  useEffect(() => {
    const savedPos = sessionStorage.getItem('neikx_fab_pos');
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        setPosition(getBoundedPosition(parsed.x, parsed.y));
      } catch (e) {}
    }

    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return prev;
        return getBoundedPosition(prev.x, prev.y);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(false);
    
    let currentX = position?.x;
    let currentY = position?.y;
    if (currentX === undefined || currentY === undefined) {
      if (fabRef.current) {
        const rect = fabRef.current.getBoundingClientRect();
        currentX = rect.left;
        currentY = rect.top;
      } else {
        currentX = window.innerWidth - 80;
        currentY = window.innerHeight - 80;
      }
    }
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      lastPos: position
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      setIsDragging(true);
    }
    
    if (!isDragging) return;
    
    e.preventDefault();
    const newPos = getBoundedPosition(
      dragRef.current.initialX + dx,
      dragRef.current.initialY + dy
    );

    setPosition(newPos);
    dragRef.current.lastPos = newPos;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      e.preventDefault();
      const finalPos = dragRef.current.lastPos || position;
      if (finalPos) {
        sessionStorage.setItem('neikx_fab_pos', JSON.stringify(finalPos));
      }
    } else {
      setIsOpen(true);
    }
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const resetChat = () => {
    setMessages([getWelcomeMessage()]);
    setSessionId(`chat-${Date.now()}`);
    setInput('');
    setError(null);
    setPendingAttachment(null);
    setCopiedId(null);
    setMessageFeedback({});
    setSidebarOpen(false);
    setShowHistoryPanel(false);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      if (!session?.user?.id) {
        console.error('Cannot load chat history: not authenticated');
        setHistoryList([]);
        return;
      }
      const hist = await fetchChatHistory();
      setHistoryList(hist);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadChatSession = (session: ChatSession) => {
    setMessages(session.messages && session.messages.length ? session.messages : [getWelcomeMessage()]);
    setSessionId(session.id);
    setSidebarOpen(false);
    setShowHistoryPanel(false);
  };

  useEffect(() => {
    if (messages.length > 1 && profile?.save_chat_history !== false) {
      saveChatSession(sessionId, messages).catch(console.error);
    }
  }, [messages, sessionId, profile?.save_chat_history]);

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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed || attachment?.textContent || 'Please analyze the attached document.',
      attachment: attachment?.inlineData
        ? { inlineData: attachment.inlineData, fileName: attachment.fileName }
        : null,
    };

    let currentMessages = messages;
    if (attachment?.inlineData) {
      currentMessages = messages.map(m => {
        if (m.attachment?.inlineData) {
          return {
            ...m,
            attachment: { fileName: m.attachment.fileName }
          };
        }
        return m;
      });
    }

    const historyForApi = [...currentMessages.filter((m) => m.id !== 'welcome'), userMessage];
    
    // Optimistic update
    setMessages([...currentMessages, userMessage]);
    setInput('');
    setPendingAttachment(null);
    setError(null);
    setIsLoading(true);

    try {
      const reply = await sendLegalChatMessage(historyForApi, { 
        isPro: true, 
        draftMode,
        signal: abortController.signal,
        profile
      });
      
      if (abortController.signal.aborted) return;
      
      await refreshAccount();

      setMessages((prev) => [
        ...prev.map(m => m.id === userMessage.id ? {
          ...m, 
          attachment: m.attachment ? { fileName: m.attachment.fileName } : null
        } : m),
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: stripMarkdown(reply),
        },
      ]);
      return stripMarkdown(reply);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      setMessages((prev) => prev.filter(m => m.id !== userMessage.id));
      setInput(trimmed);
      setPendingAttachment(attachment);
      setError(err.message || 'Something went wrong. Please try again.');
      throw err;
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
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

  const PREMIUM_ANIMATIONS = `
    @keyframes breath-glow {
      0%, 100% { filter: drop-shadow(0 0 6px rgba(168, 184, 216, 0.3)); }
      50% { filter: drop-shadow(0 0 14px rgba(168, 184, 216, 0.7)); }
    }
    @keyframes gentle-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @keyframes light-sweep {
      0% { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    @keyframes sparkle-twinkle {
      0%, 100% { opacity: 0; transform: scale(0.5); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    .animate-breath-glow { animation: breath-glow 3s ease-in-out infinite; }
    .animate-gentle-float { animation: gentle-float 4s ease-in-out infinite; }
    .animate-light-sweep {
      background: linear-gradient(90deg, #ffffff 0%, #a8b8d8 25%, #ffffff 50%, #a8b8d8 75%, #ffffff 100%);
      background-size: 200% auto;
      color: transparent;
      background-clip: text;
      -webkit-background-clip: text;
      animation: light-sweep 4s linear infinite;
    }
    .sparkle-particle {
      position: absolute;
      animation: sparkle-twinkle 2s ease-in-out infinite;
      color: #ffffff;
    }
  `;

  return (
    <>
      <style>{PREMIUM_ANIMATIONS}</style>
      <div
        className={`fixed inset-0 w-screen h-dvh z-[200] bg-[#000000] overflow-hidden transition-opacity duration-300 ease-out font-sans flex flex-col
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
            {!showHistoryPanel && !showNeikxSettings ? (
              <>
                <button onClick={resetChat} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
                  <MessageSquare className="w-5 h-5 text-white/70" />
                  <span className="font-medium text-sm">New Chat</span>
                </button>
                <button onClick={() => { setShowHistoryPanel(true); loadHistory(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
                  <History className="w-5 h-5 text-white/70" />
                  <span className="font-medium text-sm">Chat History</span>
                </button>
                <button onClick={() => { setSidebarOpen(false); setIsOpen(false); router.push('/generate'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
                  <FileText className="w-5 h-5 text-white/70" />
                  <span className="font-medium text-sm">Draft Generator</span>
                </button>
                <button onClick={() => { setSidebarOpen(false); setIsOpen(false); router.push('/research'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
                  <Search className="w-5 h-5 text-white/70" />
                  <span className="font-medium text-sm">Legal Research</span>
                </button>
              </>
            ) : showNeikxSettings ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button onClick={() => setShowNeikxSettings(false)} className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left border border-white/10">
                  <ChevronDown className="w-5 h-5 rotate-90 text-white/70" />
                  <span className="font-medium text-sm">Back</span>
                </button>
                <NeikxSettingsPanel onClose={() => setShowNeikxSettings(false)} />
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button onClick={() => setShowHistoryPanel(false)} className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left border border-white/10">
                  <ChevronDown className="w-5 h-5 rotate-90 text-white/70" />
                  <span className="font-medium text-sm">Back</span>
                </button>
                {historyLoading ? (
                  <div className="py-8 flex justify-center"><span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin block" /></div>
                ) : historyList.length === 0 ? (
                  <div className="py-8 text-center text-sm text-white/50">No previous chats found.</div>
                ) : (
                  <div className="space-y-1">
                    {historyList.map(session => (
                      <button key={session.id} onClick={() => loadChatSession(session)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 transition-colors group">
                        <div className="text-sm text-white/90 truncate">{session.preview}</div>
                        <div className="text-xs text-white/40 mt-1">{new Date(session.updatedAt).toLocaleDateString()}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-white/10">
            <button onClick={() => { setShowNeikxSettings(true); setShowHistoryPanel(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-white/90 text-left">
              <Settings className="w-5 h-5 text-white/70" />
              <span className="font-medium text-sm">Settings</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="shrink-0 px-4 pt-8 pb-3 flex items-center justify-between gap-2 bg-transparent z-[10]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 relative z-10"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative animate-gentle-float animate-breath-glow py-1 px-2 cursor-pointer pointer-events-none">
              <Sparkles className="sparkle-particle w-2 h-2 top-0 left-0" style={{ animationDelay: '0s' }} />
              <Sparkles className="sparkle-particle w-3 h-3 bottom-0 right-0" style={{ animationDelay: '1s' }} />
              <Sparkles className="sparkle-particle w-1.5 h-1.5 top-1/2 -right-2" style={{ animationDelay: '0.5s' }} />
              <h1 className="text-xl font-bold tracking-tight animate-light-sweep drop-shadow-md">Neikx AI</h1>
              <div className="flex items-center gap-1 mt-0.5 text-white/50 pointer-events-auto">
                <span className="text-[11px] font-medium tracking-wide">AI Legal Assistant</span>
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 min-h-0 relative z-[5] w-full max-w-4xl mx-auto scroll-smooth">
          {isEmptyState ? (
            <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1c3065] to-[#08122e] flex items-center justify-center shadow-[0_0_40px_rgba(28,48,101,0.5)] mb-8">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-12">Where should we start?</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                {[
                  { title: 'Draft a legal notice', desc: 'Create a formal notice for a dispute', icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#a8b8d8]" /> },
                  { title: 'Review a contract', desc: 'Analyze an agreement for risks', icon: <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#a8b8d8]" /> },
                  { title: 'Research case laws', desc: 'Find precedents for your matter', icon: <History className="w-4 h-4 sm:w-5 sm:h-5 text-[#a8b8d8]" /> },
                  { title: 'Analyze a document', desc: 'Upload a file for summary', icon: <FileUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#a8b8d8]" /> }
                ].map((chip, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(chip.title)}
                    className="flex flex-col items-start p-3 sm:p-4 bg-[#1e1e1e]/50 hover:bg-[#1e1e1e] border border-white/5 rounded-[1rem] sm:rounded-2xl transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg sm:rounded-xl group-hover:bg-white/10 transition-colors">
                        {chip.icon}
                      </div>
                      <span className="font-medium text-white/90 text-sm sm:text-base">{chip.title}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-white/50 line-clamp-1">{chip.desc}</span>
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
        <div className="shrink-0 w-full max-w-4xl mx-auto px-4 sm:px-8 pb-6 pt-2 z-[20]">
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
                  <>
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                        isListening ? 'text-red-400 bg-red-400/10 animate-pulse' : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                      title="Voice Typing"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLiveModeOpen(true)}
                      className="w-10 h-10 flex items-center justify-center rounded-full transition-all relative group text-[#a8b8d8] hover:text-white hover:bg-white/10"
                      title="Neikx Live Voice Mode"
                    >
                      <div className="absolute inset-0 bg-[#a8b8d8]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                      <Sparkles className="w-5 h-5 relative z-10" />
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* FAB Trigger */}
      {!isOpen && (
        <button
          ref={fabRef}
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={position ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' } : {}}
          className={`fixed z-50 bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center touch-none transition-[background-color,transform] duration-300 bg-[#08122e] border border-white/20 text-white ${isDragging ? 'scale-110 cursor-grabbing bg-[#0c1a40]' : 'hover:scale-105 hover:bg-[#0c1a40] cursor-grab'}`}
          aria-label="Open Neikx AI"
          aria-expanded={isOpen}
        >
          <Sparkles className="w-6 h-6 pointer-events-none" />
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

      {/* Live Voice Mode Overlay */}
      <LiveVoiceMode
        isOpen={isLiveModeOpen}
        onClose={() => setIsLiveModeOpen(false)}
        onSendMessage={(payload) => sendMessage(payload)}
      />
    </>
  );
}
