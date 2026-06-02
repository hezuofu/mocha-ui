import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../api/client';

interface ProviderModel { id: string; label: string }
interface Provider {
  id: string; display_name: string; has_key: boolean;
  configurable: boolean; is_oauth: boolean; is_custom?: boolean;
  key_source: string; auth_error: string | null;
  models: ProviderModel[]; models_total: number;
}

export default function ProvidersPanel() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiGet<{ providers: Provider[] }>('/api/providers').then(data => {
      const all = data?.providers || [];
      setProviders(all.filter(p => p.configurable || p.is_oauth || p.is_custom));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleReveal = (id: string) => {
    setRevealed(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleSaveKey = async (providerId: string) => {
    const key = keys[providerId];
    if (!key?.trim()) return;
    setSaving(prev => ({ ...prev, [providerId]: true }));
    try {
      await apiPost('/api/providers/key', { provider: providerId, api_key: key.trim() });
      setKeys(prev => { const n = { ...prev }; delete n[providerId]; return n; });
    } catch { /* ignore */ }
    setSaving(prev => ({ ...prev, [providerId]: false }));
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
          <div className="settings-section-title">Providers</div>
          <div className="settings-section-meta">Manage API keys for AI providers. Changes take effect immediately.</div>
        </div>
      </div>

      <div id="providersList" style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
        {providers.map(p => {
          const modelCount = Number.isFinite(p.models_total) ? p.models_total : (p.models || []).length;
          const sourceLabel = p.key_source === 'oauth' ? 'OAuth' : p.key_source === 'config_yaml' ? 'Configured' : p.has_key ? 'API key' : 'Not configured';
          const metaParts = []; if (modelCount > 0) metaParts.push(`${modelCount} ${modelCount === 1 ? 'model' : 'models'}`); metaParts.push(sourceLabel);
          const isOpen = expanded.has(p.id);

          return (
            <div key={p.id} className={`provider-card${isOpen ? ' open' : ''}`} data-provider={p.id}>
              <button type="button" className="provider-card-header" onClick={() => toggleExpand(p.id)}>
                <div className="provider-card-info">
                  <div className="provider-card-name">{p.display_name}</div>
                  <div className="provider-card-meta">{metaParts.join(' · ')}</div>
                </div>
                {p.has_key && <span className="provider-card-badge">Configured</span>}
                <svg className="provider-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {isOpen && (
                <div className="provider-card-body">
                  {p.is_oauth ? (
                    <div className="provider-card-hint" style={{ color: p.auth_error ? 'var(--accent)' : p.has_key ? undefined : 'var(--muted)' }}>
                      {p.key_source === 'config_yaml' ? 'Token configured via config.yaml.' : p.auth_error ? p.auth_error : p.has_key ? 'Authenticated via OAuth.' : 'Not authenticated. Run hermes auth in the terminal.'}
                    </div>
                  ) : p.configurable ? (
                    <div className="provider-card-field">
                      <label className="provider-card-label">API key</label>
                      <div className="provider-card-row">
                        <input type={revealed.has(p.id) ? 'text' : 'password'}
                          className="provider-card-input"
                          placeholder={p.has_key ? 'Replace existing key...' : 'Paste your API key...'}
                          autoComplete="off"
                          value={keys[p.id] || ''}
                          onChange={e => setKeys(prev => ({ ...prev, [p.id]: e.target.value }))} />
                        <button type="button" className="provider-card-btn provider-card-btn-ghost"
                          onClick={() => toggleReveal(p.id)}>
                          {revealed.has(p.id) ? 'Hide' : 'Show'}
                        </button>
                        <button type="button" className="provider-card-btn provider-card-btn-primary"
                          disabled={!keys[p.id]?.trim() || saving[p.id]}
                          onClick={() => handleSaveKey(p.id)}>
                          Save
                        </button>
                        {p.has_key && (
                          <button type="button" className="provider-card-btn provider-card-btn-danger"
                            onClick={async () => { await apiPost('/api/providers/key/delete', { provider: p.id }); }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="provider-card-hint">
                      {p.is_custom ? 'Custom provider loaded from config.yaml / hermes model.' : 'Provider is managed outside the WebUI.'}
                    </div>
                  )}

                  {/* Model list */}
                  {modelCount > 0 && (
                    <div className="provider-card-models">
                      <div className="provider-card-label">Models</div>
                      <div className="provider-card-model-tags">
                        {(p.models || []).map(m => (
                          <span key={m.id} className="provider-card-model-tag">{m.id}</span>
                        ))}
                        {Number.isFinite(p.models_total) && p.models_total > (p.models || []).length && (
                          <span className="provider-card-model-tag provider-card-model-tag-more"
                            title="The /model slash command can autocomplete every model in this provider's catalog.">
                            +{p.models_total - (p.models || []).length} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div id="providersEmpty" style={{ display: providers.length === 0 ? 'block' : 'none', textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
        No configurable providers found.
      </div>
    </>
  );
}
