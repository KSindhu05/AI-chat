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
            AETHER
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
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => useAppStore.getState().setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatWindow />
      </div>
    </div>
  );
}
