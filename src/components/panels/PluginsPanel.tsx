import { useState, useEffect } from 'react';
import { apiGet } from '../../api/client';

interface PluginInfo {
  name: string; key: string; version?: string;
  description?: string; enabled: boolean;
  kind?: string; activation?: string; hooks?: string[];
}

export default function PluginsPanel() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiGet<{ plugins: PluginInfo[] }>('/api/plugins').then((data: unknown) => {
      setPlugins((data as Record<string, unknown>).plugins as PluginInfo[] || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'var(--muted)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
      </svg>
    </div>
  );

  return (
    <>
      <div className="settings-section-head">
        <div>
          <div className="settings-section-title">Plugins</div>
          <div className="settings-section-meta">View installed Hermes plugins and the lifecycle hooks they register. This panel is read-only.</div>
        </div>
      </div>

      <div id="pluginsList" style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
        {plugins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>No plugins installed</div>
        ) : (
          plugins.map(p => {
            const version = p.version ? `v${p.version}` : '';
            const meta = [p.key, version].filter(Boolean).join(' · ');
            const isEnabled = p.enabled;
            const hooks = p.hooks || [];

            const isOpen = !collapsed.has(p.key);

            return (
              <div key={p.key} className={`provider-card plugin-card${isOpen ? ' open' : ''}`} data-plugin={p.key}>
                <div className="provider-card-header plugin-card-header" onClick={() => toggleCollapse(p.key)} style={{ cursor: 'pointer' }}>
                  <div className="provider-card-info">
                    <div className="provider-card-name">{p.name}</div>
                    <div className="provider-card-meta">{meta}</div>
                  </div>
                  <span className={`provider-card-badge${!isEnabled ? ' plugin-card-badge-disabled' : ''}`}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <svg className="provider-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {isOpen && (
                  <div className="provider-card-body plugin-card-body">
                    {p.description && <div className="provider-card-hint">{p.description}</div>}
                    <div className="provider-card-label">Registered hooks</div>
                    <div className="plugin-hook-list">
                      {hooks.length === 0 ? (
                        <span className="plugin-hook-empty">No registered lifecycle hooks</span>
                      ) : (
                        hooks.map(h => <span key={h} className="plugin-hook-badge">{h}</span>)
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
