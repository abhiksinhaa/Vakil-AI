import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Star, Volume2, VolumeX, Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { downloadDraftPdf } from '../lib/exportDraftPdf';
import { buildChatTranscript, sendLegalChatMessage } from '../lib/legalChat';
import { readFileForChat } from '../lib/readChatFile';
import { stripMarkdown } from '../lib/stripMarkdown';
import {
  PRO_PRICE_INR,
} from '../lib/userAccount';

const WELCOME_FREE =
  'Welcome! I am your Draftee Legal Assistant. Ask about BNS, BNSS, BSA, or court procedure.';

const WELCOME_PRO =
  'Welcome! Pro Legal Assistant — unlimited messages, document upload, draft generation, and PDF export. How can I help?';

function LogoMark({ className = '', inverted = false }) {
  return (
    <span className={`font-display font-semibold ${className}`}>
      Draft
      <span className={inverted ? 'text-navy/80' : 'text-cream'}>ee</span>
    </span>
  );
}

function ProOnlyButton({ isPro, onClick, children, className = '', disabled }) {
  if (isPro) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link
      to="/pricing"
      state={{ chatLimitReached: false }}
      className={`${className} opacity-50 cursor-not-allowed`}
      title={`Pro only — ₹${PRO_PRICE_INR}/month`}
    >
      {children}
    </Link>
  );
}

export default function LegalChatbot() {
  const { refreshAccount, profile } = useApp();
  const isPro = true;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [messageFeedback, setMessageFeedback] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const speechUtteranceRef = useRef(null);
  const copiedTimeoutRef = useRef(null);

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
    setFeedbackOpen(false);
    setFeedbackRating(0);
    setFeedbackSubmitted(false);
    setCopiedId(null);
    setMessageFeedback({});
  };

  const handleFeedbackSelect = (value) => {
    setFeedbackRating(value);
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackOpen(false);
      setFeedbackSubmitted(false);
      setFeedbackRating(0);
    }, 2000);
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

  const sendMessage = async ({ text, attachment, draftMode = false }) => {
    const trimmed = text?.trim() || '';
    if (!trimmed && !attachment) return;

    if (attachment) {
      // all users can upload attachments in chat
    }

    if (draftMode) {
      // all users can generate drafts in chat
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed || attachment?.textContent || 'Please analyze the attached document.',
      attachment: attachment?.inlineData
        ? { inlineData: attachment.inlineData, fileName: attachment.fileName }
        : null,
    };

    const historyForApi = [...messages.filter((m) => m.id !== 'welcome'), userMessage];
    
    // Optimistic update: clear input and show message immediately
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
      // Revert optimistic update on error
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
    if (!file) return;

    // all users can upload files for chat analysis

    try {
      const parsed = await readFileForChat(file);
      setPendingAttachment(parsed);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateDraft = () => {
    sendMessage({
      text: 'Based on our entire conversation, generate a complete court-ready legal draft appropriate for this matter. Include all necessary parties, facts, legal grounds, and relief sought.',
      draftMode: true,
    });
  };

  const handleExportChatPdf = async () => {
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

  return (
    <>
      <div
        className={`fixed inset-0 w-screen h-dvh z-[200] flex flex-col bg-navy overflow-hidden transition-opacity duration-300 ease-out
          ${isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'}`}
        role="dialog"
        aria-label="Draftee Legal Assistant"
        aria-hidden={!isOpen}
      >
        <header className="shrink-0 bg-navy border-b border-border px-4 py-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
                <LogoMark className="text-sm text-gold" inverted />
              </div>
              <h2 className="font-display text-base text-cream leading-tight truncate">
                Legal Assistant
                {isPro && (
                  <span className="ml-1.5 text-[10px] uppercase text-gold font-body">Pro</span>
                )}
              </h2>
            </div>
            <p className="text-cream/50 text-xs mt-1 ml-10">
              {isPro
                ? 'Unlimited · Upload · Drafts · PDF'
                : 'Ask any legal question'}
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFeedbackOpen((open) => !open)}
              className="text-cream/50 hover:text-cream text-3xl leading-none p-2 shrink-0 rounded-lg hover:bg-gold/10 transition-colors"
              aria-label="Feedback"
            >
              <Star className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={resetChat}
              className="text-cream/50 hover:text-cream text-3xl leading-none p-2 shrink-0 rounded-lg hover:bg-gold/10 transition-colors"
              aria-label="Reload chat"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-cream/50 hover:text-cream text-3xl leading-none p-2 shrink-0 rounded-lg hover:bg-gold/10 transition-colors"
              aria-label="Close chat"
            >
              ×
            </button>

            {feedbackOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border bg-card p-3 shadow-xl z-20">
                {feedbackSubmitted ? (
                  <p className="text-cream text-sm">Thank you for feedback!</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-cream text-sm font-medium">Rate your experience</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleFeedbackSelect(value)}
                          className={`text-2xl ${value <= feedbackRating ? 'text-gold' : 'text-cream/50'} hover:text-gold transition-colors`}
                          aria-label={`${value} star`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-3 bg-navy/40 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start flex-col'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 pr-10 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gold text-navy rounded-br-md'
                    : 'bg-card border border-border text-cream/90 rounded-bl-md'
                } relative`}
              >
                {msg.attachment?.fileName && (
                  <p className="text-xs opacity-80 mb-1 font-medium">📎 {msg.attachment.fileName}</p>
                )}
                {msg.content}
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => speakMessage(msg)}
                    className="absolute top-2 right-2 p-1 rounded-full text-gold/70 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/30 transition-colors"
                    aria-label={activeSpeechId === msg.id ? 'Stop voice' : 'Read aloud'}
                  >
                    {activeSpeechId === msg.id ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mt-2 ml-1 text-cream/60">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className="p-1 rounded transition-all hover:text-cream/90 hover:bg-navy/40"
                    aria-label="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLike(msg.id)}
                    className={`p-1 rounded transition-all ${
                      messageFeedback[msg.id] === 'like'
                        ? 'text-gold'
                        : 'hover:text-cream/90 hover:bg-navy/40'
                    }`}
                    aria-label="Like message"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDislike(msg.id)}
                    className={`p-1 rounded transition-all ${
                      messageFeedback[msg.id] === 'dislike'
                        ? 'text-red-400'
                        : 'hover:text-cream/90 hover:bg-navy/40'
                    }`}
                    aria-label="Dislike message"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-gold/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400/90 text-xs text-center bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
              {error.includes('Pro') && (
                <>
                  {' '}
                  <Link to="/pricing" className="text-gold underline">
                    View plans
                  </Link>
                </>
              )}
            </p>
          )}

          <div ref={messagesEndRef} />
        </div>

        {pendingAttachment && (
          <div className="shrink-0 px-3 py-2 border-t border-border bg-navy/30 flex items-center justify-between gap-2 text-xs">
            <span className="text-cream/70 truncate">📎 {pendingAttachment.fileName}</span>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="text-cream/50 hover:text-cream shrink-0"
            >
              Remove
            </button>
          </div>
        )}

        <div className="shrink-0 border-t border-border bg-card px-2 pt-2 pb-2 flex flex-wrap gap-1">
          <ProOnlyButton
            isPro={isPro}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-2 py-1 rounded border border-border text-cream/70 hover:border-gold/40 hover:text-gold"
          >
            📎 Upload
          </ProOnlyButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="hidden"
            onChange={handleFileSelect}
          />
          <ProOnlyButton
            isPro={isPro}
            onClick={handleGenerateDraft}
            disabled={isLoading}
            className="text-xs px-2 py-1 rounded border border-border text-cream/70 hover:border-gold/40 hover:text-gold disabled:opacity-50"
          >
            Generate draft
          </ProOnlyButton>
          <ProOnlyButton
            isPro={isPro}
            onClick={handleExportChatPdf}
            className="text-xs px-2 py-1 rounded border border-border text-cream/70 hover:border-gold/40 hover:text-gold"
          >
            Chat PDF
          </ProOnlyButton>
        </div>

        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-border bg-card p-3 flex gap-2 relative z-10"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a legal question..."
            disabled={isLoading}
            className="flex-1 text-sm py-2.5"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !pendingAttachment)}
            className="btn-primary px-4 py-2.5 shrink-0"
            aria-label="Send message"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin block" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </form>
      </div>

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed z-50 bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 border-2 bg-gold border-gold text-navy hover:scale-105 hover:shadow-gold/20"
          aria-label="Open legal assistant"
          aria-expanded={isOpen}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}
    </>
  );
}
