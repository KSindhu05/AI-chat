'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, CHAT_MODES, type ChatMode } from '@/store/chatStore';
import { chatApi } from '@/lib/api';
import MessageBubble from './MessageBubble';
import VoiceInput, { speakText, stopSpeaking } from './VoiceInput';
import PromptTemplates from './PromptTemplates';

/** Returns a greeting based on the current hour */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function ChatWindow() {
  const {
    currentChatId, messages, addMessage, setMessages,
    isStreaming, setIsStreaming,
    streamingContent, setStreamingContent, appendStreamingContent,
    suggestions, setSuggestions,
    currentMode, chats, addChat, setCurrentChatId, updateChat,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedPdf, setAttachedPdf] = useState<{ name: string; text: string } | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Detect scroll position for scroll-to-bottom button
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+N: New chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        useAppStore.getState().setCurrentChatId(null);
        useAppStore.getState().setMessages([]);
        useAppStore.getState().setStreamingContent('');
        useAppStore.getState().setSuggestions([]);
        inputRef.current?.focus();
      }
      // Ctrl+/: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        useAppStore.getState().toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = useCallback(async (messageContent?: string) => {
    const content = (messageContent || input).trim();
    if ((!content && !attachedImage && !attachedPdf) || isStreaming) return;

    let chatId = currentChatId;

    // Auto-create chat if none selected
    if (!chatId) {
      try {
        const res = await chatApi.createChat(currentMode);
        chatId = res.data._id;
        addChat(res.data);
        setCurrentChatId(chatId);
      } catch {
        return;
      }
    }

    // Add user message to UI immediately (chatId is guaranteed non-null here)
    const userMsg = {
      _id: 'temp-' + Date.now(),
      chatId: chatId as string,
      role: 'user' as const,
      content: content || (attachedPdf ? `Attached PDF: ${attachedPdf.name}` : 'Image attached'),
      image: attachedImage || undefined,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setInput('');
    const currentImage = attachedImage;
    const currentWebSearch = webSearch;
    const currentPdfText = attachedPdf ? attachedPdf.text : null;
    const currentPdfName = attachedPdf ? attachedPdf.name : null;
    
    setAttachedImage(null);
    setAttachedPdf(null);
    setIsStreaming(true);
    setStreamingContent('');
    setSuggestions([]);

    let finalContent = content;
    if (currentPdfText) {
      finalContent = `[User attached a PDF document named "${currentPdfName}"]\n\n[DOCUMENT CONTENT START]\n${currentPdfText}\n[DOCUMENT CONTENT END]\n\nUser Message: ${content || 'Please analyze this document.'}`;
    }

    // Stream AI response
    await chatApi.sendMessage(
      chatId as string,
      finalContent,
      currentImage || undefined,
      currentWebSearch,
      (token) => {
        appendStreamingContent(token);
      },
      (data) => {
        // Streaming complete — add full assistant message
        const currentStore = useAppStore.getState();
        const assistantMsg = {
          _id: data.messageId || 'ai-' + Date.now(),
          chatId: chatId!,
          role: 'assistant' as const,
          content: currentStore.streamingContent,
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMsg);
        setStreamingContent('');
        setIsStreaming(false);
        setSuggestions(data.suggestions);

        // Refresh chat list to get updated title
        chatApi.getChats().then((res) => {
          useAppStore.getState().setChats(res.data);
        }).catch(() => {});
      },
      (error) => {
        console.error('Stream error:', error);
        setIsStreaming(false);
        setStreamingContent('');
      }
    );
  }, [input, attachedImage, webSearch, isStreaming, currentChatId, currentMode, addMessage, setIsStreaming, setStreamingContent, appendStreamingContent, setSuggestions, addChat, setCurrentChatId, updateChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setInput((prev) => prev + text);
  };

  const handleVoiceAutoSend = () => {
    // When the user clicks "Done & Send" from the voice overlay
    setTimeout(() => handleSend(), 100);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsUploadingPdf(true);
      try {
        const data = await chatApi.uploadPdf(file);
        if (data.success && data.text) {
          setAttachedPdf({ name: file.name, text: data.text });
        }
      } catch (err) {
        console.error('Failed to parse PDF', err);
        alert('Failed to extract text from PDF.');
      } finally {
        setIsUploadingPdf(false);
      }
    }
  };

  const handleRegenerate = () => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && !isStreaming) {
      // Remove the last assistant message from UI
      const newMessages = messages.filter((_, i) => i < messages.length - 1);
      setMessages(newMessages);
      handleSend(lastUserMsg.content);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleExportMarkdown = () => {
    if (!messages.length) return;
    const content = messages.map(m => `### ${m.role === 'user' ? 'User' : 'AI Assistant'}\n\n${m.content}\n\n---\n`).join('\n');
    const blob = new Blob([`# Chat Export\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentChat?.title || 'chat-export'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    setShowExportMenu(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const currentChat = chats.find((c) => c._id === currentChatId);
  const modeInfo = CHAT_MODES[currentMode as ChatMode];
  const hasMessages = messages.length > 0 || streamingContent;
  const userName = useAppStore.getState().user?.name?.split(' ')[0] || '';

  return (
    <div className="flex-1 flex flex-col h-screen">
      <div className="flex-shrink-0 h-14 flex items-center px-4 gap-3 bg-background">
        <button
          onClick={() => useAppStore.getState().toggleSidebar()}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-lg">{modeInfo?.icon}</span>
          <h2 className="text-sm font-semibold truncate max-w-[200px]">
            {currentChat?.title || 'New Chat'}
          </h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* TTS toggle for last AI message */}
          {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <SpeakerButton content={messages[messages.length - 1].content} />
          )}

          {/* Export Menu */}
          {hasMessages && (
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                title="Export Conversation"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden hide-on-print">
                  <button 
                    onClick={handleExportMarkdown}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-background transition-colors flex items-center gap-2"
                  >
                    <span className="text-primary">↓</span> Export as Markdown
                  </button>
                  <button 
                    onClick={handleExportPdf}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-background transition-colors flex items-center gap-2 border-t border-border"
                  >
                    <span className="text-danger">🖨️</span> Print / Save as PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6 hide-on-print relative" style={showExportMenu ? { display: 'none' } : {}}>
        <div className="max-w-3xl mx-auto space-y-4">
          {!hasMessages ? (
            /* Welcome Screen */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              {/* Ambient Glow */}
              <div className="relative mb-8">
                <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-primary/20 blur-2xl animate-pulse" />
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative w-20 h-20 rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-4xl shadow-lg"
                >
                  {modeInfo?.icon || '✨'}
                </motion.div>
              </div>

              {/* Personalized Greeting */}
              <h2 className="text-2xl font-semibold mb-1 text-foreground">
                {getGreeting()}{userName ? `, ${userName}` : ''} 👋
              </h2>
              <p className="text-muted-foreground mb-2 text-base">
                {modeInfo?.label || 'AI Chat'}
              </p>
              <p className="text-muted mb-10 max-w-md text-sm">
                {modeInfo?.description || 'Start a conversation with AI'}
              </p>

              <PromptTemplates onSelect={handlePromptSelect} />

              {/* Keyboard shortcut hint */}
              <div className="mt-8 flex items-center gap-4 text-xs text-muted">
                <span><kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-muted-foreground">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-muted-foreground">N</kbd> New Chat</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-muted-foreground">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-muted-foreground">/</kbd> Toggle Sidebar</span>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Message bubbles */}
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg._id}
                  role={msg.role as 'user' | 'assistant'}
                  content={msg.content}
                  image={msg.image}
                  timestamp={msg.timestamp}
                  index={i}
                  onRegenerate={msg.role === 'assistant' && i === messages.length - 1 ? handleRegenerate : undefined}
                />
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <MessageBubble
                  role="assistant"
                  content={streamingContent}
                  isStreaming
                  index={messages.length}
                />
              )}

              {/* Typing indicator — "Aether is thinking..." */}
              {isStreaming && !streamingContent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 items-start my-4"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white mt-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                      <path d="M12 12 2.1 7.1" />
                      <path d="m12 12 6.9 8.9" />
                    </svg>
                  </div>
                  <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
                        <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
                        <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground ml-1">Aether is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Suggestions */}
              <AnimatePresence>
                {suggestions.length > 0 && !isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap gap-2 pt-2"
                  >
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => handleSuggestionClick(s)}
                        className="px-3 py-1.5 rounded-full text-xs border border-border bg-surface hover:bg-surface-hover hover:border-primary/40 transition-all"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom FAB */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-6 p-3 rounded-full bg-surface border border-border shadow-lg hover:bg-surface-hover transition-colors z-10"
              title="Scroll to bottom"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Print-only container */}
      <div className="hidden print:block p-8">
        <h1 className="text-2xl font-bold mb-6 text-black">{currentChat?.title || 'Chat Export'}</h1>
        <div className="space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className="print-avoid-break mb-6 border-b border-gray-200 pb-6">
              <div className="font-bold mb-2 text-black">{msg.role === 'user' ? 'You' : 'AI Assistant'}</div>
              <div className="prose-chat text-black" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 pb-6 hide-on-print bg-background">
        <div className="max-w-3xl mx-auto">
          {attachedImage && (
            <div className="mb-2 relative inline-block">
              <img src={attachedImage} alt="Attachment" className="h-20 rounded-lg border border-border object-cover" />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          )}
          {attachedPdf && (
            <div className="mb-2 relative inline-flex items-center gap-2 bg-surface border border-border px-3 py-2 rounded-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm font-medium truncate max-w-[200px]">{attachedPdf.name}</span>
              <button
                onClick={() => setAttachedPdf(null)}
                className="ml-2 text-muted-foreground hover:text-danger"
              >
                ✕
              </button>
            </div>
          )}
          {isUploadingPdf && (
            <div className="mb-2 inline-flex items-center gap-2 text-sm text-primary animate-pulse">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Extracting text...
            </div>
          )}
          <div className="flex items-end gap-2 bg-surface-hover border border-border rounded-xl px-4 py-2 focus-within:border-muted-foreground transition-colors shadow-sm">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-xl transition-colors"
              title="Attach Image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>

            <label className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-xl transition-colors cursor-pointer" title="Attach PDF">
              <input 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                onChange={handlePdfUpload}
              />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </label>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${modeInfo?.label || 'AI'}...`}
              disabled={isStreaming}
              rows={1}
              autoComplete="off"
              spellCheck="false"
              className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed max-h-[150px] py-1.5 placeholder:text-muted"
            />

            <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
              <button
                onClick={() => setWebSearch(!webSearch)}
                className={`p-2 rounded-xl transition-colors ${
                  webSearch ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                }`}
                title={webSearch ? 'Web Search Enabled' : 'Enable Web Search'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </button>

              <VoiceInput onTranscript={handleVoiceTranscript} onAutoSend={handleVoiceAutoSend} disabled={isStreaming} />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend()}
                disabled={(!input.trim() && !attachedImage && !attachedPdf) || isStreaming || isUploadingPdf}
                className={`p-2.5 rounded-lg transition-all duration-200 ${
                  (input.trim() || attachedImage || attachedPdf) && !isStreaming && !isUploadingPdf
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25'
                    : 'bg-surface text-muted cursor-not-allowed'
                }`}
              >
                {isStreaming ? (
                  <svg className="animate-spin-slow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>

          <p className="text-xs text-muted text-center mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * SpeakerButton — Toggle play/stop TTS for an AI message
 */
function SpeakerButton({ content }: { content: string }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakText(content, () => setIsSpeaking(false));
    }
  };

  return (
    <button
      onClick={toggleSpeak}
      className={`p-2 rounded-lg transition-colors ${
        isSpeaking
          ? 'bg-primary/20 text-primary'
          : 'hover:bg-surface-hover text-muted-foreground hover:text-foreground'
      }`}
      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
    >
      {isSpeaking ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
        </svg>
      )}
    </button>
  );
}
