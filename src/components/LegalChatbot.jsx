import { useEffect, useRef, useState } from 'react';
import { sendLegalChatMessage } from '../lib/legalChat';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Namaste! Main aapka Draftee Legal Assistant hoon. BNS, BNSS, BSA, court procedure, consumer rights, ya koi bhi legal sawaal — poochho.',
};

function LogoMark({ className = '', inverted = false }) {
  return (
    <span className={`font-display font-semibold ${className}`}>
      Draft
      <span className={inverted ? 'text-navy/80' : 'text-cream'}>ee</span>
    </span>
  );
}

export default function LegalChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const historyForApi = [...messages.filter((m) => m.id !== 'welcome'), userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const reply = await sendLegalChatMessage(historyForApi);
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: reply },
      ]);
    } catch (err) {
      setError(err.message || 'Kuch galat ho gaya. Dobara try karo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed z-50 flex flex-col bg-card border border-border shadow-2xl overflow-hidden transition-all duration-300 ease-out
          ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'}
          inset-x-3 bottom-20 max-h-[min(85vh,560px)]
          sm:inset-x-auto sm:left-6 sm:right-auto sm:bottom-24 sm:w-[min(calc(100vw-3rem),400px)] sm:max-h-[min(70vh,560px)]
          rounded-2xl`}
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
                Draftee Legal Assistant
              </h2>
            </div>
            <p className="text-cream/50 text-xs mt-1 ml-10">Ask any legal question</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-cream/50 hover:text-cream text-xl leading-none p-1 shrink-0"
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
            </p>
          )}

          <div ref={messagesEndRef} />
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
            disabled={isLoading || !input.trim()}
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

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`fixed z-50 bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 border-2
          ${isOpen
            ? 'bg-card border-gold text-gold scale-95'
            : 'bg-gold border-gold text-navy hover:scale-105 hover:shadow-gold/20'}`}
        aria-label={isOpen ? 'Close legal assistant' : 'Open legal assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>
    </>
  );
}
