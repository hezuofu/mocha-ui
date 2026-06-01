import { useState, useEffect } from 'react';
import { apiGet } from '../../api/client';

interface PluginInfo {
  name: string;
  enabled: boolean;
  description?: string;
}

export default function PluginsPanel() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ plugins: PluginInfo[] }>('/api/plugins').then((data: unknown) => {
      setPlugins((data as Record<string, unknown>).plugins as PluginInfo[] || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20, color: "var(--muted)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin">
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
      </div>
    </div>
  );

  return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <section className="settings-section">
        <h4>Installed Plugins</h4>
        {plugins.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--surface-subtle)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: 12, opacity: 0.5 }}><path d="M12 2l3 7h7l-5.5 4.3 2.1 7L12 16.2 5.4 20.3l2.1-7L2 9h7z"/></svg>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No plugins installed</p>
            <p style={{ fontSize: 12, lineHeight: 1.5 }}>Plugins extend Hermes with additional tools, skills, and integrations.</p>
          </div>
        ) : (
          plugins.map(p => (
            <div key={p.name} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--muted)', flexShrink: 0 }}><path d="M12 2l3 7h7l-5.5 4.3 2.1 7L12 16.2 5.4 20.3l2.1-7L2 9h7z"/></svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{p.description}</div>}
              </div>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: p.enabled ? 'var(--accent-bg)' : 'var(--hover-bg)', color: p.enabled ? 'var(--accent-text)' : 'var(--muted)' }}>
                {p.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
