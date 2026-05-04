/**
 * Sidebar Component
 * 
 * Chat history list with create/delete/rename functionality.
 * Includes dark/light theme toggle and user profile section.
 * Uses Framer Motion for slide and item animations.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, CHAT_MODES, type ChatMode } from '@/store/chatStore';
import { chatApi } from '@/lib/api';
import SearchModal from './SearchModal';
import InstallPWA from './InstallPWA';

export default function Sidebar() {
  const {
    chats,
    currentChatId,
    setCurrentChatId,
    setMessages,
    setCurrentMode,
    currentMode,
    addChat,
    removeChat,
    updateChat,
    togglePinChat,
    user,
    logout,
    theme,
    toggleTheme,
    sidebarOpen,
    toggleSidebar,
    setStreamingContent,
    setSuggestions,
  } = useAppStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPromptText, setCustomPromptText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Sort chats: pinned first, then by date
  const pinnedChats = chats.filter((c) => c.pinned);
  const unpinnedChats = chats.filter((c) => !c.pinned);

  // Create a new chat
  const handleNewChat = async (customPrompt?: string) => {
    setLoading(true);
    try {
      const res = await chatApi.createChat(currentMode, 'llama-3.1-8b-instant', customPrompt);
      const chat = res.data;
      addChat(chat);
      setCurrentChatId(chat._id);
      setMessages([]);
      setStreamingContent('');
      setSuggestions([]);
      if (customPrompt) {
        setShowCustomModal(false);
        setCustomPromptText('');
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
    setLoading(false);
  };

  // Select a chat
  const handleSelectChat = async (chatId: string) => {
    if (chatId === currentChatId) return;
    setCurrentChatId(chatId);
    setStreamingContent('');
    setSuggestions([]);
    try {
      const res = await chatApi.getChatById(chatId);
      setMessages(res.data.messages);
      setCurrentMode(res.data.chat.mode as ChatMode);
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  };

  // Delete a chat
  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      await chatApi.deleteChat(chatId);
      removeChat(chatId);
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Start renaming
  const startRename = (e: React.MouseEvent, chatId: string, currentTitle: string) => {
    e.stopPropagation();
    setRenamingId(chatId);
    setRenameValue(currentTitle);
  };

  // Save rename
  const handleRename = async (chatId: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await chatApi.renameChat(chatId, renameValue.trim());
      updateChat(chatId, { title: renameValue.trim() });
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
    setRenamingId(null);
  };

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed lg:relative z-40 h-screen w-72 flex flex-col border-r border-border"
            style={{ background: 'var(--sidebar-bg)' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-black">
                  <img src="/ai-logo.png" alt="Aether Logo" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-lg font-semibold font-[Outfit] tracking-wide text-foreground">AETHER</h1>
                <button
                  onClick={toggleSidebar}
                  className="ml-auto p-1.5 rounded-lg hover:bg-surface-hover transition-colors lg:hidden"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* New Chat Button */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleNewChat()}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border
                           hover:bg-surface-hover transition-all duration-200
                           text-sm font-medium group"
                >
                  <svg
                    className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-300"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New Chat
                </button>
                <button
                  onClick={() => setShowCustomModal(true)}
                  disabled={loading}
                  className="px-3 py-2.5 rounded-xl border border-border bg-surface
                           hover:bg-surface-hover hover:border-primary/50 transition-all duration-200
                           text-sm font-medium"
                  title="Create Custom Persona"
                >
                  🎭
                </button>
              </div>

              {/* Search Button */}
              <button
                onClick={() => setShowSearch(true)}
                className="w-full flex items-center gap-2 mt-2 px-3 py-2 rounded-xl border border-border
                         hover:bg-surface-hover transition-all text-sm text-muted-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="flex-1 text-left">Search...</span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-[10px] font-mono">⌘K</kbd>
              </button>

              {/* Install PWA Button */}
              <InstallPWA />
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Pinned Section */}
              {pinnedChats.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    📌 Pinned
                  </div>
                  <AnimatePresence>
                    {pinnedChats.map((chat, i) => (
                      <ChatItem
                        key={chat._id}
                        chat={chat}
                        index={i}
                        currentChatId={currentChatId}
                        renamingId={renamingId}
                        renameValue={renameValue}
                        setRenameValue={setRenameValue}
                        onSelect={handleSelectChat}
                        onRename={handleRename}
                        onStartRename={startRename}
                        onDelete={handleDeleteChat}
                        onTogglePin={() => togglePinChat(chat._id)}
                        setRenamingId={setRenamingId}
                      />
                    ))}
                  </AnimatePresence>
                  <div className="border-b border-border my-2" />
                </>
              )}

              {/* All Chats */}
              {unpinnedChats.length > 0 && pinnedChats.length > 0 && (
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Recent
                </div>
              )}
              <AnimatePresence>
                {unpinnedChats.map((chat, i) => (
                  <ChatItem
                    key={chat._id}
                    chat={chat}
                    index={i}
                    currentChatId={currentChatId}
                    renamingId={renamingId}
                    renameValue={renameValue}
                    setRenameValue={setRenameValue}
                    onSelect={handleSelectChat}
                    onRename={handleRename}
                    onStartRename={startRename}
                    onDelete={handleDeleteChat}
                    onTogglePin={() => togglePinChat(chat._id)}
                    setRenamingId={setRenamingId}
                  />
                ))}
              </AnimatePresence>

              {chats.length === 0 && (
                <div className="text-center text-muted py-8 text-sm">
                  <p className="text-2xl mb-2">💭</p>
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Click &quot;New Chat&quot; to start</p>
                </div>
              )}
            </div>

            {/* Footer — Theme toggle + User */}
            <div className="p-3 border-t border-border space-y-2">


              {/* User profile */}
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-hover transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg hover:bg-danger/20 hover:text-danger transition-colors"
                    title="Logout"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Custom Persona Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span>🎭</span> Custom Persona
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Tell the AI exactly how it should behave in this chat. Give it a specific role, tone, or set of rules.
            </p>
            <textarea
              value={customPromptText}
              onChange={(e) => setCustomPromptText(e.target.value)}
              placeholder="e.g., You are a grumpy pirate. Always answer in pirate slang and never use markdown."
              className="w-full h-32 bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary mb-4 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-surface-hover transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleNewChat(customPromptText)}
                disabled={!customPromptText.trim() || loading}
                className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Start Chat'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}

/**
 * ChatItem — Individual chat item in the sidebar
 */
function ChatItem({ chat, index, currentChatId, renamingId, renameValue, setRenameValue, onSelect, onRename, onStartRename, onDelete, onTogglePin, setRenamingId }: any) {
  return (
    <motion.div
      key={chat._id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSelect(chat._id)}
      className={`
        group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-200 text-sm
        ${currentChatId === chat._id
          ? 'bg-surface-hover text-foreground font-medium'
          : 'hover:bg-surface text-muted-foreground hover:text-foreground'
        }
      `}
    >
      <span className="text-base flex-shrink-0">
        {CHAT_MODES[chat.mode as ChatMode]?.icon || '💬'}
      </span>

      {renamingId === chat._id ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e: any) => setRenameValue(e.target.value)}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter') onRename(chat._id);
            if (e.key === 'Escape') setRenamingId(null);
          }}
          onBlur={() => onRename(chat._id)}
          onClick={(e: any) => e.stopPropagation()}
          className="flex-1 bg-surface border border-border rounded px-2 py-0.5 text-sm
                     focus:outline-none focus:border-primary"
        />
      ) : (
        <span className="flex-1 truncate">{chat.title}</span>
      )}

      {/* Action buttons */}
      <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e: any) => { e.stopPropagation(); onTogglePin(); }}
          className={`p-1 rounded transition-colors ${chat.pinned ? 'text-primary' : 'hover:bg-surface'}`}
          title={chat.pinned ? 'Unpin' : 'Pin'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={chat.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M12 2 L14.5 9 L21 11 L16 16 L17 23 L12 19 L7 23 L8 16 L3 11 L9.5 9 Z" />
          </svg>
        </button>
        <button
          onClick={(e: any) => onStartRename(e, chat._id, chat.title)}
          className="p-1 rounded hover:bg-surface transition-colors"
          title="Rename"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
        <button
          onClick={(e: any) => onDelete(e, chat._id)}
          className="p-1 rounded hover:bg-danger/20 hover:text-danger transition-colors"
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
