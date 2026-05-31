import { useState, useEffect } from 'react';
import { getModels } from '../../api/endpoints';
import type { ModelGroup } from '../../types';

export default function ProvidersPanel() {
  const [models, setModels] = useState<ModelGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModels().then(data => setModels(data || [])).catch(() => {}).finally(() => setLoading(false));
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

  return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <section className="settings-section">
        <h4>Model Providers</h4>
        {models.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>No models configured. Add provider API keys in your environment or config file.</p>
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
    </div>
  );
}
