'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, CHAT_MODES, type ChatMode } from '@/store/chatStore';

export default function ModeSelector() {
  const { currentMode, setCurrentMode } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = CHAT_MODES[currentMode];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-hover transition-all duration-200 text-sm"
      >
        <span className="text-base">{current.icon}</span>
        <span className="font-medium hidden sm:inline">{current.label}</span>
        <motion.svg animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 z-50 w-64 rounded-xl bg-surface border border-border shadow-xl shadow-black/20 overflow-hidden"
          >
            {(Object.entries(CHAT_MODES) as [ChatMode, typeof current][]).map(([key, mode]) => (
              <button
                key={key}
                onClick={() => { setCurrentMode(key); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${currentMode === key ? 'bg-primary/10 text-foreground' : 'hover:bg-surface-hover text-muted-foreground hover:text-foreground'}`}
              >
                <span className="text-xl">{mode.icon}</span>
                <div>
                  <p className="text-sm font-medium">{mode.label}</p>
                  <p className="text-xs text-muted">{mode.description}</p>
                </div>
                {currentMode === key && (
                  <svg className="ml-auto text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
