/**
 * MessageBubble Component
 * 
 * Renders a single chat message with:
 * - Markdown rendering (react-markdown + remark-gfm)
 * - Syntax highlighted code blocks (react-syntax-highlighter)
 * - Copy-to-clipboard button for code blocks
 * - User/AI visual distinction
 * - Hover action bar: Copy, Regenerate, Like, Dislike
 */

'use client';

import { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageBubbleProps {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  isStreaming?: boolean;
  timestamp?: string;
  index: number;
  onRegenerate?: () => void;
}

/** Format a timestamp string into a short time like "8:30 PM" */
function formatTime(ts?: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function useSmoothTypewriter(text: string, isStreaming?: boolean) {
  const [displayedText, setDisplayedText] = useState(text);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      return;
    }

    if (text === displayedText) return;

    if (text.length < displayedText.length) {
      setDisplayedText(text);
      return;
    }

    const currentLength = displayedText.length;
    const targetLength = text.length;
    
    // Catch up dynamically based on how far behind we are
    const charsToAdd = Math.max(1, Math.floor((targetLength - currentLength) / 3));

    const timeout = setTimeout(() => {
      setDisplayedText(text.slice(0, currentLength + charsToAdd));
    }, 20); // ~50fps

    return () => clearTimeout(timeout);
  }, [text, displayedText, isStreaming]);

  return displayedText;
}

function MessageBubble({ messageId, role, content, image, isStreaming, timestamp, index, onRegenerate }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);

  const displayContent = useSmoothTypewriter(content, isStreaming);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`group flex gap-3 my-4 msg-bubble-enter ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(h => !h)}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center mt-1 text-white">
          <span className="text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <path d="M12 12 2.1 7.1" />
              <path d="m12 12 6.9 8.9" />
            </svg>
          </span>
        </div>
      )}

      {/* Message Content + Actions */}
      <div className="flex flex-col gap-1 max-w-[85%] lg:max-w-[75%]">
        <div
          className={`
            relative rounded-2xl px-5 py-3.5 text-[0.95rem] shadow-sm
            ${isUser
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-surface border border-border rounded-bl-sm text-foreground'
            }
          `}
        >
          {isUser ? (
            <div className="flex flex-col gap-2">
              {image && (
                <img src={image} alt="User attachment" className="max-w-[250px] rounded-lg border border-primary/20 object-contain bg-black/10" />
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
            </div>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const isInline = !match && !codeString.includes('\n');

                    if (isInline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }

                    let codeIndex = 0; // In a full implementation, we'd track the index of the code block. We'd use a random id or just use 0 for simplicity per message.
                    
                    const language = match?.[1] || 'text';
                    const isLongCode = codeString.split('\n').length > 5;
                    const isRenderable = ['html', 'svg', 'react', 'javascript', 'python'].includes(language.toLowerCase());
                    const isArtifact = isLongCode || isRenderable;

                    if (isArtifact) {
                      return (
                        <ArtifactCard
                          messageId={messageId}
                          index={codeIndex}
                          language={language}
                          code={codeString}
                          isStreaming={isStreaming}
                        />
                      );
                    }

                    return (
                      <CodeBlock
                        language={language}
                        code={codeString}
                      />
                    );
                  },
                }}
              >
                {displayContent}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-primary/80 animate-pulse align-middle" />
              )}
            </div>
          )}
        </div>

        {/* Timestamp + Read Receipt */}
        {!isStreaming && timestamp && (
          <div className={`flex items-center gap-1 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-muted">{formatTime(timestamp)}</span>
            {isUser && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}

        {/* ===== Hover/Tap Action Bar ===== */}
        {!isStreaming && (
          <div
            className={`flex items-center gap-0.5 mt-1 transition-opacity duration-150 ${isUser ? 'justify-end' : 'justify-start'} ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <ActionButton
              onClick={handleCopyMessage}
              title={copied ? 'Copied!' : 'Copy message'}
              active={copied}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </ActionButton>

            {!isUser && onRegenerate && (
              <ActionButton onClick={onRegenerate} title="Regenerate response">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <polyline points="23 20 23 14 17 14" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
              </ActionButton>
            )}

            {!isUser && (
              <>
                <ActionButton
                  onClick={() => setReaction(reaction === 'like' ? null : 'like')}
                  title="Good response"
                  active={reaction === 'like'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={reaction === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                    <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                  </svg>
                </ActionButton>
                <ActionButton
                  onClick={() => setReaction(reaction === 'dislike' ? null : 'dislike')}
                  title="Bad response"
                  active={reaction === 'dislike'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={reaction === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                    <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
                  </svg>
                </ActionButton>
              </>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-surface-hover border border-border flex items-center justify-center mt-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </div>
  );
}

function ActionButton({ onClick, title, active, children }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors active:scale-90 ${
        active
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
      }`}
    >
      {children}
    </button>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1a1f2e] rounded-t-lg border border-b-0 border-border text-xs">
        <span className="text-muted-foreground font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 8px 8px',
          border: '1px solid var(--border-color)',
          borderTop: 'none',
          fontSize: '0.85em',
        }}
        showLineNumbers={code.split('\n').length > 3}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

import { useAppStore } from '@/store/chatStore';
import { useEffect } from 'react';

function ArtifactCard({ messageId, index, language, code, isStreaming }: any) {
  const { activeArtifact, setActiveArtifact, updateActiveArtifactContent } = useAppStore();
  
  const isThisActive = activeArtifact?.messageId === messageId && activeArtifact?.index === index;

  // Sync content if this artifact is currently active (e.g., during streaming)
  useEffect(() => {
    if (isThisActive && isStreaming) {
      updateActiveArtifactContent(code);
    }
  }, [code, isThisActive, isStreaming, updateActiveArtifactContent]);

  const handleOpen = () => {
    setActiveArtifact({
      messageId,
      index,
      language,
      content: code,
      title: `${language.charAt(0).toUpperCase() + language.slice(1)} Code`
    });
  };

  return (
    <div className="my-3 flex flex-col">
      <div 
        onClick={handleOpen}
        className={`p-4 rounded-t-xl border border-border bg-surface-hover cursor-pointer transition-all hover:border-primary/50 group ${isThisActive ? 'ring-2 ring-primary/30 border-primary' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-background rounded-lg text-primary shadow-sm group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Generated {language}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isStreaming ? (
                  <span className="flex items-center gap-1 text-primary">
                    <span className="animate-pulse">Generating...</span>
                  </span>
                ) : (
                  'Click to open in split view'
                )}
              </p>
            </div>
          </div>
          <div className="text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
            <span className="text-xs hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">Open Preview</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Render the full code natively below the card */}
      <div className="-mt-3">
        <CodeBlock language={language} code={code} />
      </div>
    </div>
  );
}

export default memo(MessageBubble);
