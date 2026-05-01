/**
 * SearchModal Component (Ctrl+K)
 * 
 * A global search modal that searches across all chat titles.
 * Opens with Ctrl+K keyboard shortcut.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, CHAT_MODES, type ChatMode } from '@/store/chatStore';
import { chatApi } from '@/lib/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { chats, setCurrentChatId, setMessages, setCurrentMode } = useAppStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? chats.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase())
      )
    : chats.slice(0, 8);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelect = async (chatId: string) => {
    setCurrentChatId(chatId);
    try {
      const res = await chatApi.getChatById(chatId);
      setMessages(res.data.messages);
      setCurrentMode(res.data.chat.mode as ChatMode);
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted"
              autoComplete="off"
              spellCheck="false"
            />
            <kbd className="px-2 py-0.5 rounded bg-surface-hover border border-border text-[10px] text-muted-foreground font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p className="text-2xl mb-2">🔍</p>
                <p>No conversations found</p>
              </div>
            ) : (
              filtered.map((chat) => (
                <button
                  key={chat._id}
                  onClick={() => handleSelect(chat._id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-colors text-left group"
                >
                  <span className="text-base flex-shrink-0">
                    {CHAT_MODES[chat.mode as ChatMode]?.icon || '💬'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{chat.title}</p>
                    <p className="text-xs text-muted truncate">
                      {CHAT_MODES[chat.mode as ChatMode]?.label || chat.mode} · {new Date(chat.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {chat.pinned && (
                    <span className="text-xs text-primary" title="Pinned">📌</span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
