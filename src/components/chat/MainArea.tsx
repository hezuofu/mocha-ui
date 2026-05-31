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
import { KaTeXRenderer, MermaidRenderer } from './SpecialRenderers';
import { useI18n } from '../../i18n';

export default function MainArea() {
  const { t } = useI18n();
  const activeSid = useSessionStore(s => s.activeSessionId);
  const messages = useSessionStore(s => s.messages);
  const busy = useSessionStore(s => s.busy);
  const toolCalls = useSessionStore(s => s.toolCalls);
  const setSuggestedInput = useSessionStore(s => s.setSuggestedInput);
  const isStreaming = useStreamingStore(s => s.isStreaming);
  const approvalCount = useStreamingStore(s => s.approvalCount);
  const setApprovalSse = useStreamingStore(s => s.setApproval);
  const clarifyPending = useStreamingStore(s => s.clarifyPending);
  const clarifyQuestionState = useStreamingStore(s => s.clarifyQuestion);
  const clarifyChoicesState = useStreamingStore(s => s.clarifyChoices);
  const hideClarify = useStreamingStore(s => s.hideClarify);
  const compressionRunning = useStreamingStore(s => s.compressionRunning);
  const compressionMessage = useStreamingStore(s => s.compressionMessage);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load Prism.js for code highlighting
  useEffect(() => {
    if ((window as unknown as Record<string, unknown>).Prism) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js';
    js.onload = () => {
      const auto = document.createElement('script');
      auto.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js';
      document.head.appendChild(auto);
    };
    document.head.appendChild(js);
  }, []);

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

  const [offline, setOffline] = useState(false);
  const [reconnect, setReconnect] = useState(false);
  const [agentDown, setAgentDown] = useState(false);
  const [clarifyInput, setClarifyInput] = useState('');
  const [uploadProgress] = useState(0);
  const [uploading] = useState(false);

  useEffect(() => {
    const goOff = () => setOffline(true);
    const goOn = () => { setOffline(false); setReconnect(true); setTimeout(() => setReconnect(false), 8000); };
    window.addEventListener('offline', goOff);
    window.addEventListener('online', goOn);
    return () => { window.removeEventListener('offline', goOff); window.removeEventListener('online', goOn); };
  }, []);

  // Periodic agent health check
  useEffect(() => {
    const check = () => {
      import('../../api/endpoints').then(({ getAgentHealth }) => {
        getAgentHealth().then((h: unknown) => {
          setAgentDown((h as Record<string, unknown>)?.status === 'error');
        }).catch(() => {});
      }).catch(() => {});
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="main">
      {offline && (
        <div className="offline-banner visible" role="status">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <strong>Connection lost</strong>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Your browser is offline. Messages will be queued.</span>
          </div>
          <button onClick={() => window.location.reload()} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t('retry')}</button>
        </div>
      )}
      {reconnect && (
        <div className="reconnect-banner visible">
          <span>Connection restored. Reload messages?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="reconnect-btn" onClick={() => setReconnect(false)}>Dismiss</button>
            <button className="reconnect-btn" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      )}
      {agentDown && (
        <div className="agent-health-banner visible" role="alert">
          <div><strong>Hermes agent is not responding</strong></div>
          <button onClick={() => setAgentDown(false)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--error) 45%, var(--surface))', background: 'color-mix(in srgb, var(--error) 10%, var(--surface))', color: 'var(--error)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Dismiss</button>
        </div>
      )}
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
        <div className="messages-inner">
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
              <h2>{t('empty_title')}</h2>
              <p>{t('empty_subtitle')}</p>
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
        </div>
        <div ref={bottomRef} />
      </div>
      </div>
      {approvalCount > 0 && <ApprovalBar count={approvalCount} />}
      {clarifyPending && (
        <ClarifyCard question={clarifyQuestionState} choices={clarifyChoicesState} input={clarifyInput}
          onInputChange={setClarifyInput}
          onChoice={(choice: string) => { hideClarify(); setClarifyInput('');
            if (activeSid) import('../../api/endpoints').then(({ approveCommand: ac }) => ac(activeSid, choice, 'clarify')).catch(() => {}); }}
          onSubmit={() => { hideClarify();
            if (clarifyInput.trim() && activeSid) import('../../api/endpoints').then(({ approveCommand: ac }) => ac(activeSid, clarifyInput.trim(), 'clarify_response')).catch(() => {});
            setClarifyInput(''); }}
          onDismiss={() => { hideClarify(); }} />
      )}
      {compressionRunning && (
        <div className="streaming-indicator" style={{ justifyContent: 'center', padding: '8px 0', color: 'var(--accent-text)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
          <span>{compressionMessage || 'Compressing context...'}</span>
        </div>
      )}
      {uploading && <UploadBar progress={uploadProgress} />}
      <UpdateBanner />
      {false && <HandoffHint sessionId={activeSid || ''} />}
      <Composer />
    </main>
  );
}

function MessageItem({ message, index, isLast }: { message: Message; index: number; isLast: boolean }) {
  const [copied, setCopied] = useState(false);
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
    try { await retryMessage(activeSid, index); } catch { /* ignore */ }
  }, [activeSid, index, busy]);

  const handleEdit = useCallback(async () => {
    if (!activeSid || busy || !message.content) return;
    const newContent = prompt('Edit message:', message.content);
    if (newContent && newContent !== message.content) {
      try { await editAndRegenerate(activeSid, index, newContent); } catch { /* ignore */ }
    }
  }, [activeSid, index, busy, message.content]);

  const handleSpeak = useCallback(() => {
    if (!message.content || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message.content);
    u.rate = 0.9; u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }, [message.content]);

  // Browser notification permission
  const notify = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  }, []);

  // Image lightbox
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isTool) return null;

  const role = isUser ? 'user' : isSystem ? 'system' : 'assistant';
  const roleLabel = isUser ? 'You' : isSystem ? 'System' : 'Hermes';

  return (
    <div className="msg-row" data-role={role}>
      <div className="role-icon">
        {isUser
          ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
          : isSystem
            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
        }
      </div>
      <div className="msg-body">
        <div className="msg-role">
          {roleLabel}
          {message.timestamp && <span className="msg-time">{new Date(message.timestamp).toLocaleTimeString()}</span>}
        </div>
        {(message.reasoning || message.thinking) && (
          <ThinkingBlock content={message.reasoning || message.thinking || ''} defaultOpen={false} />
        )}
        <MarkdownContent content={message.content || ''} />
        {message.tool_calls?.map(tc => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}
        {/* Message footer with actions */}
        <div className="msg-foot">
          <div className="msg-actions">
            {!isUser && <button className="msg-action-btn" onClick={handleSpeak} title="Read aloud">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>}
            <button className="msg-action-btn" onClick={handleCopy} title="Copy">
              {copied
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              }
            </button>
            {isLast && !isSystem && !busy && (
              <>
                <button className="msg-action-btn" onClick={handleRetry} title="Retry">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
                </button>
                {isUser && (
                  <button className="msg-action-btn" onClick={handleEdit} title="Edit">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full markdown renderer with headings, lists, code blocks, tables, blockquotes */
function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block: ```lang ... ```
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim().toLowerCase();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const code = codeLines.join('\n');
      if (lang === 'mermaid') {
        elements.push(<MermaidRenderer key={key++} code={code} />);
      } else if (lang === 'katex' || lang === 'math') {
        elements.push(<div key={key++} className="code-block-wrap"><KaTeXRenderer content={`$$${code}$$`} /></div>);
      } else if (lang === 'csv') {
        elements.push(<CSVTable key={key++} code={code} />);
      } else if (lang === 'diff') {
        elements.push(<DiffView key={key++} code={code} />);
      } else if (lang === 'html') {
        elements.push(<HTMLPreview key={key++} code={code} />);
      } else if (lang === 'excalidraw') {
        elements.push(<ExcalidrawView key={key++} code={code} />);
      } else if (lang === 'pdf') {
        elements.push(<PDFView key={key++} code={code} />);
      } else {
        elements.push(<CodeBlock key={key++} code={code} language={lang} />);
      }
      continue;
    }

    // Heading: ### Title
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = <InlineMarkdown text={hMatch[2]} />;
      if (level === 1) elements.push(<h1 key={key++}>{text}</h1>);
      else if (level === 2) elements.push(<h2 key={key++}>{text}</h2>);
      else if (level === 3) elements.push(<h3 key={key++}>{text}</h3>);
      else if (level === 4) elements.push(<h4 key={key++}>{text}</h4>);
      else if (level === 5) elements.push(<h5 key={key++}>{text}</h5>);
      else elements.push(<h6 key={key++}>{text}</h6>);
      i++;
      continue;
    }

    // Blockquote: > text
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={key++}>
          {quoteLines.map((ql, j) => <p key={j}><InlineMarkdown text={ql || ' '} /></p>)}
        </blockquote>
      );
      continue;
    }

    // Unordered list: - or * item
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      elements.push(<ul key={key++}>{items.map((item, j) => <li key={j}><InlineMarkdown text={item} /></li>)}</ul>);
      continue;
    }

    // Ordered list: 1. item
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(<ol key={key++}>{items.map((item, j) => <li key={j}><InlineMarkdown text={item} /></li>)}</ol>);
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      elements.push(<hr key={key++} />);
      i++;
      continue;
    }

    // Table: | col1 | col2 |
    if (/^\|.+\|/.test(line)) {
      const tableRows: string[][] = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i])) {
        tableRows.push(lines[i].split('|').map(c => c.trim()).filter(c => c !== ''));
        i++;
        // Skip separator row (|---|)
        if (i < lines.length && /^\|[\s\-:|]+\|/.test(lines[i])) i++;
      }
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1);
        elements.push(
          <table key={key++}>
            <thead><tr>{header.map((h, j) => <th key={j}><InlineMarkdown text={h} /></th>)}</tr></thead>
            <tbody>{body.map((row, ri) => <tr key={ri}>{row.map((c, ci) => <td key={ci}><InlineMarkdown text={c} /></td>)}</tr>)}</tbody>
          </table>
        );
      }
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(<p key={key++}><InlineMarkdown text={line} /></p>);
    i++;
  }

  return <>{elements}</>;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!codeRef.current) return;
    const Prism = (window as unknown as Record<string, unknown>).Prism;
    if (Prism && typeof (Prism as Record<string, unknown>).highlightElement === 'function') {
      try { (Prism as Record<string, unknown>).highlightElement?.(codeRef.current); } catch {}
    }
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const langClass = language ? `language-${language}` : '';

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <button className="btn-icon-xs" onClick={handleCopy} title="Copy">
          {copied ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
        </button>
      </div>
      <pre className="code-block"><code ref={codeRef} className={langClass}>{code}</code></pre>
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
            <span className="approval-btn-label">{t('approve_once')}</span>
          </button>
          <button className="approval-btn session" onClick={() => handleRespond('session')} disabled={responding} title="Allow for this session">
            <span className="approval-btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
            <span className="approval-btn-label">{t('approve_session')}</span>
          </button>
          <button className="approval-btn always" onClick={() => handleRespond('always')} disabled={responding} title="{t('approve_always')} this command pattern">
            <span className="approval-btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
            <span className="approval-btn-label">{t('approve_always')}</span>
          </button>
          <button className="approval-btn deny" onClick={() => handleRespond('deny')} disabled={responding} title="Deny — do not run this command">
            <span className="approval-btn-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
            <span className="approval-btn-label">{t('approve_deny')}</span>
          </button>
          <button className="approval-btn yolo" onClick={() => handleRespond('always')} disabled={responding} title="{t('approve_skip')} approvals this session">
            <span className="approval-btn-icon" aria-hidden="true">⚡</span>
            <span className="approval-btn-label">{t('approve_skip')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Clarify card — when agent needs user input */
function ClarifyCard({ question, choices, input, onInputChange, onChoice, onSubmit, onDismiss }: {
  question: string; choices: string[]; input: string;
  onInputChange: (v: string) => void; onChoice: (c: string) => void; onSubmit: () => void; onDismiss: () => void;
}) {
  return (
    <div className="approval-card visible">
      <div className="approval-inner">
        <div className="clarify-header" style={{ marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Clarification needed</span>
        </div>
        {question && <div className="clarify-question" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, marginBottom: 12 }}>{question}</div>}
        {choices.length > 0 && (
          <div className="clarify-choices" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {choices.map((c, i) => (
              <button key={i} className="clarify-choice" onClick={() => onChoice(c)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px',
                borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                border: '1px solid var(--accent-bg-strong)', background: 'var(--accent-bg)', color: 'var(--accent-text)',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, borderRadius: 999, background: 'var(--accent-bg-strong)', fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="clarify-response" style={{ display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => onInputChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
            placeholder="Type your response..." style={{
              flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none',
            }} />
          <button onClick={onSubmit} className="btn-primary-sm" style={{ padding: '10px 16px' }}>Send</button>
          <button onClick={onDismiss} className="btn-icon-sm" title="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Upload progress bar */
function UploadBar({ progress }: { progress: number }) {
  return (
    <div className="upload-bar-wrap active" style={{ margin: '0 auto', maxWidth: 780 }}>
      <div className="upload-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}

/** Inline CSV table renderer */
function CSVTable({ code }: { code: string }) {
  const lines = code.trim().split('\n');
  if (lines.length === 0) return null;
  const rows = lines.map(l => l.split(',').map(c => c.trim()));
  const header = rows[0];
  const body = rows.slice(1);
  return (
    <div className="code-block-wrap" style={{ maxHeight: 300, overflow: 'auto' }}>
      <div className="code-block-header"><span className="code-block-lang">CSV</span></div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
        <thead><tr>{header.map((h, i) => <th key={i} style={{ padding: '4px 8px', border: '1px solid var(--border)', background: 'var(--hover-bg)', position: 'sticky', top: 0 }}>{h}</th>)}</tr></thead>
        <tbody>{body.map((row, ri) => <tr key={ri}>{row.map((c, ci) => <td key={ci} style={{ padding: '3px 8px', border: '1px solid var(--border)' }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Inline diff viewer */
function DiffView({ code }: { code: string }) {
  const lines = code.split('\n');
  return (
    <div className="diff-block" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', margin: '8px 0' }}>
      <div className="code-block-header"><span className="code-block-lang">Diff</span></div>
      {lines.map((line, i) => {
        const cls = line.startsWith('+') ? 'diff-add' : line.startsWith('-') ? 'diff-del' : '';
        return <div key={i} className={`diff-line ${cls}`} style={{ padding: '0 10px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{line}</div>;
      })}
    </div>
  );
}

/** Sandboxed HTML preview */
function HTMLPreview({ code }: { code: string }) {
  return (
    <div className="code-block-wrap">
      <div className="code-block-header"><span className="code-block-lang">HTML</span></div>
      <iframe srcDoc={code} sandbox="allow-scripts" style={{ width: '100%', height: 300, border: 'none', borderTop: '1px solid var(--border)' }} title="HTML preview" />
    </div>
  );
}

/** Handoff hint bar */
function HandoffHint({ sessionId: _sid }: { sessionId: string }) {
  return (
    <div className="handoff-hint-container is-visible" style={{ padding: '8px 16px', margin: '0 auto', maxWidth: 780 }}>
      <div className="handoff-hint-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 13, background: 'var(--surface)', fontSize: 12 }}>
        <span className="handoff-hint-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
        <span className="handoff-hint-label" style={{ fontWeight: 700 }}>Session handoff available</span>
        <div className="handoff-hint-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="handoff-hint-action" style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Continue</button>
          <button className="handoff-hint-dismiss" style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

/** PDF renderer via PDF.js CDN */
function PDFView({ code: _b64 }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const pdfjsLib = (window as unknown as Record<string, unknown>).pdfjsLib;
    if (!pdfjsLib) { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.min.js'; s.onload = () => setPage(p => p); document.head.appendChild(s); return; }
    const bytes = Uint8Array.from(atob(_b64), c => c.charCodeAt(0));
    (pdfjsLib as Record<string, unknown>).getDocument?.({ data: bytes }).promise.then((doc: { numPages: number; getPage: (n: number) => Promise<{ render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => Promise<void> }> }) => {
      setTotal(doc.numPages);
      doc.getPage(page).then(p => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d')!;
        const vp = p.getViewport({ scale: 1.5 });
        canvasRef.current.width = (vp as { width: number }).width;
        canvasRef.current.height = (vp as { height: number }).height;
        p.render({ canvasContext: ctx, viewport: vp });
      });
    }).catch(() => {});
  }, [_b64, page]);

  if (!total) return <div className="code-block-wrap"><div className="code-block-header"><span className="code-block-lang">PDF</span></div><pre className="code-block" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading PDF…</pre></div>;

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-block-lang">PDF ({page}/{total})</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon-xs" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>◀</button>
          <button className="btn-icon-xs" onClick={() => setPage(Math.min(total, page + 1))} disabled={page >= total}>▶</button>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
    </div>
  );
}

/** Excalidraw renderer */
function ExcalidrawView({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const init = () => {
      try {
        JSON.parse(code);
        const Exc = (window as unknown as Record<string, unknown>).ExcalidrawLib;
        if (Exc && typeof (Exc as Record<string, unknown>).default === 'function') {
          el.innerHTML = '';
          const root = document.createElement('div'); root.style.width = '100%'; root.style.height = '500px';
          el.appendChild(root);
          try { ((Exc as Record<string, unknown>).default as (o: Record<string, unknown>) => void)({ initialData: JSON.parse(code), viewModeEnabled: true, theme: 'dark' }); } catch { el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Excalidraw loaded — scene ready</div>'; }
        } else {
          el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">Excalidraw library loading…</div>';
        }
      } catch { el.innerHTML = '<pre style="padding:12px;font-size:11px;overflow:auto;max-height:200px;color:var(--muted)">' + code + '</pre>'; }
    };
    if (!(window as unknown as Record<string, unknown>).ExcalidrawLib) {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17/dist/excalidraw.production.min.js';
      s.onload = init; document.head.appendChild(s);
    } else init();
  }, [code]);
  return <div className="code-block-wrap"><div className="code-block-header"><span className="code-block-lang">Excalidraw</span></div><div ref={containerRef} style={{ minHeight: 200 }} /></div>;
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
