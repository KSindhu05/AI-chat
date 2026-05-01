'use client';

import { motion } from 'framer-motion';
import { useAppStore, PROMPT_TEMPLATES, type ChatMode } from '@/store/chatStore';

interface PromptTemplatesProps {
  onSelect: (prompt: string) => void;
}

export default function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  const { currentMode } = useAppStore();
  const templates = PROMPT_TEMPLATES[currentMode as ChatMode] || PROMPT_TEMPLATES.general;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {templates.map((template, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(template.prompt)}
          className="text-left px-4 py-3 rounded-lg border border-border bg-surface-hover hover:border-muted-foreground transition-all duration-200 group"
        >
          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {template.label}
          </p>
          <p className="text-xs text-muted mt-0.5 truncate">
            {template.prompt}
          </p>
        </motion.button>
      ))}
    </div>
  );
}
