import { useState, useEffect } from 'react';
import { getVersion, logout } from '../../api/endpoints';
import { apiGet, apiPost } from '../../api/client';

export default function SystemPanel() {
  const [version, setVersion] = useState('');
  const [agentVersion, setAgentVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState('');
  const [dashboardMode, setDashboardMode] = useState('auto');
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [mcpSearch, setMcpSearch] = useState('');
  const [mcpPageSize, setMcpPageSize] = useState(5);
  const [mcpPage, setMcpPage] = useState(0);

  useEffect(() => {
    Promise.all([
      getVersion().then(v => { setVersion(v.webui_version || (v as any).version || ''); setAgentVersion(v.agent_version || String((v as any).agent_version || '')); }).catch(() => {}),
    ]).finally(() => setLoading(false));

    // Gateway status
    apiGet<any>('/api/gateway/status').then(d => setGatewayStatus(d)).catch(() => {});
    // MCP servers
    apiGet<any>('/api/mcp/servers').then(d => setMcpServers(d?.servers || [])).catch(() => {});
    // MCP tools
    apiGet<any>('/api/mcp/tools').then(d => setMcpTools(d?.tools || [])).catch(() => {});
  }, []);

  const handleCheckUpdates = async () => {
    setChecking(true); setCheckStatus('');
    try { const v = await getVersion(); setCheckStatus(`Current version: ${v.webui_version || (v as any).version}.`); }
    catch { setCheckStatus('Could not check for updates'); }
    setChecking(false);
  };

  const handleShutdown = async () => {
    if (!confirm('Stop the Hermes WebUI server? You will need to restart it manually.')) return;
    try { await apiPost('/api/shutdown'); } catch { /* ignore */ }
  };

  const handleSaveDashboard = async () => {
    try { await apiPost('/api/settings/dashboard', { mode: dashboardMode, url: dashboardUrl }); }
    catch { /* ignore */ }
  };

  const filteredTools = mcpTools.filter(t => {
    if (!mcpSearch) return true;
    const q = mcpSearch.toLowerCase();
    const haystack = [t.name, t.server, t.description].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
  const pagedTools = filteredTools.slice(mcpPage * mcpPageSize, (mcpPage + 1) * mcpPageSize);
  const totalPages = Math.max(1, Math.ceil(filteredTools.length / mcpPageSize));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'var(--muted)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
      </svg>
    </div>
  );

  return (
    <>
      {/* ── Section head ── */}
      <div className="settings-section-head">
        <div>
          <div className="settings-section-title">System</div>
          <div className="settings-section-meta">Instance version and access controls.</div>
        </div>
        <div id="checkUpdatesBlock">
          {version && <span className="settings-version-badge" id="settings-webui-version-badge">WebUI: v{version}</span>}
          {agentVersion && <span className="settings-version-badge" id="settings-agent-version-badge">Agent: {agentVersion}</span>}
          <button className="btn-tiny" id="btnCheckUpdatesNow" onClick={handleCheckUpdates} disabled={checking} title="Check now">
            <svg id="checkUpdatesSpinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner-xs" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
            <span id="checkUpdatesLabel">{checking ? 'Checking...' : 'Check now'}</span>
          </button>
          {checkStatus && <span id="checkUpdatesStatus" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{checkStatus}</span>}
        </div>
      </div>

      {/* ── Access Password ── */}
      <div className="settings-field">
        <label htmlFor="settingsPassword">Access Password</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Enter a new password to set or change it. Leave blank to keep current setting.</div>
        <input type="password" id="settingsPassword" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Enter new password..." autoComplete="new-password"
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }} />
        <div id="settingsPasswordEnvLock" style={{ display: 'none', marginTop: 6, padding: '8px 10px', fontSize: 11, color: 'var(--muted)', background: 'var(--code-bg)', border: '1px solid var(--border2)', borderRadius: 6, lineHeight: 1.45 }}>
          The HERMES_WEBUI_PASSWORD environment variable is currently set and takes precedence.
        </div>
      </div>

      {/* ── Auth actions ── */}
      <button className="sm-btn" id="btnDisableAuth" onClick={async () => { try { await apiPost('/api/auth/disable'); } catch {} }}
        style={{ marginTop: 6, width: '100%', padding: 8, fontWeight: 600, color: '#e8a030', borderColor: 'rgba(232,160,48,.3)', display: 'none' }}>
        Disable Auth
      </button>
      <button className="sm-btn" id="btnSignOut" onClick={async () => { try { await logout(); window.location.reload(); } catch {} }}
        style={{ marginTop: 6, width: '100%', padding: 8, fontWeight: 600, color: 'var(--accent)', borderColor: 'rgba(233,69,96,.3)', display: 'none' }}>
        Sign Out
      </button>

      {/* ── Stop server ── */}
      <div className="settings-field" id="shutdownServerBlock" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <label>Stop the Hermes WebUI server</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          Gracefully stops the local WebUI server. You'll need to relaunch the server before the WebUI is reachable again.
        </div>
        <button className="sm-btn" id="btnShutdownServer" onClick={handleShutdown}
          style={{ width: '100%', padding: 7, fontWeight: 600, color: '#e74c3c', borderColor: 'rgba(231,76,60,.3)' }}>
          Stop server
        </button>
      </div>

      {/* ── Passkeys ── */}
      <div className="settings-field" id="passkeysSettingsBlock" style={{ display: 'none', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <label>Passkeys</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          Register this browser or device for passwordless sign-in.
        </div>
        <button className="sm-btn" id="btnRegisterPasskey"
          onClick={async () => { try { await apiPost('/api/passkeys/register'); } catch {} }}
          style={{ width: '100%', padding: 7, fontWeight: 600 }}>
          Add passkey
        </button>
        <button className="sm-btn" id="btnGoPasswordless"
          style={{ display: 'none', marginTop: 8, width: '100%', padding: 7, fontWeight: 600, color: '#e8a030', borderColor: 'rgba(232,160,48,.3)' }}>
          Go passwordless
        </button>
        <div id="passkeyList" style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>No passkeys registered.</div>
      </div>

      {/* ── Dashboard ── */}
      <div className="settings-field" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <label htmlFor="settingsDashboardMode">Official Hermes Dashboard</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Show a nav-rail link when the official <code>hermes dashboard</code> is reachable.</div>
        <select id="settingsDashboardMode" value={dashboardMode} onChange={e => setDashboardMode(e.target.value)}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6 }}>
          <option value="auto">Auto-detect</option>
          <option value="always">Always show</option>
          <option value="never">Never show</option>
        </select>
        <input type="text" id="settingsDashboardUrl" placeholder="http://127.0.0.1:9119" value={dashboardUrl} onChange={e => setDashboardUrl(e.target.value)}
          style={{ marginTop: 8, width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }} />
        <button className="sm-btn" onClick={handleSaveDashboard} style={{ marginTop: 8, width: '100%', padding: 7, fontWeight: 600 }}>
          Save dashboard link settings
        </button>
        <div id="settingsDashboardStatus" className="settings-autosave-status" aria-live="polite"></div>
      </div>

      {/* ── Gateway Status ── */}
      <div className="settings-field" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <label>Gateway Status</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Status of the Hermes gateway (Telegram, Discord, Slack, etc.)</div>
        <div id="gatewayStatusCard">
          <div style={{ color: 'var(--muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            Gateway not configured
          </div>
        </div>
      </div>

      {/* ── MCP Servers ── */}
      <div className="settings-field" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <label>MCP Servers</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>View MCP servers configured in config.yaml.</div>
        <div id="mcpServerList">
          <div className="mcp-empty-state" style={{ color: 'var(--muted)', fontSize: 12, padding: '6px 0' }}>No MCP servers configured.</div>
        </div>
        <div className="mcp-restart-hint">Server changes are read-only here for now. Edit config.yaml and restart Hermes for changes to take effect.</div>
      </div>

      {/* ── MCP Tools ── */}
      <div className="settings-field" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <label>MCP Tools</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Search known tools across active MCP servers.</div>
        <input type="search" id="mcpToolSearch" className="mcp-tool-search" placeholder="Search tools by name, server, or description..." value={mcpSearch}
          onChange={e => { setMcpSearch(e.target.value); setMcpPage(0); }} autoComplete="off" />
        <div className="mcp-tool-toolbar" id="mcpToolToolbar" aria-live="polite">
          <span className="mcp-tool-summary">{filteredTools.length > 0 ? `${filteredTools.length} tools` : ''}</span>
          <label className="mcp-tool-page-size">Show <select aria-label="MCP tools per page" value={mcpPageSize}
            onChange={e => { setMcpPageSize(Number(e.target.value)); setMcpPage(0); }}>
            <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={40}>40</option>
          </select> per page</label>
        </div>
        <div id="mcpToolList" className="mcp-tool-list">
          {filteredTools.length === 0 ? (
            <div className="mcp-tool-empty-state" style={{ color: 'var(--muted)', fontSize: 12, padding: '6px 0' }}>No MCP tools are available from the active runtime inventory.</div>
          ) : (
            pagedTools.map((t, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>{t.server}{t.description ? ` · ${t.description}` : ''}</div>
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div id="mcpToolPager" className="mcp-tool-pager">
            <button disabled={mcpPage === 0} onClick={() => setMcpPage(p => p - 1)} className="sm-btn" style={{ padding: '4px 12px', fontSize: 11, width: 'auto', flex: 'none' }}>Prev</button>
            <span style={{ fontSize: 11, color: 'var(--muted)', padding: '0 4px' }}>{mcpPage + 1} / {totalPages}</span>
            <button disabled={mcpPage >= totalPages - 1} onClick={() => setMcpPage(p => p + 1)} className="sm-btn" style={{ padding: '4px 12px', fontSize: 11, width: 'auto', flex: 'none' }}>Next</button>
          </div>
        )}
        <div className="mcp-restart-hint">Tool inventory only uses already-known active MCP runtime data; the WebUI does not start or probe servers.</div>
      </div>

      {/* ── Save Settings ── */}
      <button className="sm-btn" onClick={async () => { try { await apiPost('/api/settings/save', {}); } catch {} }}
        style={{ marginTop: 12, width: '100%', padding: '9px 16px', fontWeight: 600, fontSize: 13, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)', borderRadius: 8 }}>
        Save Settings
      </button>
    </>
  );
}
