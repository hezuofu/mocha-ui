import { useState, useEffect } from 'react';
import { getVersion, getHealth, getAgentHealth, logout, saveSettings } from '../../api/endpoints';
import { apiGet, apiPost } from '../../api/client';
import { useSettingsStore } from '../../store/settingsStore';

export default function SystemPanel() {
  const [version, setVersion] = useState('');
  const [health, setHealth] = useState<Record<string, unknown>>({});
  const [agentHealth, setAgentHealth] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkResult, setCheckResult] = useState('');
  const settings = useSettingsStore();

  const [gatewayStatus, setGatewayStatus] = useState<Record<string, unknown>>({});
  const [mcpServers, setMcpServers] = useState<unknown[]>([]);

  useEffect(() => {
    apiGet<Record<string, unknown>>('/api/gateway/status').then(d => setGatewayStatus(d as Record<string, unknown> || {})).catch(() => {});
    apiGet<{ servers: unknown[] }>('/api/mcp/servers').then((d: unknown) => setMcpServers((d as Record<string, unknown>)?.servers as unknown[] || [])).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      getVersion().then(v => setVersion(v.version)).catch(() => {}),
      getHealth().then(h => setHealth(h)).catch(() => {}),
      getAgentHealth().then(h => setAgentHealth(h)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handlePasswordSave = async () => {
    if (!password.trim()) return;
    setSaving(true);
    try { await saveSettings({ ...settings, password: password.trim() }); setPassword(''); setCheckResult('Password updated'); }
    catch { setCheckResult('Failed to save password'); }
    setSaving(false);
  };

  const handleCheckUpdates = async () => {
    setChecking(true); setCheckResult('');
    try {
      const v = await getVersion();
      setCheckResult(`Current version: ${v.version}. Check your git repository for updates.`);
    } catch { setCheckResult('Could not check for updates'); }
    setChecking(false);
  };

  const handleShutdown = async () => {
    if (!confirm('Stop the Hermes WebUI server? You will need to restart it manually.')) return;
    try { await apiPost('/api/shutdown'); setCheckResult('Server shutting down...'); }
    catch { setCheckResult('Shutdown failed — you may need to stop the server manually'); }
  };

  if (loading) return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20, color: "var(--muted)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>
    </div>
  );

  const agentStatus = (agentHealth as Record<string, unknown>)?.status as string || 'unknown';
  const statusColor = agentStatus === 'ok' ? 'var(--success)' : agentStatus === 'error' ? 'var(--error)' : 'var(--warning)';

  return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <section className="settings-section">
        <h4>Versions</h4>
        <div className="system-info">
          <div className="info-row"><span>WebUI</span><span className="info-value">{version || '...'}</span></div>
          <div className="info-row"><span>Server</span><span className="info-value" style={{ color: health.status === 'ok' ? 'var(--success)' : 'var(--muted)' }}>{health.status === 'ok' ? 'Healthy' : String(health.status || '...')}</span></div>
          <div className="info-row"><span>Uptime</span><span className="info-value">{typeof health.uptime_seconds === 'number' ? `${Math.floor(health.uptime_seconds / 60)}m ${Math.floor(health.uptime_seconds % 60)}s` : '...'}</span></div>
          <div className="info-row"><span>Agent</span><span className="info-value" style={{ color: statusColor }}>{agentStatus}</span></div>
          <div className="info-row"><span>Gateway</span><span className="info-value" style={{ color: (agentHealth as Record<string, unknown>)?.gateway_connected ? 'var(--success)' : 'var(--error)' }}>{(agentHealth as Record<string, unknown>)?.gateway_connected ? 'Connected' : 'Disconnected'}</span></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="panel-icon-btn" onClick={handleCheckUpdates} disabled={checking}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
            {checking ? 'Checking...' : 'Check for updates'}
          </button>
          {checkResult && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{checkResult}</div>}
        </div>
      </section>

      <section className="settings-section">
        <h4>Access Password</h4>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>
          Set a password to protect your Hermes instance. Leave blank to keep current password.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="New password..."
            style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
          <button className="panel-icon-btn" onClick={handlePasswordSave} disabled={saving || !password.trim()}>
            {saving ? 'Saving...' : 'Set'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h4>Gateway</h4>
        <div className="system-info">
          {Object.keys(gatewayStatus).length > 0 ? Object.entries(gatewayStatus).map(([k, v]) => (
            <div key={k} className="info-row"><span>{k}</span><span className="info-value">{String(v)}</span></div>
          )) : <div className="info-row"><span>Status</span><span className="info-value" style={{ color: 'var(--muted)' }}>Not configured</span></div>}
        </div>
      </section>

      <section className="settings-section">
        <h4>MCP Servers</h4>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Model Context Protocol servers provide additional tools.</p>
        {mcpServers.length > 0 ? mcpServers.map((s: unknown) => (
          <div key={String((s as Record<string, unknown>).name || '')} className="info-row" style={{ justifyContent: 'space-between' }}>
            <span>{String((s as Record<string, unknown>).name || 'Unknown')}</span>
            <span className="info-value" style={{ color: 'var(--success)' }}>Active</span>
          </div>
        )) : <div className="info-row" style={{ opacity: 0.5 }}><span>No MCP servers configured</span></div>}
      </section>

      <section className="settings-section">
        <h4>Passkeys</h4>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>WebAuthn passkeys for passwordless sign-in.</p>
        <button className="panel-icon-btn" onClick={async () => { try { await apiPost('/api/passkeys/register'); setCheckResult('Passkey registration initiated'); } catch { setCheckResult('Passkey registration not available'); } }}>Register Passkey</button>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>No passkeys registered.</div>
      </section>

      <section className="settings-section">
        <h4>Actions</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="panel-icon-btn" onClick={() => window.location.reload()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Reload App
          </button>
          <button className="btn-danger-sm" onClick={async () => { try { await logout(); } catch {}; window.location.reload(); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Sign Out
          </button>
          <button className="btn-danger-sm" onClick={handleShutdown} style={{ borderColor: 'rgba(231,76,60,.3)', color: '#e74c3c' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg> Stop server
          </button>
          <button className="panel-icon-btn" onClick={async () => { try { await saveSettings(settings); setCheckResult('Settings saved'); } catch { setCheckResult('Failed to save'); } }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Settings
          </button>
        </div>
      </section>
    </div>
  );
}
