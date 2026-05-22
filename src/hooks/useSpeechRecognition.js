import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function languageToSpeechCode(language) {
  if (language === 'Hindi' || language === 'Hinglish') return 'hi-IN';
  return 'en-IN';
}

/**
 * Web Speech API hook for Chrome / mobile Chrome.
 * @param {object} options
 * @param {string} options.lang - BCP-47 language tag
 * @param {(text: string) => void} options.onTextChange - called with full composed text while listening
 * @param {() => string} options.getBaseText - snapshot when recording starts
 */
export function useSpeechRecognition({ lang = 'en-IN', onTextChange, getBaseText }) {
  const RecognitionCtor = useMemo(() => getRecognitionCtor(), []);
  const supported = Boolean(RecognitionCtor);

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const sessionFinalRef = useRef('');

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (!RecognitionCtor) return;

    setError(null);
    sessionFinalRef.current = '';

    let base = getBaseText?.() ?? '';
    if (base && !/\s$/.test(base)) base += ' ';

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) {
          sessionFinalRef.current += transcript;
        } else {
          interim += transcript;
        }
      }
      onTextChange?.(base + sessionFinalRef.current + interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      setError(event.error === 'not-allowed' ? 'Microphone permission denied' : 'Speech recognition failed');
      stop();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setError('Could not start microphone');
      setIsListening(false);
    }
  }, [RecognitionCtor, lang, onTextChange, getBaseText, stop]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { supported, isListening, toggle, stop, error };
}
