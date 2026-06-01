import { useState, useEffect, useCallback } from 'react';
import { getLogs } from '../../api/endpoints';

const LOG_FILES = ['agent', 'errors', 'gateway'] as const;
const TAIL_OPTIONS = [100, 200, 500, 1000];
const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'errors', label: 'Errors' },
  { value: 'warnings', label: 'Warnings+' },
];

function severityClass(line: string): string {
  const text = String(line || '').toUpperCase();
  if (/\b(WARNING|WARN)\b/.test(text)) return 'log-line-warning';
  if (/\b(DEBUG)\b/.test(text)) return 'log-line-debug';
  if (/\b(INFO)\b/.test(text)) return 'log-line-info';
  if (/\b(ERROR|CRITICAL|TRACEBACK)\b/.test(text)) return 'log-line-error';
  return '';
}

export default function LogsPanel({ sidebar }: { sidebar?: boolean }) {
  const [file, setFile] = useState<string>('agent');
  const [tail, setTail] = useState<number>(200);
  const [severity, setSeverity] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (animate?: boolean) => {
    setLoading(true);
    try {
      const data = await getLogs(file, tail);
      const lines = data.lines || [];
      setLogs(lines);
      const bytes = data.total_bytes ? Number(data.total_bytes).toLocaleString() : '0';
      const when = data.mtime ? new Date(data.mtime * 1000).toLocaleString() : 'unknown';
      setStatus(`${lines.length} / ${tail} lines · ${bytes} bytes · ${when}`);
    } catch {
      setLogs([]);
      setStatus('Failed to load logs');
    }
    setLoading(false);
  }, [file, tail]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(), 5000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const filtered = logs.filter(line => {
    if (severity === 'all') return true;
    const sev = severityClass(line);
    if (severity === 'errors') return sev === 'log-line-error';
    if (severity === 'warnings') return sev === 'log-line-warning' || sev === 'log-line-error';
    return true;
  });

  const copyAll = async () => {
    await navigator.clipboard.writeText(filtered.join('\n'));
  };

  // Sidebar mode: only render controls
  if (sidebar) {
    return (
      <div className="logs-control-panel">
        <label className="logs-control-label">File</label>
        <select value={file} onChange={e => setFile(e.target.value)}>
          {LOG_FILES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <label className="logs-control-label">Tail</label>
        <select value={tail} onChange={e => setTail(Number(e.target.value))}>
          {TAIL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <label className="logs-control-label">Severity</label>
        <select value={severity} onChange={e => setSeverity(e.target.value)}>
          {SEVERITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="logs-check-row">
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
          <span>Auto-refresh (5s)</span>
        </label>
        <label className="logs-check-row">
          <input type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} />
          <span>Wrap lines</span>
        </label>
        <button className="logs-copy" onClick={copyAll}>Copy all</button>
      </div>
    );
  }

  // Main area mode: full output
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="logs-control-panel">
        <label className="logs-control-label">File</label>
        <select value={file} onChange={e => setFile(e.target.value)}>
          {LOG_FILES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <label className="logs-control-label">Tail</label>
        <select value={tail} onChange={e => setTail(Number(e.target.value))}>
          {TAIL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <label className="logs-control-label">Severity</label>
        <select value={severity} onChange={e => setSeverity(e.target.value)}>
          {SEVERITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="logs-check-row">
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
          <span>Auto-refresh (5s)</span>
        </label>
        <label className="logs-check-row">
          <input type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} />
          <span>Wrap lines</span>
        </label>
        <button className="logs-copy" onClick={copyAll}>Copy all</button>
      </div>
      <div id="logsOutput" className={wrap ? 'wrap' : ''} style={{ flex: 1, overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }}>
        {loading ? (
          <div className="logs-empty" style={{ padding: 12, color: 'var(--muted)', textAlign: 'center' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="logs-empty" style={{ padding: 12, color: 'var(--muted)', textAlign: 'center' }}>No log entries</div>
        ) : (
          filtered.map((line, i) => (
            <div key={i} className={`log-line ${severityClass(line)}`}>{line}</div>
          ))
        )}
      </div>
      <div id="logsStatus" style={{ padding: '6px 12px', fontSize: 10, color: 'var(--muted)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>{status}</div>
    </div>
  );
}
