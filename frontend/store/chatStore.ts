/**
 * Zustand Store — Global State Management
 * 
 * Manages auth state, chat list, current chat messages,
 * streaming state, theme, and sidebar visibility.
 */

import { create } from 'zustand';

// ===== Types =====

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Chat {
  _id: string;
  userId: string;
  title: string;
  mode: string;
  modelId: string;
  customPrompt?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp: string;
}

export type ChatMode = 'general' | 'coding' | 'summarizer' | 'eli5' | 'study' | 'writer';

// ===== Chat Mode Definitions =====

export const CHAT_MODES: Record<ChatMode, { label: string; icon: string; description: string }> = {
  general: {
    label: 'General Chat',
    icon: '💬',
    description: 'Helpful AI assistant for any topic',
  },
  coding: {
    label: 'Coding Assistant',
    icon: '💻',
    description: 'Expert help with code and debugging',
  },
  summarizer: {
    label: 'Summarizer',
    icon: '📄',
    description: 'Concise summaries of any text',
  },
  eli5: {
    label: 'Explain Like I\'m 5',
    icon: '🧒',
    description: 'Simple explanations for complex topics',
  },
  study: {
    label: 'Study Helper',
    icon: '🎓',
    description: 'Academic tutor with practice questions',
  },
  writer: {
    label: 'Content Writer',
    icon: '✍️',
    description: 'Professional writing for any format',
  },
};

// ===== Prompt Templates =====

export const PROMPT_TEMPLATES: Record<ChatMode, { label: string; prompt: string }[]> = {
  general: [
    { label: '🌍 Explain a concept', prompt: 'Explain the concept of ' },
    { label: '📊 Compare things', prompt: 'Compare and contrast ' },
    { label: '💡 Brainstorm ideas', prompt: 'Give me 10 creative ideas for ' },
    { label: '✍️ Write something', prompt: 'Write a professional email about ' },
  ],
  coding: [
    { label: '🐛 Debug my code', prompt: 'Debug this code and explain the issue:\n\n```\n\n```' },
    { label: '🏗️ Design a system', prompt: 'Design a system architecture for ' },
    { label: '🔄 Refactor code', prompt: 'Refactor this code to be more efficient:\n\n```\n\n```' },
    { label: '📚 Explain a pattern', prompt: 'Explain the design pattern: ' },
  ],
  summarizer: [
    { label: '📄 Summarize text', prompt: 'Summarize the following text:\n\n' },
    { label: '🔑 Key takeaways', prompt: 'List the key takeaways from this:\n\n' },
    { label: '📋 Create an outline', prompt: 'Create a structured outline from:\n\n' },
    { label: '🎯 TL;DR', prompt: 'Give me a one-paragraph TL;DR of:\n\n' },
  ],
  eli5: [
    { label: '🧬 Science topic', prompt: 'Explain like I\'m 5: How does ' },
    { label: '💰 Finance topic', prompt: 'Explain like I\'m 5: What is ' },
    { label: '🖥️ Tech topic', prompt: 'Explain like I\'m 5: How does ' },
    { label: '🌎 World events', prompt: 'Explain like I\'m 5: Why ' },
  ],
  study: [
    { label: '📖 Teach me a topic', prompt: 'Teach me about ' },
    { label: '❓ Quiz me on', prompt: 'Give me 5 practice questions with answers on ' },
    { label: '📝 Explain with examples', prompt: 'Explain with real-world examples: ' },
    { label: '🧠 Create flashcards', prompt: 'Create 10 flashcards (Q&A format) for ' },
  ],
  writer: [
    { label: '📧 Write an email', prompt: 'Write a professional email about ' },
    { label: '📱 Social media post', prompt: 'Write an engaging social media post about ' },
    { label: '📝 Blog post', prompt: 'Write a detailed blog post about ' },
    { label: '📄 Cover letter', prompt: 'Write a compelling cover letter for a position as ' },
  ],
};

// ===== Store Interface =====

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadAuth: () => void;

  // Theme
  theme: 'dark' | 'light';
  accentColor: string;
  setAccentColor: (color: string) => void;
  toggleTheme: () => void;
  loadTheme: () => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Chats
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  removeChat: (id: string) => void;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  togglePinChat: (id: string) => void;

  // Current Chat
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  currentMode: ChatMode;
  setCurrentMode: (mode: ChatMode) => void;
  currentModel: string;
  setCurrentModel: (model: string) => void;

  // Streaming
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamingContent: string;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (token: string) => void;

  // Suggestions
  suggestions: string[];
  setSuggestions: (suggestions: string[]) => void;

  // Artifacts
  activeArtifact: { messageId: string; index: number; language: string; content: string; title?: string } | null;
  setActiveArtifact: (artifact: { messageId: string; index: number; language: string; content: string; title?: string } | null) => void;
  updateActiveArtifactContent: (content: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, chats: [], messages: [], currentChatId: null });
  },
  loadAuth: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token });
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    } catch (err) {
      console.error('Auth storage error:', err);
    }
  },

  // Theme
  theme: 'light',
  accentColor: 'purple',
  setAccentColor: (color) => {
    try {
      localStorage.setItem('accentColor', color);
    } catch (e) {}
    document.documentElement.setAttribute('data-accent', color);
    set({ accentColor: color });
  },
  toggleTheme: () => {
    // Disabled
  },
  loadTheme: () => {
    if (typeof window === 'undefined') return;
    try {
      const accent = localStorage.getItem('accentColor') || 'purple';
      // Force light theme
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-accent', accent);
      set({ theme: 'light', accentColor: accent });
    } catch (err) {
      console.error('Theme storage error:', err);
      set({ theme: 'light', accentColor: 'purple' });
    }
  },

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Chats
  chats: [],
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((s) => ({ chats: [chat, ...s.chats] })),
  removeChat: (id) => set((s) => ({ chats: s.chats.filter((c) => c._id !== id) })),
  updateChat: (id, updates) =>
    set((s) => ({
      chats: s.chats.map((c) => (c._id === id ? { ...c, ...updates } : c)),
    })),
  togglePinChat: (id) => {
    const pinnedIds: string[] = JSON.parse(localStorage.getItem('pinnedChats') || '[]');
    const newPinned = pinnedIds.includes(id) ? pinnedIds.filter((p) => p !== id) : [...pinnedIds, id];
    localStorage.setItem('pinnedChats', JSON.stringify(newPinned));
    set((s) => ({
      chats: s.chats.map((c) => (c._id === id ? { ...c, pinned: !c.pinned } : c)),
    }));
  },

  // Current Chat
  currentChatId: null,
  setCurrentChatId: (id) => set({ currentChatId: id }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  currentMode: 'general',
  setCurrentMode: (mode) => set({ currentMode: mode }),
  currentModel: 'llama-3.1-8b-instant',
  setCurrentModel: (model) => set({ currentModel: model }),

  // Streaming
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  streamingContent: '',
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),

  // Suggestions
  suggestions: [],
  setSuggestions: (suggestions) => set({ suggestions }),

  // Artifacts
  activeArtifact: null,
  setActiveArtifact: (artifact) => set({ activeArtifact: artifact }),
  updateActiveArtifactContent: (content) => set((state) => ({
    activeArtifact: state.activeArtifact ? { ...state.activeArtifact, content } : null
  })),
}));
