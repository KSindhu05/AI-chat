'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/chatStore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ArtifactPanel() {
  const { activeArtifact, setActiveArtifact, theme } = useAppStore();
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  if (!activeArtifact) return null;

  const isRenderable = ['html', 'svg', 'react'].includes(activeArtifact.language.toLowerCase());

  // Force 'code' view if the language cannot be previewed
  const currentView = isRenderable ? view : 'code';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = activeArtifact.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artifact.${getFileExtension(activeArtifact.language)}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex-shrink-0 h-14 flex items-center px-4 border-b border-border bg-background justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="truncate">
            <h3 className="text-sm font-semibold truncate">{activeArtifact.title || 'Generated Artifact'}</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{activeArtifact.language}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
            title={copied ? "Copied!" : "Copy Code"}
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
            title="Download File"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            onClick={() => setActiveArtifact(null)}
            className="p-2 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
            title="Close Panel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* View Toggle (Preview vs Code) */}
      {isRenderable && (
        <div className="flex-shrink-0 border-b border-border p-2 bg-background flex justify-center">
          <div className="flex p-1 bg-surface-hover rounded-lg border border-border">
            <button
              onClick={() => setView('preview')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                view === 'preview' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setView('code')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                view === 'code' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Code
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-[#fafafa] dark:bg-[#1e1e1e]">
        {currentView === 'code' ? (
          <SyntaxHighlighter
            language={activeArtifact.language}
            style={theme === 'dark' ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              minHeight: '100%',
              fontSize: '0.85rem',
              background: 'transparent',
            }}
            showLineNumbers
          >
            {activeArtifact.content}
          </SyntaxHighlighter>
        ) : (
          <div className="w-full h-full bg-white relative">
            {activeArtifact.language.toLowerCase() === 'html' ? (
              <iframe
                title="Preview"
                srcDoc={activeArtifact.content}
                className="w-full h-full border-none"
                sandbox="allow-scripts"
              />
            ) : activeArtifact.language.toLowerCase() === 'svg' ? (
              <div 
                className="w-full h-full flex items-center justify-center p-8"
                dangerouslySetInnerHTML={{ __html: activeArtifact.content }}
              />
            ) : (
              <div className="p-8 text-center text-muted-foreground">Preview not available for this format.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getFileExtension(lang: string) {
  const map: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    react: 'jsx',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'md',
    bash: 'sh',
    svg: 'svg'
  };
  return map[lang.toLowerCase()] || 'txt';
}
