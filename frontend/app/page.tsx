'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/chatStore';
import { chatApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import ModeSelector from '@/components/ModeSelector';
import ModelSelector from '@/components/ModelSelector';
import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * Home Page — ChatGPT-style direct chat interface.
 * 
 * Opens directly to the chat UI if authenticated,
 * or shows a sleek login/register prompt if not.
 */
export default function HomePage() {
  const { user, loadAuth, loadTheme, setChats, sidebarOpen } = useAppStore();
  const [initialized, setInitialized] = useState(false);

  // Initialize auth and theme on mount
  useEffect(() => {
    loadAuth();
    loadTheme();
    setInitialized(true);
  }, [loadAuth, loadTheme]);

  // Load chat list when authenticated
  useEffect(() => {
    if (user) {
      chatApi.getChats()
        .then((res) => setChats(res.data))
        .catch(console.error);
    }
  }, [user, setChats]);

  // Show a minimal loading state while checking auth
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
            <span className="text-2xl">✨</span>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in — show a clean auth prompt (not a redirect)
  if (!user) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          {/* Logo */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6"
          >
            <img src="/ai-logo.png" alt="SinviChat" className="w-14 h-14 rounded-xl object-cover" />
          </motion.div>

          <h1 className="text-4xl font-bold font-[Outfit] mb-2 tracking-wide text-foreground">
            AETHER
          </h1>
          <p className="text-muted-foreground mb-8">AI-Powered Chat Assistant</p>

          <div className="glass rounded-2xl p-6 shadow-xl space-y-3">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25"
              >
                Sign In
              </motion.button>
            </Link>
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-surface-hover transition-colors mt-3"
              >
                Create Account
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Authenticated — render the full chat UI directly (like ChatGPT)
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => useAppStore.getState().setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mode & Model selector in top bar */}
        <div className="absolute top-2 right-4 z-20 flex items-center gap-2">
          <ModelSelector />
          <ModeSelector />
        </div>

        <ChatWindow />
      </div>
    </div>
  );
}
