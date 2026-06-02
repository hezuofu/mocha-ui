import { useSessionStore } from '../../store/sessionStore';
import { exportSession, clearConversation, importSession } from '../../api/endpoints';
import { useState, useRef } from 'react';

export default function SettingsPanel() {
  const activeSid = useSessionStore(s => s.activeSessionId);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (format: 'markdown' | 'json') => {
    if (!activeSid) return;
    setExporting(true);
    try {
      const result = await exportSession(activeSid, format);
      const blob = new Blob([result.data], { type: format === 'json' ? 'application/json' : 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session.${format === 'json' ? 'json' : 'md'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const handleClear = async () => {
    if (!activeSid || !confirm('Clear all messages in this conversation?')) return;
    setClearing(true);
    try { await clearConversation(activeSid); } catch { /* ignore */ }
    setClearing(false);
  };

  const hasActiveSession = !!activeSid;

  return (
    <>
      <div className="settings-section-head">
        <div>
          <div className="settings-section-title">Conversation</div>
          <div className="settings-section-meta" id="hermesSessionMeta">
            {hasActiveSession ? `Active session: ${activeSid}` : 'No active conversation selected.'}
          </div>
        </div>
      </div>

      <div className="hermes-action-grid">
        <button className={`settings-action-btn${!hasActiveSession ? ' disabled' : ''}`}
          id="btnDownload" title="Download as Markdown"
          disabled={!hasActiveSession || exporting}
          onClick={() => handleExport('markdown')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Transcript</span>
        </button>
        <button className={`settings-action-btn${!hasActiveSession ? ' disabled' : ''}`}
          id="btnExportJSON" title="Export full session as JSON"
          disabled={!hasActiveSession || exporting}
          onClick={() => handleExport('json')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></svg>
          <span>JSON</span>
        </button>
        <button className="settings-action-btn" id="btnImportJSON"
          title="Import session from JSON"
          onClick={() => fileInputRef.current?.click()}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Import</span>
        </button>
        <button className={`settings-action-btn danger${!hasActiveSession ? ' disabled' : ''}`}
          id="btnClearConvModal" title="Clear all messages in this conversation"
          disabled={!hasActiveSession || clearing}
          onClick={handleClear}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 1 2 2 2v2"/></svg>
          <span>Clear</span>
        </button>
      </div>

      <input ref={fileInputRef} type="file" id="importFileInput" accept=".json" style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0];
          if (!file || !activeSid) return;
          try {
            const text = await file.text();
            await importSession(text);
            window.location.reload();
          } catch { /* ignore */ }
        }} />
    </>
  );
}
