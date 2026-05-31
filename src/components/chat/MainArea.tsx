import { useSessionStore } from '../../store/sessionStore';
import { useStreamingStore } from '../../store/streamingStore';
import type { Message } from '../../types';
import { approveCommand, retryMessage, editAndRegenerate } from '../../api/endpoints';
import { connectApprovalSSE } from '../../api/sse';
/* All icons replaced with original inline SVGs from static/index.html */
import { useState, useCallback, useRef, useEffect } from 'react';
import Composer from './Composer';
import ToolCallCard from './ToolCallCard';
import ThinkingBlock from './ThinkingBlock';
import StreamingIndicator from './StreamingIndicator';

export default function MainArea() {
  const activeSid = useSessionStore(s => s.activeSessionId);
  const messages = useSessionStore(s => s.messages);
  const busy = useSessionStore(s => s.busy);
  const toolCalls = useSessionStore(s => s.toolCalls);
  const setSuggestedInput = useSessionStore(s => s.setSuggestedInput);
  const isStreaming = useStreamingStore(s => s.isStreaming);
  const approvalCount = useStreamingStore(s => s.approvalCount);
  const setApprovalSse = useStreamingStore(s => s.setApproval);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Connect approval SSE
  useEffect(() => {
    if (!activeSid) return;
    const cleanup = connectApprovalSSE(activeSid, (count, aid) => {
      setApprovalSse(count, aid);
    });
    return cleanup;
  }, [activeSid, setApprovalSse]);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const scrollPinnedRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const nearBottomCountRef = useRef(0);

  // Smart scroll: only auto-scroll if pinned; unpin when user scrolls up
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (programmaticScrollRef.current) {
        programmaticScrollRef.current = false;
        return;
      }
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(dist > 100);

      if (dist < 250) {
        nearBottomCountRef.current += 1;
        if (nearBottomCountRef.current >= 2) {
          scrollPinnedRef.current = true;
        }
      } else {
        nearBottomCountRef.current = 0;
        scrollPinnedRef.current = false;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom when new messages/toolCalls arrive, but only if pinned
  useEffect(() => {
    if (scrollPinnedRef.current) {
      programmaticScrollRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' });
    }
  }, [messages, toolCalls, isStreaming]);

  const scrollToBottom = useCallback(() => {
    scrollPinnedRef.current = true;
    programmaticScrollRef.current = true;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <main className="main">
      <div className="messages-shell">
        <button
          className="session-jump-btn session-jump-btn--start"
          aria-label="Jump to beginning of session"
          title="Jump to beginning of session"
          onClick={() => messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: messages.length > 5 ? 'flex' : 'none' }}
        >
          <span aria-hidden="true">↑</span>
          <span>Start</span>
        </button>
        <button
          className="scroll-to-bottom-btn"
          style={{ display: showScrollBtn ? 'flex' : 'none' }}
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
        >
          <span aria-hidden="true">↓</span>
          <span className="session-jump-btn__text">End</span>
        </button>
        <div className="messages" id="messages" ref={messagesRef}>
        {messages.length === 0 && !busy && (
          <div className="chat-empty">
            <div className="empty-state">
              <div className="empty-logo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="80" height="80" aria-label="Hermes caduceus">
                  <defs>
                    <linearGradient id="hermes-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{"stopColor":"#F5C542","stopOpacity":1} as React.CSSProperties} />
                      <stop offset="100%" style={{"stopColor":"#D4961C","stopOpacity":1} as React.CSSProperties} />
                    </linearGradient>
                  </defs>
                  <rect x="30" y="10" width="4" height="46" rx="2" fill="url(#hermes-gold)"/>
                  <path d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20" fill="#F5C542" opacity="0.9"/>
                  <path d="M30 22 C26 19, 18 19, 14 22 C18 20, 24 20, 28 24" fill="#D4961C" opacity="0.8"/>
                  <path d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20" fill="#F5C542" opacity="0.9"/>
                  <path d="M34 22 C38 19, 46 19, 50 22 C46 20, 40 20, 36 24" fill="#D4961C" opacity="0.8"/>
                  <path d="M32 48 C22 44, 20 38, 26 34 C20 36, 18 42, 24 46 C18 40, 22 30, 30 28 C24 32, 22 38, 28 42" fill="none" stroke="#F5C542" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M32 48 C42 44, 44 38, 38 34 C44 36, 46 42, 40 46 C46 40, 42 30, 34 28 C40 32, 42 38, 36 42" fill="none" stroke="#D4961C" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="32" cy="10" r="4" fill="#F5C542"/>
                  <circle cx="32" cy="10" r="2" fill="#FFF8E1" opacity="0.7"/>
                </svg>
              </div>
              <h2>What can I help with?</h2>
              <p>Ask anything, run commands, explore files, or manage your scheduled tasks.</p>
              <div className="suggestion-grid">
                <button className="suggestion" onClick={() => setSuggestedInput("What files are in this workspace?")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span>What files are in this workspace?</span>
                </button>
                <button className="suggestion" onClick={() => setSuggestedInput("What's on my schedule today?")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>
                  <span>What's on my schedule today?</span>
                </button>
                <button className="suggestion" onClick={() => setSuggestedInput("Help me plan a small project.")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                  <span>Help me plan a small project.</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageItem key={i} message={msg} index={i} isLast={i === messages.length - 1} />
        ))}
        {toolCalls.length > 0 && (
          <ActivityGroup toolCalls={toolCalls} />
        )}
        {isStreaming && <StreamingIndicator />}
        <div ref={bottomRef} />
      </div>
      </div>
      {approvalCount > 0 && <ApprovalBar count={approvalCount} />}
      <UpdateBanner />
      <Composer />
    </main>
  );
}

function MessageItem({ message, index, isLast }: { message: Message; index: number; isLast: boolean }) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';
  const activeSid = useSessionStore(s => s.activeSessionId);
  const busy = useSessionStore(s => s.busy);

  const handleCopy = useCallback(async () => {
    if (message.content) {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content]);

  const handleRetry = useCallback(async () => {
    if (!activeSid || busy) return;
    setMenuOpen(false);
    try { await retryMessage(activeSid, index); } catch { /* ignore */ }
  }, [activeSid, index, busy]);

  const handleEdit = useCallback(async () => {
    if (!activeSid || busy || !message.content) return;
    const newContent = prompt('Edit message:', message.content);
    if (newContent && newContent !== message.content) {
      setMenuOpen(false);
      try { await editAndRegenerate(activeSid, index, newContent); } catch { /* ignore */ }
    }
  }, [activeSid, index, busy, message.content]);

  if (isTool) return null;

  return (
    <div className={`msg-row ${isUser ? 'user' : isSystem ? 'system' : 'assistant'}`}>
      <div className="msg-avatar">
        {isUser ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg> : isSystem ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>}
      </div>
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-role">{isUser ? 'You' : isSystem ? 'System' : 'Hermes'}</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {message.content && (
            <button className="msg-copy-btn" onClick={handleCopy}>
              {copied ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
            </button>
          )}
          {isLast && !isSystem && !busy && (
            <div style={{ position: 'relative' }}>
              <button className="msg-copy-btn" onClick={() => setMenuOpen(!menuOpen)} style={{ opacity: 1 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  <button onClick={handleCopy}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button>
                  <button onClick={handleRetry}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg> Retry</button>
                  {isUser && <button onClick={handleEdit}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> Edit</button>}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
        {(message.reasoning || message.thinking) && (
          <ThinkingBlock content={message.reasoning || message.thinking || ''} defaultOpen={false} />
        )}
        <div className="msg-content">
          <MarkdownContent content={message.content || ''} />
        </div>
        {message.tool_calls?.map(tc => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}

/** Simple markdown renderer: paragraphs, code blocks, inline code, bold, italic */
function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;
  const blocks = content.split('\n');

  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const line = blocks[i];

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      let code = '';
      i++;
      while (i < blocks.length && !/^```/.test(blocks[i])) {
        code += (code ? '\n' : '') + blocks[i];
        i++;
      }
      i++; // skip closing ```
      elements.push(<CodeBlock key={elements.length} code={code} language={lang} />);
      continue;
    }

    // Inline markdown rendering
    elements.push(
      <p key={elements.length}>
        <InlineMarkdown text={line} />
      </p>,
    );
    i++;
  }

  return <div className="markdown-body">{elements}</div>;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <button className="btn-icon-xs" onClick={handleCopy} title="Copy">
          {copied ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
        </button>
      </div>
      <pre className="code-block"><code>{code}</code></pre>
    </div>
  );
}

/** Renders inline **bold*, *italic*, `code` within a single line */
function InlineMarkdown({ text }: { text: string }) {
  if (!text) return <>{'\u00A0'}</>;

  // Split by code spans first
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^`[^`]+`$/.test(part)) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        // Bold and italic
        const boldItalic = part.split(/(\*\*\*[^*]+\*\*\*)/g).map((seg, j) => {
          if (/^\*\*\*[^*]+\*\*\*$/.test(seg)) {
            return <strong key={j}><em>{seg.slice(3, -3)}</em></strong>;
          }
          const bold = seg.split(/(\*\*[^*]+\*\*)/g).map((s, k) => {
            if (/^\*\*[^*]+\*\*$/.test(s)) {
              return <strong key={k}>{s.slice(2, -2)}</strong>;
            }
            const italic = s.split(/(\*[^*]+\*)/g).map((t, l) => {
              if (/^\*[^*]+\*$/.test(t)) {
                return <em key={l}>{t.slice(1, -1)}</em>;
              }
              return <span key={l}>{t}</span>;
            });
            return <span key={k}>{italic}</span>;
          });
          return <span key={j}>{bold}</span>;
        });
        return <span key={i}>{boldItalic}</span>;
      })}
    </>
  );
}

/** Collapsed activity group for tool calls — "Activity: N tools" disclosure */
function ActivityGroup({ toolCalls }: { toolCalls: import('../../types').ToolCall[] }) {
  const [expanded, setExpanded] = useState(false);
  if (toolCalls.length === 0) return null;
  return (
    <div className="activity-group">
      <div className="activity-header" onClick={() => setExpanded(!expanded)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        <span>Activity: {toolCalls.length} tool{toolCalls.length !== 1 ? 's' : ''}</span>
        <button className="btn-icon-xs" style={{ marginLeft: 'auto' }}>
          {expanded ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>}
        </button>
      </div>
      {expanded && (
        <div className="activity-body">
          {toolCalls.map(tc => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalBar({ count }: { count: number }) {
  const activeSid = useSessionStore(s => s.activeSessionId);
  const approvalId = useStreamingStore(s => s.approvalId);
  const [responding, setResponding] = useState(false);

  const handleRespond = useCallback(async (choice: string) => {
    if (!activeSid || !approvalId || responding) return;
    setResponding(true);
    try {
      await approveCommand(activeSid, approvalId, choice);
    } catch { /* ignore */ }
    setResponding(false);
  }, [activeSid, approvalId, responding]);

  if (count === 0) return null;

  return (
    <div className={`approval-card${count > 0 ? ' visible' : ''}`}>
      <div className="approval-inner">
        <div className="approval-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Approval required</span>
        </div>
        <div className="approval-desc">{count} tool execution{count > 1 ? 's' : ''} require your approval</div>
        <div className="approval-btns">
          <button className="approval-btn once" onClick={() => handleRespond('once')} disabled={responding} title="Allow this one command (Enter)">
            <span className="approval-btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span>
            <span className="approval-btn-label">Allow once</span>
          </button>
          <button className="approval-btn session" onClick={() => handleRespond('session')} disabled={responding} title="Allow for this session">
            <span className="approval-btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
            <span className="approval-btn-label">Allow session</span>
          </button>
          <button className="approval-btn always" onClick={() => handleRespond('always')} disabled={responding} title="Always allow this command pattern">
            <span className="approval-btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
            <span className="approval-btn-label">Always allow</span>
          </button>
          <button className="approval-btn deny" onClick={() => handleRespond('deny')} disabled={responding} title="Deny — do not run this command">
            <span className="approval-btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
            <span className="approval-btn-label">Deny</span>
          </button>
          <button className="approval-btn yolo" onClick={() => handleRespond('always')} disabled={responding} title="Skip all approvals this session">
            <span className="approval-btn-icon" aria-hidden="true">⚡</span>
            <span className="approval-btn-label">Skip all</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Update notification banner */
function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  if (!visible) return null;

  return (
    <div className="update-banner visible">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span>An update is available</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="update-btn" onClick={() => setVisible(false)}>Later</button>
        <button className="update-btn update-primary" onClick={() => window.location.reload()}>Update Now</button>
      </div>
    </div>
  );
}
