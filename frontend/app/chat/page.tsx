'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /chat route — Redirects to root (/) where the main chat UI lives.
 * Kept for backward compatibility with existing links/bookmarks.
 */
export default function ChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

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
