import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const { isPro, refreshAccount } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: isPro ? WELCOME_PRO : WELCOME_FREE,
      },
    ]);
  }, [isPro]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading, isPro]);

  const sendMessage = async ({ text, attachment, draftMode = false }) => {
    const trimmed = text?.trim() || '';
    if (!trimmed && !attachment) return;

    if (attachment && !isPro) {
      setError('Document upload is a Pro feature. Upgrade to analyze PDFs and files.');
      return;
    }

    if (draftMode && !isPro) {
      setError('Generate draft from chat is a Pro feature.');
      return;
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
      const reply = await sendLegalChatMessage(historyForApi, { isPro, draftMode });
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

    if (!isPro) {
      setError('Document upload is Pro only. Upgrade to upload PDFs for analysis.');
      return;
    }

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
    if (!isPro) {
      setError('Chat PDF export is a Pro feature.');
      return;
    }
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
        className={`fixed inset-0 w-screen h-screen z-[200] flex flex-col bg-navy overflow-hidden transition-all duration-300 ease-out
          ${isOpen
            ? 'opacity-100 pointer-events-auto scale-100'
            : 'opacity-0 pointer-events-none scale-95'}`}
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
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-cream/50 hover:text-cream text-3xl leading-none p-2 shrink-0 rounded-lg hover:bg-gold/10 transition-colors"
            aria-label="Close chat"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-navy/40 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gold text-navy rounded-br-md'
                    : 'bg-card border border-border text-cream/90 rounded-bl-md'
                }`}
              >
                {msg.attachment?.fileName && (
                  <p className="text-xs opacity-80 mb-1 font-medium">📎 {msg.attachment.fileName}</p>
                )}
                {msg.content}
              </div>
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

        <div className="shrink-0 border-t border-border bg-card px-2 pt-2 flex flex-wrap gap-1">
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
          className="shrink-0 border-t border-border bg-card p-3 flex gap-2"
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
