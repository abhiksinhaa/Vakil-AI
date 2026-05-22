import { useCallback, useRef } from 'react';
import { languageToSpeechCode, useSpeechRecognition } from '../hooks/useSpeechRecognition';

function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-1 4.5V19h3v2H7v-2h3v-3.5a7.04 7.04 0 01-2-.5v1.2a5 5 0 0010 0v-1.2a7.04 7.04 0 01-2 .5z" />
    </svg>
  );
}

export default function FactsTextareaWithMic({
  id = 'situation',
  value,
  onChange,
  language = 'English',
  placeholder,
  required,
  rows = 5,
}) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const handleTextChange = useCallback(
    (text) => {
      onChange(text);
    },
    [onChange]
  );

  const getBaseText = useCallback(() => valueRef.current, []);

  const { supported, isListening, toggle, error } = useSpeechRecognition({
    lang: languageToSpeechCode(language),
    onTextChange: handleTextChange,
    getBaseText,
  });

  return (
    <div>
      <div className="relative">
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="min-h-[5rem] pr-12 pb-11 resize-y"
        />
        {supported && (
          <button
            type="button"
            onClick={toggle}
            className={`absolute bottom-2.5 right-2.5 p-2 rounded-lg border transition-colors ${
              isListening
                ? 'border-red-400/60 text-red-500 bg-red-500/15 animate-pulse'
                : 'border-gold/40 text-gold bg-gold/5 hover:bg-gold/15 hover:border-gold/60'
            }`}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            title={isListening ? 'Stop recording' : 'Speak facts'}
          >
            <MicIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      {isListening && (
        <p className="text-xs text-red-400/90 mt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Listening… tap mic to stop
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400/90 mt-1.5">{error}</p>
      )}
    </div>
  );
}
