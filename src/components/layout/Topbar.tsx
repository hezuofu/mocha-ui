import { useSessionStore } from '../../store/sessionStore';
import { useSettingsStore } from '../../store/settingsStore';
import { exportSession, clearConversation } from '../../api/endpoints';

export default function Topbar() {
  const activeSid = useSessionStore(s => s.activeSessionId);
  const messages = useSessionStore(s => s.messages);
  const model = useSettingsStore(s => s.model);

  if (!activeSid) return null;
  const msgCount = messages.length;

  const handleExport = async (format: 'markdown' | 'json') => {
    try {
      const r = await exportSession(activeSid, format);
      const blob = new Blob([r.data], { type: format === 'json' ? 'application/json' : 'text/markdown' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `session.${format === 'json' ? 'json' : 'md'}`; a.click();
    } catch {}
  };

  const handleClear = async () => {
    if (!confirm('Clear all messages?')) return;
    try { await clearConversation(activeSid); } catch {}
  };

  return (
    <div className="topbar" style={{
      padding: '8px 14px', borderBottom: '1px solid var(--border)',
      background: 'var(--topbar-bg)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, zIndex: 5,
    }}>
      {/* Left: session info */}
      <div style={{ minWidth: 0 }}>
        <div className="topbar-title" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Hermes
        </div>
        <div className="topbar-meta" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
          {msgCount} messages
          {model ? ` · ${model}` : ''}
        </div>
      </div>

      {/* Right: action chips */}
      <div className="topbar-chips" style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => handleExport('markdown')} className="btn-icon-sm" title="Download as Markdown"
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
        <button onClick={() => handleExport('json')} className="btn-icon-sm" title="Export as JSON"
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Export
        </button>
        <button onClick={handleClear} className="btn-icon-sm danger" title="Clear conversation"
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--error)', cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
          Clear
        </button>
      </div>
    </div>
  );
}
