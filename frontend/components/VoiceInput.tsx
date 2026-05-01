'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onAutoSend?: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, onAutoSend, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || disabled) return;

    // If already listening, stop
    if (isListening) {
      stopListening();
      return;
    }

    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript);
      }

      if (finalTranscript) {
        setInterimText('');
        onTranscript(finalTranscript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, disabled, isListening, onTranscript, stopListening]);

  const handleAutoSend = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // The final transcript would have already been passed via onTranscript
    // Trigger auto-send after a short delay
    setTimeout(() => {
      if (onAutoSend) {
        onAutoSend('');
      }
    }, 300);
  }, [onAutoSend]);

  if (!isSupported) return null;

  return (
    <>
      {/* Mic Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={startListening}
        disabled={disabled}
        className={`relative p-2.5 rounded-xl transition-all duration-200 ${
          isListening
            ? 'bg-danger text-white shadow-lg shadow-danger/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
        }`}
        title={isListening ? 'Click to stop' : 'Voice input'}
      >
        {/* Pulsing ring when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-xl bg-danger/30 animate-ping" />
            <span className="absolute inset-0 rounded-xl bg-danger/20 animate-pulse" />
          </>
        )}
        <svg width="18" height="18" viewBox="0 0 24 24" fill={isListening ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="relative z-10">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </motion.button>

      {/* Full-screen listening overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          >
            {/* Close overlay */}
            <button
              onClick={stopListening}
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Waveform Animation */}
            <div className="relative mb-8">
              {/* Pulsing rings */}
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 w-32 h-32 -m-8 rounded-full border-2 border-primary/40"
              />
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute inset-0 w-32 h-32 -m-8 rounded-full border-2 border-primary/20"
              />

              {/* Center mic icon */}
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full bg-danger flex items-center justify-center shadow-2xl shadow-danger/40"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </motion.div>
            </div>

            {/* Waveform bars */}
            <div className="flex items-center gap-1 mb-6 h-8">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [8, 20 + Math.random() * 16, 8] }}
                  transition={{
                    duration: 0.6 + Math.random() * 0.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.08,
                  }}
                  className="w-1 rounded-full bg-primary"
                />
              ))}
            </div>

            <p className="text-white/90 text-lg font-medium mb-2">Listening...</p>

            {/* Live interim text */}
            {interimText && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-primary text-sm max-w-md text-center px-4 italic"
              >
                "{interimText}"
              </motion.p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-4 mt-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopListening}
                className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAutoSend}
                className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30"
              >
                Done & Send
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Speak text using browser's SpeechSynthesis API */
export function speakText(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  // Strip markdown formatting for cleaner speech
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'code block omitted')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[-*]\s/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1;
  utterance.pitch = 1;

  // Try to pick a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v =>
    v.name.includes('Google') && v.lang.startsWith('en')
  ) || voices.find(v => v.lang.startsWith('en'));
  if (preferredVoice) utterance.voice = preferredVoice;

  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

/** Stop any ongoing speech */
export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
