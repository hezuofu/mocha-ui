import { useEffect, useCallback } from 'react';
import { getLogs } from '../../api/endpoints';
import { useLogsStore } from '../../store/logsStore';

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

export default function LogsPanel() {
  const file = useLogsStore(s => s.file);
  const tail = useLogsStore(s => s.tail);
  const severity = useLogsStore(s => s.severity);
  const autoRefresh = useLogsStore(s => s.autoRefresh);
  const wrap = useLogsStore(s => s.wrap);
  const logs = useLogsStore(s => s.logs);
  const status = useLogsStore(s => s.status);
  const loading = useLogsStore(s => s.loading);
  const refreshKey = useLogsStore(s => s.refreshKey);
  const setLogs = useLogsStore(s => s.setLogs);
  const setLoading = useLogsStore(s => s.setLoading);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLogs(file, tail);
      const lines = data.lines || [];
      const bytes = data.total_bytes ? Number(data.total_bytes).toLocaleString() : '0';
      const when = data.mtime ? new Date(data.mtime * 1000).toLocaleString() : 'unknown';
      setLogs(lines, `${lines.length} / ${tail} lines · ${bytes} bytes · ${when}`);
    } catch {
      setLogs([], 'Failed to load logs');
    }
  }, [file, tail, refreshKey, setLogs, setLoading]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <>
      <div className={`logs-output${wrap ? ' wrap' : ''}`} id="logsOutput">
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 12, padding: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 12, padding: 12 }}>No log entries</div>
        ) : (
          filtered.map((line, i) => (
            <div key={i} className={`log-line ${severityClass(line)}`}>{line}</div>
          ))
        )}
      </div>
    </>
  );
}

/* ── Sidebar controls ── */
export function LogsControls() {
  const file = useLogsStore(s => s.file);
  const tail = useLogsStore(s => s.tail);
  const severity = useLogsStore(s => s.severity);
  const autoRefresh = useLogsStore(s => s.autoRefresh);
  const wrap = useLogsStore(s => s.wrap);
  const logs = useLogsStore(s => s.logs);
  const setFile = useLogsStore(s => s.setFile);
  const setTail = useLogsStore(s => s.setTail);
  const setSeverity = useLogsStore(s => s.setSeverity);
  const setAutoRefresh = useLogsStore(s => s.setAutoRefresh);
  const setWrap = useLogsStore(s => s.setWrap);

  const copyAll = async () => {
    await navigator.clipboard.writeText(logs.join('\n'));
  };

  return (
    <div className="logs-control-panel">
      <label className="logs-control-label" htmlFor="logsFile">File</label>
      <select id="logsFile" value={file} onChange={e => setFile(e.target.value)}>
        {LOG_FILES.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <label className="logs-control-label" htmlFor="logsTail">Tail</label>
      <select id="logsTail" value={tail} onChange={e => setTail(Number(e.target.value))}>
        {TAIL_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <label className="logs-control-label" htmlFor="logsSeverityFilter">Severity</label>
      <select id="logsSeverityFilter" value={severity} onChange={e => setSeverity(e.target.value)}>
        {SEVERITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <label className="logs-check-row">
        <input id="logsAutoRefresh" type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
        <span>Auto-refresh (5s)</span>
      </label>
      <label className="logs-check-row">
        <input id="logsWrap" type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} />
        <span>Wrap lines</span>
      </label>
      <button type="button" className="logs-copy" id="logsCopyAll" onClick={copyAll}>Copy all</button>
    </div>
  );
}
