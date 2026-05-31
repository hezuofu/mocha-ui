import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    Terminal?: new (opts?: Record<string, unknown>) => {
      open(el: HTMLElement): void;
      write(s: string): void;
      writeln(s: string): void;
      focus(): void;
      dispose(): void;
      onData(cb: (d: string) => void): void;
      onTitleChange(cb: (t: string) => void): void;
      loadAddon(a: unknown): void;
      options: Record<string, unknown>;
      element?: HTMLElement;
    };

  }
}

export default function ComposerTerminal() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<ReturnType<NonNullable<Window['Terminal']>['prototype']> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (window.Terminal) {
      initTerminal();
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js';
      script.onload = () => {
        setLoaded(true); initTerminal();
      };
      document.head.appendChild(script);
    }
  }, [open]);

  const initTerminal = () => {
    if (!terminalRef.current || !window.Terminal) return;
    if (termRef.current) { termRef.current.dispose(); termRef.current = null; }
    const term = new window.Terminal!({
      cursorBlink: true, fontSize: 13, fontFamily: "'SF Mono', 'Fira Code', monospace",
      theme: { background: '#1A1A2E', foreground: '#e2e8f0', cursor: '#FFD700' },
      rows: collapsed ? 4 : 20,
    });
    term.open(terminalRef.current);
    
    term.writeln('Hermes Terminal');
    term.writeln('');

    // Connect to backend terminal SSE endpoint
    const es = new EventSource('/api/terminal/output');
    es.addEventListener('output', (e: MessageEvent) => {
      try { term.write(e.data); } catch {}
    });
    es.addEventListener('error', () => { term.writeln('[Connection closed]'); es.close(); });

    term.onData((data: string) => {
      // Send input to backend
      fetch('/api/terminal/output', { method: 'POST', body: JSON.stringify({ input: data }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    });
    term.focus();
    termRef.current = term;
  };

  return (
    <>
      {/* Toggle button */}
      <button type="button" className="icon-btn" onClick={() => { setOpen(!open); setCollapsed(false); }}
        title="Toggle terminal" style={{ display: 'inline-flex' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
      </button>

      {open && (
        <div className={`approval-card visible`} style={{ position: 'relative', bottom: 'auto' }}>
          <div className="approval-inner" style={{ padding: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 4px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.02em' }}>Terminal</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button className="btn-icon-sm" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{collapsed ? <polyline points="6 9 12 15 18 9"/> : <polyline points="6 15 12 9 18 15"/>}</svg>
                </button>
                <button className="btn-icon-sm" onClick={() => { if (termRef.current) termRef.current.writeln(''); termRef.current?.focus(); }} title="Clear">Clear</button>
                <button className="btn-icon-sm" onClick={() => { setOpen(false); }} title="Close">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div ref={terminalRef} style={{ minHeight: collapsed ? 80 : 200, maxHeight: 400, overflow: 'auto', background: '#1A1A2E', borderRadius: 6 }} />
          </div>
        </div>
      )}
    </>
  );
}
