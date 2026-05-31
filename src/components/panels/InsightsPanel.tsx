import { useState, useEffect, useCallback } from 'react';
import { getInsights } from '../../api/endpoints';
/* All icons replaced with original inline SVGs from static/icons.js */

export default function InsightsPanel() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);

  const load = useCallback(async (p?: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await getInsights(p ?? period);
      setData(result);
    } catch {
      setError('Failed to load insights');
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, []);

  if (loading) return <div className="panel-loading"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>;

  return (
    <div className="insights-panel" style={{ padding: 12, overflow: 'auto', flex: 1 }}>
      <div className="panel-toolbar">
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>System insights</span>
        <button className="btn-icon-sm" onClick={() => load()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
      </div>

      {/* Time range selector */}
      <div className="panel-head-sub" style={{ padding: '0 0 8px' }}>
        <select
          value={period}
          onChange={e => { const p = Number(e.target.value); setPeriod(p); load(p); }}
          style={{ width: '100%', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
        >
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">365 days</option>
        </select>
      </div>

      {error && <div className="panel-empty" style={{ color: 'var(--error)' }}>{error}</div>}

      {data ? (
        <div className="system-info">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="info-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              <span>{key}</span>
              <span className="info-value">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      ) : !error ? (
        <div className="panel-empty">No insights available</div>
      ) : null}
    </div>
  );
}
