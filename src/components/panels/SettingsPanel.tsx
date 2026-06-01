import { useSettingsStore } from '../../store/settingsStore';
import { useSessionStore } from '../../store/sessionStore';
import type { Settings } from '../../types';
import { exportSession, clearConversation, importSession } from '../../api/endpoints';
import { useState, useRef } from 'react';

export default function SettingsPanel() {
  const settings = useSettingsStore();
  const saveSettings = useSettingsStore(s => s.saveSettings);
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

  return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <section className="settings-section">
        <h4>Chat</h4>
        <div className="settings-field">
          <label>Bot Name</label>
          <input type="text" value={settings.bot_name || ''}
            onChange={e => saveSettings({ bot_name: e.target.value })}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div className="settings-field">
          <label>Send Key</label>
          <select value={settings.send_key || 'enter'}
            onChange={e => saveSettings({ send_key: e.target.value as 'enter' | 'ctrl_enter' })}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
            <option value="enter">Enter</option>
            <option value="ctrl_enter">Ctrl + Enter</option>
          </select>
        </div>
        <div className="settings-field">
          <label>Busy Input Mode</label>
          <select value={settings.busy_input_mode || 'queue'}
            onChange={e => saveSettings({ busy_input_mode: e.target.value as Settings['busy_input_mode'] })}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
            <option value="queue">Queue</option>
            <option value="interrupt">Interrupt</option>
            <option value="steer">Steer</option>
          </select>
        </div>
        <div className="settings-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={settings.token_display || false}
            onChange={e => saveSettings({ token_display: e.target.checked })}
            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>Show token count</span>
        </div>
        <div className="settings-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={settings.show_cli_sessions !== false}
            onChange={e => saveSettings({ show_cli_sessions: e.target.checked })}
            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>Show CLI sessions</span>
        </div>
      </section>

      {activeSid && (
        <section className="settings-section">
          <h4>Active Conversation</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all' }}>ID: {activeSid}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="panel-icon-btn" onClick={() => handleExport('markdown')} disabled={exporting}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export MD
              </button>
              <button className="panel-icon-btn" onClick={() => handleExport('json')} disabled={exporting}>
                Export JSON
              </button>
              <button className="btn-danger-sm" onClick={handleClear} disabled={clearing}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                Clear
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              <label style={{ cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline' }}
                onClick={() => fileInputRef.current?.click()}>
                Import JSON session
              </label>
              <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file || !activeSid) return;
                  try {
                    const text = await file.text();
                    await importSession(text);
                    window.location.reload();
                  } catch { /* ignore */ }
                }} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
