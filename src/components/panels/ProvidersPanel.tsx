import { useState, useEffect } from 'react';
import { getModels } from '../../api/endpoints';
import { apiPost } from '../../api/client';
import type { ModelGroup } from '../../types';

export default function ProvidersPanel() {
  const [models, setModels] = useState<ModelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddKey, setShowAddKey] = useState(false);
  const [keyProvider, setKeyProvider] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getModels().then((data: unknown) => {
      const d = data as Record<string, unknown>;
      setModels((d.groups as ModelGroup[]) || (Array.isArray(data) ? data as ModelGroup[] : []));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const [quota, setQuota] = useState<Record<string, unknown>>({});
  const [quotaLoaded, setQuotaLoaded] = useState(false);

  // Load provider quota info
  useEffect(() => {
    apiGet<Record<string, unknown>>('/api/provider/quota').then((d: unknown) => {
      setQuota(d as Record<string, unknown> || {}); setQuotaLoaded(true);
    }).catch(() => setQuotaLoaded(true));
  }, []);

  const handleAddKey = async () => {
    if (!keyProvider.trim() || !keyValue.trim()) return;
    setSaving(true);
    try { await apiPost('/api/providers/key', { provider: keyProvider.trim(), api_key: keyValue.trim() }); setKeyProvider(''); setKeyValue(''); setShowAddKey(false); }
    catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <div className="panel-loading">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin">
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
      </div>
    </div>
  );

  return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <section className="settings-section">
        <h4>Model Providers</h4>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn-primary-sm" onClick={() => setShowAddKey(!showAddKey)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            Add API Key
          </button>
        </div>
        {showAddKey && (
          <div style={{ padding: 12, border: '1px solid var(--accent)', borderRadius: 8, marginBottom: 12, background: 'var(--accent-bg)' }}>
            <input value={keyProvider} onChange={e => setKeyProvider(e.target.value)}
              placeholder="Provider name (e.g. openai, anthropic)"
              className="memory-textarea" style={{ padding: '6px 10px', minHeight: 'auto', marginBottom: 8, width: '100%', boxSizing: 'border-box' }} />
            <input type="password" value={keyValue} onChange={e => setKeyValue(e.target.value)}
              placeholder="API key (sk-...)"
              className="memory-textarea" style={{ padding: '6px 10px', minHeight: 'auto', marginBottom: 8, width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary-sm" onClick={handleAddKey} disabled={saving}>{saving ? 'Saving...' : 'Save Key'}</button>
              <button className="btn-icon-sm" onClick={() => setShowAddKey(false)}>Cancel</button>
            </div>
          </div>
        )}
        {models.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--surface-subtle)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: 12, opacity: 0.5 }}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No providers configured</p>
            <p style={{ fontSize: 12, lineHeight: 1.5 }}>Add API keys via environment variables or config.yaml to enable AI models.</p>
          </div>
        ) : (
          models.map(group => (
            <div key={group.provider} style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                {group.label || group.provider}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.models.map(m => (
                  <span key={m.name} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent-text)', fontFamily: 'var(--font-mono)' }}>
                    {m.display_name || m.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Provider Quota Information */}
      {quotaLoaded && Object.keys(quota).length > 0 && (
        <section className="settings-section">
          <h4>API Quota</h4>
          {Object.entries(quota).map(([provider, info]) => (
            <div key={provider} style={{
              padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8,
              background: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: (info as Record<string, unknown>)?.status === 'ok' ? 'var(--success)' : 'var(--warning)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{provider}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{JSON.stringify(info).slice(0, 100)}</div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
