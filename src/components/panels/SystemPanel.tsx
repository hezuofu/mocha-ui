import { useState, useEffect } from 'react';
import { getVersion, getHealth, getAgentHealth, logout } from '../../api/endpoints';
import { apiGet } from '../../api/client';

export default function SystemPanel() {
  const [version, setVersion] = useState('');
  const [health, setHealth] = useState<Record<string, unknown>>({});
  const [agentHealth, setAgentHealth] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getVersion().then(v => setVersion(v.version)).catch(() => {}),
      getHealth().then(h => setHealth(h)).catch(() => {}),
      getAgentHealth().then(h => setAgentHealth(h)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <div className="panel-loading">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin">
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
      </div>
    </div>
  );

  const agentStatus = (agentHealth as Record<string, unknown>)?.status as string || 'unknown';
  const statusColor = agentStatus === 'ok' ? 'var(--success)' : agentStatus === 'error' ? 'var(--error)' : 'var(--warning)';
  const healthStatus = health.status as string || 'unknown';

  return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <section className="settings-section">
        <h4>Versions</h4>
        <div className="system-info">
          <div className="info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
            <span>WebUI Version</span>
            <span className="info-value">{version || '...'}</span>
          </div>
          <div className="info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>Server Status</span>
            <span className="info-value" style={{ color: statusColor }}>{healthStatus === 'ok' ? 'Healthy' : healthStatus}</span>
          </div>
          <div className="info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Uptime</span>
            <span className="info-value">{typeof health.uptime_seconds === 'number' ? `${Math.floor(health.uptime_seconds / 60)}m ${Math.floor(health.uptime_seconds % 60)}s` : '...'}</span>
          </div>
          <div className="info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.3 2.1 7L12 16.2 5.4 20.3l2.1-7L2 9h7z"/></svg>
            <span>Agent Status</span>
            <span className="info-value" style={{ color: statusColor }}>{agentStatus}</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h4>Gateway</h4>
        <div className="system-info">
          <div className="info-row">
            <span>Connection</span>
            <span className="info-value" style={{ color: (agentHealth as Record<string, unknown>)?.gateway_connected ? 'var(--success)' : 'var(--error)' }}>
              {(agentHealth as Record<string, unknown>)?.gateway_connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h4>MCP Servers</h4>
        <p style={{ fontSize: 12, color: 'var(--muted)', padding: '0 0 8px' }}>Model Context Protocol servers provide additional tools to the agent.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="info-row" style={{ opacity: 0.5 }}>
            <span>No MCP servers configured</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h4>Passkeys</h4>
        <p style={{ fontSize: 12, color: 'var(--muted)', padding: '0 0 8px' }}>WebAuthn passkeys for passwordless authentication.</p>
        <button className="btn-primary-sm" disabled style={{ opacity: 0.5 }}>Register Passkey</button>
      </section>

      <section className="settings-section">
        <h4>Actions</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn-primary-sm" onClick={() => window.location.reload()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Reload App
          </button>
          <button className="btn-danger-sm" onClick={async () => {
            try { await logout(); } catch {}
            window.location.reload();
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </section>
    </div>
  );
}
