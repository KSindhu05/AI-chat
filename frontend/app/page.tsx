'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/chatStore';
import { chatApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import ModeSelector from '@/components/ModeSelector';
import ModelSelector from '@/components/ModelSelector';
import ArtifactPanel from '@/components/ArtifactPanel';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Home Page — ChatGPT-style direct chat interface.
 * 
 * Opens directly to the chat UI if authenticated,
 * or shows a sleek login/register prompt if not.
 */
export default function HomePage() {
  const { user, loadAuth, loadTheme, setChats, sidebarOpen, activeArtifact } = useAppStore();
  const [mounted, setMounted] = useState(false);

  // Initialize on mount
  useEffect(() => {
    loadAuth();
    loadTheme();
    setMounted(true);
  }, [loadAuth, loadTheme]);

  // Load chat list when authenticated
  useEffect(() => {
    if (mounted && user) {
      chatApi.getChats()
        .then((res) => setChats(res.data))
        .catch(console.error);
    }
  }, [user, setChats, mounted]);

  // If not mounted yet, show a very simple, non-animated loading state
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
      </div>
    );
  }

  // Not logged in — show a clean auth prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <img src="/ai-logo.png" alt="SinviChat" className="w-14 h-14 rounded-xl object-cover" />
          </div>

          <h1 className="text-4xl font-bold font-[Outfit] mb-2 tracking-wide text-foreground">
            SIN AI
          </h1>
          <p className="text-muted-foreground mb-8">AI-Powered Chat Assistant</p>

          <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-3">
            <Link href="/login" className="block w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="block w-full py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-surface-hover transition-colors mt-3">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated — render the full chat UI
  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-background">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => useAppStore.getState().setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex min-w-0 relative bg-background">
        {/* Chat Window Container */}
        <div className={`flex-1 flex flex-col min-w-0 relative transition-all duration-300 ${activeArtifact ? 'hidden lg:flex lg:w-1/2 lg:flex-none' : ''}`}>
          {/* Mode & Model selector in top bar */}
          <div className="absolute top-2 right-4 z-20 flex items-center gap-2">
            <ModelSelector />
            <ModeSelector />
          </div>

          <ChatWindow />
        </div>

        {/* Artifact Panel Container */}
        <AnimatePresence>
          {activeArtifact && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-0 z-40 lg:relative lg:z-auto lg:flex-1 lg:w-1/2 border-l border-border bg-background shadow-2xl lg:shadow-none"
            >
              <ArtifactPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
