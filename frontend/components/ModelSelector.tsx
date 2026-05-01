'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/chatStore';

const MODELS = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 (8B)', description: 'Fast, great for general tasks' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 (70B)', description: 'Smart, complex reasoning' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', description: 'Next-gen vision model' }
];

export default function ModelSelector() {
  const { currentModel, setCurrentModel } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  const selectedModelInfo = MODELS.find((m) => m.id === currentModel) || MODELS[0];

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-primary/50 transition-colors text-sm"
      >
        <span className="font-semibold">{selectedModelInfo.name}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setCurrentModel(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex flex-col items-start px-3 py-2 rounded-lg transition-colors ${
                      currentModel === model.id
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-surface-hover text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm">{model.name}</span>
                      {currentModel === model.id && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5 text-left">
                      {model.description}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
