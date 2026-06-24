'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MicOff, Mic, Pause, Play, Square, Settings, Sparkles, ChevronDown } from 'lucide-react';

interface LiveVoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<string>;
}

type LiveState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';
type VoicePreference = 'female' | 'male';

export default function LiveVoiceMode({ isOpen, onClose, onSendMessage }: LiveVoiceModeProps) {
  const [liveState, setLiveState] = useState<LiveState>('idle');
  const [transcript, setTranscript] = useState('');
  const [sessionTime, setSessionTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [voicePreference, setVoicePreference] = useState<VoicePreference>('female');
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSpeakingRef = useRef(false);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          let isFinal = false;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              isFinal = true;
            }
          }

          setTranscript(currentTranscript);

          // If user starts talking while AI is speaking, interrupt AI
          if (isSpeakingRef.current && currentTranscript.trim().length > 0) {
            stopSpeaking();
          }

          if (isFinal) {
            handleFinalTranscript(currentTranscript.trim());
          }
        };

        recognition.onstart = () => {
          if (liveState !== 'paused' && liveState !== 'speaking' && liveState !== 'processing') {
             setLiveState('listening');
          }
        };

        recognition.onend = () => {
          // Auto-restart if we are supposed to be listening
          if (liveState === 'listening' || liveState === 'idle') {
            try {
              recognition.start();
            } catch (e) {
              // ignore
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'not-allowed') {
            setTranscript('Microphone access denied.');
            setLiveState('paused');
          }
        };

        recognitionRef.current = recognition;
      } else {
        setTranscript('Speech Recognition not supported on this browser.');
      }
    }
  }, []);

  // Timer
  useEffect(() => {
    if (isOpen) {
      setSessionTime(0);
      timerRef.current = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
      
      // Start listening automatically
      startListening();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e){}
    }
    stopSpeaking();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLiveState('idle');
    setTranscript('');
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setLiveState('listening');
      setTranscript('');
    } catch (e) {
      // Already started
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    isSpeakingRef.current = false;
    utteranceRef.current = null;
  };

  const handleFinalTranscript = async (text: string) => {
    if (!text) return;
    
    stopListening();
    setLiveState('processing');
    setTranscript('Processing...');

    try {
      const reply = await onSendMessage(text);
      setTranscript(''); // Clear processing text
      speakResponse(reply);
    } catch (err: any) {
      setTranscript(err.message || 'Error occurred.');
      setLiveState('idle');
      setTimeout(startListening, 2000);
    }
  };

  const getBestVoice = () => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (!voices.length) return null;

    // Filter by English/Indian English
    const engVoices = voices.filter(v => v.lang.includes('en') || v.lang.includes('hi'));
    
    const isDesiredGender = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase();
      if (voicePreference === 'female') {
        return name.includes('female') || name.includes('siri') || name.includes('zira') || name.includes('samantha') || name.includes('victoria');
      } else {
        return name.includes('male') || name.includes('david') || name.includes('daniel') || name.includes('george');
      }
    };

    // 1. Google premium voices
    let best = engVoices.find(v => v.name.includes('Google') && isDesiredGender(v));
    // 2. Apple Siri voices
    if (!best) best = engVoices.find(v => v.name.includes('Siri') && isDesiredGender(v));
    // 3. Neural voices
    if (!best) best = engVoices.find(v => (v.name.includes('Neural') || v.name.includes('Premium')) && isDesiredGender(v));
    // 4. Any voice matching gender
    if (!best) best = engVoices.find(v => isDesiredGender(v));
    // 5. Any English voice
    if (!best) best = engVoices[0];
    // 6. Any voice
    if (!best) best = voices[0];

    return best;
  };

  // Ensure voices are loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Trigger voice load
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const speakResponse = (text: string) => {
    if (!synthRef.current) return;
    
    stopSpeaking();

    // Clean markdown from text for speech
    const cleanText = text.replace(/[*#_`]/g, '').replace(/\n/g, ' ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = 1.05; // Slightly faster for natural feel
    utterance.pitch = 1;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setLiveState('speaking');
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (liveState !== 'paused') {
        setLiveState('idle');
        startListening();
      }
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error', e);
      isSpeakingRef.current = false;
      if (liveState !== 'paused') {
        setLiveState('idle');
        startListening();
      }
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const togglePause = () => {
    if (liveState === 'paused') {
      setLiveState('idle');
      if (synthRef.current?.paused) {
        synthRef.current.resume();
        setLiveState('speaking');
      } else {
        startListening();
      }
    } else {
      stopListening();
      if (synthRef.current?.speaking) {
        synthRef.current.pause();
      }
      setLiveState('paused');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-[#050914] text-white overflow-hidden animate-in fade-in duration-500">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1c3065]/20 via-[#050914] to-[#050914] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-12 pb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#a8b8d8]" />
            <h1 className="text-xl font-medium tracking-wide">Neikx Live</h1>
          </div>
          <span className="text-sm text-white/50 font-mono mt-1">{formatTime(sessionTime)}</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-full transition-colors ${showSettings ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={onClose}
            className="p-3 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="relative z-20 mx-6 mb-4 p-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl animate-in slide-in-from-top-4">
          <h3 className="text-sm font-medium text-white/70 mb-3 uppercase tracking-wider">Voice Preference</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => { setVoicePreference('female'); speakResponse('Voice changed to Female'); }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${voicePreference === 'female' ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}
            >
              Female Voice
            </button>
            <button 
              onClick={() => { setVoicePreference('male'); speakResponse('Voice changed to Male'); }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${voicePreference === 'male' ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}
            >
              Male Voice
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Orb */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div className={`relative flex items-center justify-center transition-all duration-700 ease-in-out ${
          liveState === 'speaking' ? 'scale-110' : 
          liveState === 'processing' ? 'scale-95' : 'scale-100'
        }`}>
          {/* Outer Glow */}
          <div className={`absolute rounded-full blur-3xl transition-all duration-1000 ${
            liveState === 'listening' ? 'w-64 h-64 bg-emerald-500/20 animate-pulse' :
            liveState === 'speaking' ? 'w-80 h-80 bg-blue-500/30' :
            liveState === 'processing' ? 'w-56 h-56 bg-purple-500/20 animate-spin' :
            liveState === 'paused' ? 'w-48 h-48 bg-gray-500/10' :
            'w-56 h-56 bg-[#1c3065]/30'
          }`} style={{ animationDuration: '3s' }} />

          {/* Core Orb */}
          <div className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_60px_rgba(0,0,0,0.5)] ${
            liveState === 'listening' ? 'w-40 h-40 bg-gradient-to-br from-emerald-400 to-emerald-900 shadow-[0_0_40px_rgba(16,185,129,0.4)]' :
            liveState === 'speaking' ? 'w-48 h-48 bg-gradient-to-br from-blue-400 to-indigo-900 shadow-[0_0_60px_rgba(59,130,246,0.6)]' :
            liveState === 'processing' ? 'w-36 h-36 bg-gradient-to-br from-purple-400 to-purple-900 animate-pulse' :
            liveState === 'paused' ? 'w-36 h-36 bg-gradient-to-br from-gray-600 to-gray-900 grayscale' :
            'w-36 h-36 bg-gradient-to-br from-[#2a458f] to-[#0d1b42] animate-bounce'
          }`} style={{ animationDuration: liveState === 'idle' ? '4s' : '1s' }}>
            
            {/* Inner dynamic rings */}
            <div className={`absolute inset-2 rounded-full border-2 border-white/20 transition-transform duration-1000 ${
               liveState === 'speaking' ? 'animate-ping' : ''
            }`} style={{ animationDuration: '1.5s' }} />
            <div className={`absolute inset-6 rounded-full border border-white/10 ${
              liveState === 'processing' ? 'animate-spin' : ''
            }`} style={{ animationDuration: '3s' }} />

            <Sparkles className={`w-10 h-10 text-white ${liveState === 'processing' ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* State Label */}
        <div className="mt-16 text-center h-20 flex flex-col items-center justify-center">
          <p className="text-sm font-medium uppercase tracking-widest text-white/50 mb-2">
            {liveState === 'idle' ? 'Ready' :
             liveState === 'listening' ? 'Listening...' :
             liveState === 'processing' ? 'Thinking...' :
             liveState === 'speaking' ? 'Speaking...' :
             'Paused'}
          </p>
          <p className="text-lg text-white/90 max-w-md text-center px-4 line-clamp-2 transition-opacity duration-300">
            {transcript || (liveState === 'listening' ? 'Go ahead, I am listening' : '')}
          </p>
        </div>
      </main>

      {/* Bottom Controls */}
      <footer className="relative z-10 p-8 pb-12 flex justify-center gap-6">
        <button
          onClick={togglePause}
          className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
        >
          {liveState === 'paused' ? <Play className="w-6 h-6 ml-1" /> : <Pause className="w-6 h-6" />}
        </button>
        
        <button
          onClick={onClose}
          className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:scale-105"
        >
          <Square className="w-8 h-8 fill-current" />
        </button>
      </footer>
    </div>
  );
}
