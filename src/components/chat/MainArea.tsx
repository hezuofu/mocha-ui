import { useSessionStore } from '../../store/sessionStore';
import { useStreamingStore } from '../../store/streamingStore';
import { usePanelStore } from '../../store/panelStore';
import type { Message } from '../../types';
import { approveCommand, retryMessage, editAndRegenerate } from '../../api/endpoints';
import { connectApprovalSSE } from '../../api/sse';
import { useState, useCallback, useRef, useEffect } from 'react';
import Composer from './Composer';
import ToolCallCard from './ToolCallCard';
import ThinkingBlock from './ThinkingBlock';
import StreamingIndicator from './StreamingIndicator';
import { KaTeXRenderer, MermaidRenderer } from './SpecialRenderers';
import { useI18n } from '../../i18n';
import InsightsPanel from '../panels/InsightsPanel';
import LogsPanel from '../panels/LogsPanel';
import MemoryPanel from '../panels/MemoryPanel';
import SettingsPanel from '../panels/SettingsPanel';
import AppearancePanel from '../panels/AppearancePanel';
import SystemPanel from '../panels/SystemPanel';
import PreferencesPanel from '../panels/PreferencesPanel';
import ProvidersPanel from '../panels/ProvidersPanel';
import PluginsPanel from '../panels/PluginsPanel';
import ProfileDetailPanel from '../panels/ProfileDetailPanel';
import TaskDetailPanel from '../panels/TaskDetailPanel';
import KanbanBoardPanel from '../panels/KanbanBoardPanel';
import SkillDetailPanel from '../panels/SkillDetailPanel';
import { useLogsStore } from '../../store/logsStore';

export default function MainArea() {
  const { t } = useI18n();
  const activePanel = usePanelStore(s => s.activePanel);
  const settingsSection = usePanelStore(s => s.settingsSection);
  const setSettingsSection = usePanelStore(s => s.setSettingsSection);
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

  useEffect(() => {
    if ((window as any).Prism) return;
    const css = document.createElement('link'); css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js';
    js.onload = () => { const a = document.createElement('script'); a.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js'; document.head.appendChild(a); };
    document.head.appendChild(js);
  }, []);
  useEffect(() => { if (!activeSid) return; const c = connectApprovalSSE(activeSid, (count, aid) => setApprovalSse(count, aid)); return c; }, [activeSid, setApprovalSse]);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const scrollPinnedRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const nearBottomCountRef = useRef(0);

  useEffect(() => {
    const el = messagesRef.current; if (!el) return;
    const h = () => {
      if (programmaticScrollRef.current) { programmaticScrollRef.current = false; return; }
      const d = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(d > 100);
      if (d < 250) { nearBottomCountRef.current++; if (nearBottomCountRef.current >= 2) scrollPinnedRef.current = true; }
      else { nearBottomCountRef.current = 0; scrollPinnedRef.current = false; }
    };
    el.addEventListener('scroll', h, { passive: true }); return () => el.removeEventListener('scroll', h);
  }, []);
  useEffect(() => { if (scrollPinnedRef.current) { programmaticScrollRef.current = true; bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' }); } }, [messages, toolCalls, isStreaming]);
  const scrollToBottom = useCallback(() => { scrollPinnedRef.current = true; programmaticScrollRef.current = true; bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);

  const [offline, setOffline] = useState(false);
  const [reconnect, setReconnect] = useState(false);
  const [agentDown, setAgentDown] = useState(false);
  const [clarifyInput, setClarifyInput] = useState('');
  const [uploadProgress] = useState(0);
  const [uploading] = useState(false);

  useEffect(() => {
    const goOff = () => setOffline(true); const goOn = () => { setOffline(false); setReconnect(true); setTimeout(() => setReconnect(false), 8000); };
    window.addEventListener('offline', goOff); window.addEventListener('online', goOn);
    return () => { window.removeEventListener('offline', goOff); window.removeEventListener('online', goOn); };
  }, []);
  useEffect(() => {
    const check = () => { import('../../api/endpoints').then(({ getAgentHealth }) => { getAgentHealth().then((h: any) => setAgentDown(h?.status === 'error')).catch(() => {}); }).catch(() => {}); };
    check(); const id = setInterval(check, 60000); return () => clearInterval(id);
  }, []);

  const showingClass = activePanel !== 'chat' ? ` showing-${activePanel}` : '';

  return (
    <main className={`main${showingClass}`}>

      {/* == CHAT == */}
      <div id="mainChat" className="main-view">
        {offline && <Banner msg="Connection lost" sub="Your browser is offline." btn="Retry" onClick={() => window.location.reload()} />}
        {reconnect && <Banner msg="Connection restored." sub="" btn="Reload" onClick={() => window.location.reload()} dismiss={() => setReconnect(false)} />}
        {agentDown && <div className="agent-health-banner visible" role="alert"><div><strong>Hermes agent is not responding</strong></div><button onClick={() => setAgentDown(false)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--error) 45%, var(--surface))', background: 'color-mix(in srgb, var(--error) 10%, var(--surface))', color: 'var(--error)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Dismiss</button></div>}
        <div className="messages-shell">
          <button className="session-jump-btn session-jump-btn--start" onClick={() => messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: messages.length > 5 ? 'flex' : 'none' }}><span aria-hidden="true">↑</span><span>Start</span></button>
          <button className="scroll-to-bottom-btn" style={{ display: showScrollBtn ? 'flex' : 'none' }} onClick={scrollToBottom}><span aria-hidden="true">↓</span><span className="session-jump-btn__text">End</span></button>
          <div className="messages" id="messages" ref={messagesRef}>
            {messages.length === 0 && !busy && <EmptyState setSuggestedInput={setSuggestedInput} t={t} />}
            <div className="messages-inner">
              {messages.map((msg, i) => <MessageItem key={i} message={msg} index={i} isLast={i === messages.length - 1} />)}
              {toolCalls.length > 0 && <ActivityGroup toolCalls={toolCalls} />}
              {isStreaming && <StreamingIndicator />}
            </div>
            <div ref={bottomRef} />
          </div>
        </div>
        {approvalCount > 0 && <ApprovalBar count={approvalCount} />}
        {clarifyPending && <ClarifyCard question={clarifyQuestionState} choices={clarifyChoicesState} input={clarifyInput} onInputChange={setClarifyInput} onChoice={(c: string) => { hideClarify(); setClarifyInput(''); if (activeSid) import('../../api/endpoints').then(({ approveCommand: ac }) => ac(activeSid, c, 'clarify')).catch(() => {}); }} onSubmit={() => { hideClarify(); if (clarifyInput.trim() && activeSid) import('../../api/endpoints').then(({ approveCommand: ac }) => ac(activeSid, clarifyInput.trim(), 'clarify_response')).catch(() => {}); setClarifyInput(''); }} onDismiss={() => hideClarify()} />}
        {compressionRunning && <div className="streaming-indicator" style={{ justifyContent: 'center', padding: '8px 0', color: 'var(--accent-text)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg><span>{compressionMessage || 'Compressing context...'}</span></div>}
        {uploading && <div className="upload-bar-wrap active" style={{ margin: '0 auto', maxWidth: 780 }}><div className="upload-bar" style={{ width: `${uploadProgress}%` }} /></div>}
        <Composer />
      </div>

      {/* == INSIGHTS == */}
      <div id="mainInsights" className="main-view">
        <div className="main-view-header"><div className="main-view-title">Usage Analytics</div></div>
        <div className="main-view-content" id="insightsContent" style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <InsightsPanel />
        </div>
      </div>

      {/* == LOGS == */}
      <div id="mainLogs" className="main-view">
        <LogsHeader />
        <div className="main-view-body logs-main-body">
          <div className="main-view-content logs-content"><LogsPanel /></div>
        </div>
      </div>

      {/* == SETTINGS == */}
      <div id="mainSettings" className="main-view">
        <div className="settings-main">
          <div className={`settings-pane${settingsSection === 'conversation' ? ' active' : ''}`} id="settingsPaneConversation"><SettingsPanel /></div>
          <div className={`settings-pane${settingsSection === 'appearance' ? ' active' : ''}`} id="settingsPaneAppearance"><AppearancePanel /></div>
          <div className={`settings-pane${settingsSection === 'preferences' ? ' active' : ''}`} id="settingsPanePreferences"><PreferencesPanel /></div>
          <div className={`settings-pane${settingsSection === 'providers' ? ' active' : ''}`} id="settingsPaneProviders"><ProvidersPanel /></div>
          <div className={`settings-pane${settingsSection === 'plugins' ? ' active' : ''}`} id="settingsPanePlugins"><PluginsPanel /></div>
          <div className={`settings-pane${settingsSection === 'system' ? ' active' : ''}`} id="settingsPaneSystem"><SystemPanel /></div>
        </div>
      </div>

      {/* == OTHER main-view shells (CSS hides them by default) == */}
      <div id="mainTasks" className="main-view">
        <TaskDetailPanel />
      </div>
      <div id="mainKanban" className="main-view">
        <KanbanBoardPanel />
      </div>
      <div id="mainSkills" className="main-view">
        <SkillDetailPanel />
      </div>
      <div id="mainMemory" className="main-view">
        <MemoryPanel />
      </div>
      <div id="mainWorkspaces" className="main-view" />
      <div id="mainProfiles" className="main-view">
        <ProfileDetailPanel />
      </div>
    </main>
  );
}

/* ── Banner ── */
function Banner({ msg, sub, btn, onClick, dismiss }: { msg: string; sub?: string; btn: string; onClick: () => void; dismiss?: () => void }) {
  return (
    <div className="offline-banner visible" role="status">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><strong>{msg}</strong>{sub ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span> : null}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {dismiss && <button onClick={dismiss} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Dismiss</button>}
        <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{btn}</button>
      </div>
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ setSuggestedInput, t }: { setSuggestedInput: (s: string) => void; t: (k: string) => string }) {
  return (
    <div className="empty-state" id="emptyState">
      <div className="empty-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="80" height="80"><defs><linearGradient id="hermes-gold" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#F5C542"/><stop offset="100%" stopColor="#D4961C"/></linearGradient></defs><rect x="30" y="10" width="4" height="46" rx="2" fill="url(#hermes-gold)"/><path d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20" fill="#F5C542" opacity="0.9"/><path d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20" fill="#F5C542" opacity="0.9"/><circle cx="32" cy="10" r="4" fill="#F5C542"/></svg>
      </div>
      <h2>{t('empty_title')}</h2>
      <p>{t('empty_subtitle')}</p>
      <div className="suggestion-grid">
        <button className="suggestion" onClick={() => setSuggestedInput("What files are in this workspace?")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>What files are in this workspace?</span></button>
        <button className="suggestion" onClick={() => setSuggestedInput("What's on my schedule today?")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg><span>What's on my schedule today?</span></button>
        <button className="suggestion" onClick={() => setSuggestedInput("Help me plan a small project.")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg><span>Help me plan a small project.</span></button>
      </div>
    </div>
  );
}

/* ── MessageItem ── */
function MessageItem({ message, index, isLast }: { message: Message; index: number; isLast: boolean }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user'; const isSystem = message.role === 'system'; const isTool = message.role === 'tool';
  const activeSid = useSessionStore(s => s.activeSessionId); const busy = useSessionStore(s => s.busy);
  const handleCopy = useCallback(async () => { if (message.content) { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); } }, [message.content]);
  const handleRetry = useCallback(async () => { if (!activeSid || busy) return; try { await retryMessage(activeSid, index); } catch {} }, [activeSid, index, busy]);
  const handleEdit = useCallback(async () => { if (!activeSid || busy || !message.content) return; const nc = prompt('Edit message:', message.content); if (nc && nc !== message.content) { try { await editAndRegenerate(activeSid, index, nc); } catch {} } }, [activeSid, index, busy, message.content]);
  const handleSpeak = useCallback(() => { if (!message.content || !window.speechSynthesis) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(message.content); u.rate = 0.9; u.lang = 'en-US'; window.speechSynthesis.speak(u); }, [message.content]);
  if (isTool) return null;
  const role = isUser ? 'user' : isSystem ? 'system' : 'assistant';
  const rl = isUser ? 'You' : isSystem ? 'System' : 'Hermes';
  return (
    <div className={`msg-row ${role}`} data-role={role}>
      <div className={`role-icon ${role}`}>{isUser ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg> : isSystem ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>}</div>
      <div className="msg-body">
        <div className={`msg-role ${role}`}>{rl}{message.timestamp && <span className="msg-time">{new Date(message.timestamp).toLocaleTimeString()}</span>}</div>
        {(message.reasoning || message.thinking) && <ThinkingBlock content={message.reasoning || message.thinking || ''} defaultOpen={false} />}
        <MarkdownContent content={message.content || ''} />
        {message.tool_calls?.map((tc: any) => <ToolCallCard key={tc.id} toolCall={tc} />)}
        <div className="msg-foot"><div className="msg-actions">
          {!isUser && <button className="msg-action-btn" onClick={handleSpeak} title="Read aloud"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg></button>}
          <button className="msg-action-btn" onClick={handleCopy} title="Copy">{copied ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}</button>
          {isLast && !isSystem && !busy && <><button className="msg-action-btn" onClick={handleRetry} title="Retry"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg></button>{isUser && <button className="msg-action-btn" onClick={handleEdit} title="Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>}</>}
        </div></div>
      </div>
    </div>
  );
}

/* ── Markdown ── */
function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n'); const els: React.ReactNode[] = []; let i = 0; let key = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) { const lang = l.slice(3).trim().toLowerCase(); const cl: string[] = []; i++; while (i < lines.length && !/^```/.test(lines[i])) { cl.push(lines[i]); i++; } i++; const c = cl.join('\n');
      if (lang === 'mermaid') els.push(<MermaidRenderer key={key++} code={c} />);
      else if (lang === 'katex' || lang === 'math') els.push(<div key={key++} className="code-block-wrap"><KaTeXRenderer content={`$$${c}$$`} /></div>);
      else els.push(<CodeBlock key={key++} code={c} language={lang} />); continue; }
    const hm = l.match(/^(#{1,6})\s+(.+)/); if (hm) { const lv = hm[1].length; const t = <InlineMarkdown text={hm[2]} />; if (lv===1) els.push(<h1 key={key++}>{t}</h1>); else if (lv===2) els.push(<h2 key={key++}>{t}</h2>); else if (lv===3) els.push(<h3 key={key++}>{t}</h3>); else if (lv===4) els.push(<h4 key={key++}>{t}</h4>); else if (lv===5) els.push(<h5 key={key++}>{t}</h5>); else els.push(<h6 key={key++}>{t}</h6>); i++; continue; }
    if (/^>\s?/.test(l)) { const ql: string[] = []; while (i < lines.length && /^>\s?/.test(lines[i])) { ql.push(lines[i].replace(/^>\s?/, '')); i++; } els.push(<blockquote key={key++}>{ql.map((q,j)=><p key={j}><InlineMarkdown text={q||' '}/></p>)}</blockquote>); continue; }
    if (/^[-*]\s/.test(l)) { const it: string[] = []; while (i < lines.length && /^[-*]\s/.test(lines[i])) { it.push(lines[i].replace(/^[-*]\s/, '')); i++; } els.push(<ul key={key++}>{it.map((itm,j)=><li key={j}><InlineMarkdown text={itm}/></li>)}</ul>); continue; }
    if (/^\d+\.\s/.test(l)) { const it: string[] = []; while (i < lines.length && /^\d+\.\s/.test(lines[i])) { it.push(lines[i].replace(/^\d+\.\s/, '')); i++; } els.push(<ol key={key++}>{it.map((itm,j)=><li key={j}><InlineMarkdown text={itm}/></li>)}</ol>); continue; }
    if (/^---+\s*$/.test(l) || /^\*\*\*+\s*$/.test(l)) { els.push(<hr key={key++} />); i++; continue; }
    if (l.trim() === '') { i++; continue; }
    els.push(<p key={key++}><InlineMarkdown text={l}/></p>); i++;
  }
  return <>{els}</>;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false); const cr = useRef<HTMLElement>(null);
  useEffect(() => { if (!cr.current) return; const P = (window as any).Prism; if (P?.highlightElement) try { P.highlightElement(cr.current); } catch {} }, [code, language]);
  return (
    <div className="code-block-wrap"><div className="code-block-header"><span className="code-block-lang">{language || 'code'}</span>
      <button className="panel-icon-btn" onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} title="Copy">{copied ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}</button>
    </div><pre className="code-block"><code ref={cr} className={language ? `language-${language}` : ''}>{code}</code></pre></div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  if (!text) return <>{' '}</>;
  const parts = text.split(/(`[^`]+`)/g);
  return <>{parts.map((p,i) => { if (/^`[^`]+`$/.test(p)) return <code key={i}>{p.slice(1,-1)}</code>;
    return <span key={i}>{p.split(/(\*\*\*[^*]+\*\*\*)/g).map((s,j)=> /^\*\*\*[^*]+\*\*\*$/.test(s) ? <strong key={j}><em>{s.slice(3,-3)}</em></strong> : <span key={j}>{s.split(/(\*\*[^*]+\*\*)/g).map((t,k)=> /^\*\*[^*]+\*\*$/.test(t) ? <strong key={k}>{t.slice(2,-2)}</strong> : <span key={k}>{t.split(/(\*[^*]+\*)/g).map((u,l)=> /^\*[^*]+\*$/.test(u) ? <em key={l}>{u.slice(1,-1)}</em> : <span key={l}>{u}</span>)}</span>)}</span>)}</span>;
  })}</>;
}

function ActivityGroup({ toolCalls }: { toolCalls: any[] }) {
  const [exp, setExp] = useState(false); if (!toolCalls.length) return null;
  return <div className="activity-group"><div className="activity-header" onClick={() => setExp(!exp)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg><span>Activity: {toolCalls.length} tool{toolCalls.length!==1?'s':''}</span><button className="panel-icon-btn" style={{marginLeft:'auto'}}>{exp?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}</button></div>{exp&&<div className="activity-body">{toolCalls.map((tc:any)=><ToolCallCard key={tc.id} toolCall={tc}/>)}</div>}</div>;
}

function ApprovalBar({ count }: { count: number }) {
  const { t } = useI18n(); const activeSid = useSessionStore(s => s.activeSessionId);
  const approvalId = useStreamingStore(s => s.approvalId); const [rs, setRs] = useState(false);
  const hr = useCallback(async (c: string) => { if (!activeSid||!approvalId||rs) return; setRs(true); try { await approveCommand(activeSid,approvalId,c); } catch {} setRs(false); }, [activeSid,approvalId,rs]);
  if (!count) return null;
  return <div className="approval-card visible"><div className="approval-inner"><div className="approval-header"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Approval required</span></div><div className="approval-desc">{count} tool execution{count>1?'s':''} require your approval</div><div className="approval-btns"><button className="approval-btn once" onClick={()=>hr('once')} disabled={rs}>Allow once</button><button className="approval-btn session" onClick={()=>hr('session')} disabled={rs}>Allow session</button><button className="approval-btn always" onClick={()=>hr('always')} disabled={rs}>Allow always</button><button className="approval-btn deny" onClick={()=>hr('deny')} disabled={rs}>Deny</button><button className="approval-btn yolo" onClick={()=>hr('always')} disabled={rs}>YOLO</button></div></div></div>;
}

function ClarifyCard({ question, choices, input, onInputChange, onChoice, onSubmit, onDismiss }: { question: string; choices: string[]; input: string; onInputChange: (v:string)=>void; onChoice: (c:string)=>void; onSubmit: ()=>void; onDismiss: ()=>void }) {
  return <div className="approval-card visible"><div className="approval-inner"><div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Clarification needed</span></div>{question&&<div style={{fontSize:14,color:'var(--text)',lineHeight:1.7,marginBottom:12}}>{question}</div>}{choices.length>0&&<div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>{choices.map((c,i)=><button key={i} onClick={()=>onChoice(c)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',textAlign:'left',border:'1px solid var(--accent-bg-strong)',background:'var(--accent-bg)',color:'var(--accent-text)'}}><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:24,height:24,borderRadius:999,background:'var(--accent-bg-strong)',fontSize:11,fontWeight:800}}>{i+1}</span>{c}</button>)}</div>}<div style={{display:'flex',gap:8}}><input value={input} onChange={e=>onInputChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSubmit()}} placeholder="Type your response..." style={{flex:1,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--bg)',color:'var(--text)',fontSize:13,outline:'none'}}/><button onClick={onSubmit} style={{padding:'10px 16px',borderRadius:8,border:'none',background:'var(--accent)',color:'#000',cursor:'pointer',fontSize:13,fontWeight:600}}>Send</button><button onClick={onDismiss} style={{padding:8,border:'none',background:'transparent',color:'var(--muted)',cursor:'pointer'}} title="Dismiss"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div></div>;
}

/* ── LogsHeader: main-view-header with dynamic status from store ── */
function LogsHeader() {
  const status = useLogsStore(s => s.status);
  const logs = useLogsStore(s => s.logs);
  const copyAll = async () => { await navigator.clipboard.writeText(logs.join('\n')); };
  return (
    <div className="main-view-header">
      <div>
        <div className="main-view-title">Logs</div>
        <div className="logs-status">{status}</div>
      </div>
      <div className="main-view-actions">
        <button type="button" className="logs-copy compact" onClick={copyAll}>Copy all</button>
      </div>
    </div>
  );
}
