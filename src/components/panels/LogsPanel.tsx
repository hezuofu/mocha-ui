import { useState, useEffect, useCallback } from 'react';
import { getLogs } from '../../api/endpoints';
/* All icons replaced with original inline SVGs from static/icons.js */

const LOG_FILES = ['agent', 'errors', 'gateway'] as const;
const TAIL_OPTIONS = [100, 200, 500, 1000];
const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'errors', label: 'Errors' },
  { value: 'warnings', label: 'Warnings+' },
];

export default function LogsPanel() {
  const [file, setFile] = useState<string>('agent');
  const [tail, setTail] = useState<number>(200);
  const [severity, setSeverity] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLogs(file, tail);
      setLogs(data.lines || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [file, tail]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const filtered = logs.filter(line => {
    if (severity === 'all') return true;
    const lower = line.toLowerCase();
    if (severity === 'errors') return lower.includes('error') || lower.includes('critical') || lower.includes('fatal');
    if (severity === 'warnings') return lower.includes('warn') || lower.includes('error') || lower.includes('critical');
    return true;
  });

  const copyAll = async () => {
    await navigator.clipboard.writeText(filtered.join('\n'));
  };

  return (
    <div className="logs-panel">
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
      <div className={`logs-viewport ${wrap ? 'wrap' : ''}`}>
        {loading ? (
          <div className="panel-loading"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>
        ) : filtered.length === 0 ? (
          <div className="panel-empty" style={{ padding: 12 }}>No log entries</div>
        ) : (
          filtered.map((line, i) => (
            <div key={i} className={`log-line ${getLogClass(line)}`}>
              <span className="log-line-num">{i + 1}</span>
              <span className="log-line-text">{line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getLogClass(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('critical') || lower.includes('fatal')) return 'log-error';
  if (lower.includes('warn')) return 'log-warn';
  if (lower.includes('info')) return 'log-info';
  return '';
}
