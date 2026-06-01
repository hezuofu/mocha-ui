import { useState, useEffect, useCallback } from 'react';
import { getInsights } from '../../api/endpoints';
import { usePanelStore } from '../../store/panelStore';

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '365 days' },
];

function fmtNum(n: number | undefined): string { return (n || 0).toLocaleString(); }
function fmtTokens(n: number | undefined): string {
  const v = n || 0;
  return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toLocaleString();
}
function fmtCost(c: number | undefined): string {
  const v = c || 0;
  return v > 0 ? '$' + v.toFixed(v < 1 ? 4 : 2) : '$0';
}

interface DailyRow { input_tokens: number; output_tokens: number; date: string; label?: string; title?: string; cost?: number; sessions?: number }
interface InsightsData {
  total_sessions?: number; total_messages?: number; total_tokens?: number; total_cost?: number;
  total_input_tokens?: number; total_output_tokens?: number;
  daily_tokens?: DailyRow[];
  models?: { model: string; sessions: number; total_tokens?: number; cost?: number; cost_share?: number; token_share?: number; session_share?: number }[];
  activity_by_day?: { day: string; sessions: number }[];
  activity_by_hour?: { hour: number; sessions: number }[];
  period_days?: number;
}

/** Bucket daily data into chart-friendly groups for longer periods */
function bucketDaily(rows: DailyRow[]): DailyRow[] {
  if (rows.length <= 70) return rows.map((r) => {
    const d = new Date(r.date);
    return { ...r, label: d.getDate().toString(), title: r.date };
  });
  const binCount = Math.min(50, Math.ceil(rows.length / 3));
  const binSize = Math.max(1, Math.ceil(rows.length / binCount));
  const bucketed: DailyRow[] = [];
  for (let i = 0; i < rows.length; i += binSize) {
    const chunk = rows.slice(i, i + binSize);
    bucketed.push({
      date: rows[i].date,
      input_tokens: chunk.reduce((s, r) => s + (r.input_tokens || 0), 0),
      output_tokens: chunk.reduce((s, r) => s + (r.output_tokens || 0), 0),
      cost: chunk.reduce((s, r) => s + (r.cost || 0), 0),
      sessions: chunk.reduce((s, r) => s + (r.sessions || 0), 0),
      label: new Date(rows[i].date).getDate().toString(),
      title: rows[i].date,
    });
  }
  return bucketed;
}

/** Sidebar: period selector + refresh button only */
export function InsightsControls() {
  const period = usePanelStore(s => s.insightsPeriod);
  const setPeriod = usePanelStore(s => s.setInsightsPeriod);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    // Trigger a data reload by setting period (triggers useEffect in InsightsContent)
    usePanelStore.getState().switchTo('insights');
    setTimeout(() => setLoading(false), 500);
  }, []);

  return (
    <>
      <div className="panel-head-sub">
        <select id="insightsPeriod" value={period} onChange={e => { setPeriod(Number(e.target.value)); }}
          style={{ width: '100%', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
          {PERIODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div style={{ padding: '4px 12px 8px' }}>
        <button className="panel-icon-btn" onClick={refresh} disabled={loading} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>
    </>
  );
}

/** Main area: full insights content */
export default function InsightsPanel({ sidebar }: { sidebar?: boolean }) {
  const period = usePanelStore(s => s.insightsPeriod);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getInsights(period) as InsightsData;
      setData(result);
    } catch (e) {
      setError((e as Error).message || 'Failed to load insights');
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Sidebar mode: only render period + refresh controls
  if (sidebar) {
    return (
      <>
        <div className="panel-head-sub" style={{ padding: '0 12px 8px' }}>
          <select id="insightsPeriod" value={period} onChange={e => { setPeriod(Number(e.target.value)); }}
            style={{ width: '100%', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
            <option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">365 days</option>
          </select>
        </div>
        <div style={{ padding: '4px 12px 8px', display: 'flex', gap: 4 }}>
          <button className="panel-icon-btn" onClick={() => load()} title="Refresh" style={{ fontSize: 11 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--muted)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        <span style={{ marginLeft: 8 }}>Loading insights...</span>
      </div>
    );
  }

  if (error) {
    return <div className="main-view-content" style={{ padding: 16 }}><div className="insights-empty" style={{ color: 'var(--error)' }}>{error}</div></div>;
  }

  if (!data) {
    return <div className="main-view-content" style={{ padding: 16 }}><div className="insights-empty">No insights available</div></div>;
  }

  const d = data;
  const dailyTokens = d.daily_tokens || [];
  const chartRows = bucketDaily(dailyTokens);
  const maxDaily = Math.max(...chartRows.map(r => (r.input_tokens || 0) + (r.output_tokens || 0)), 1);
  const labelEvery = Math.max(Math.ceil(chartRows.length / 7), 1);

  return (
    <div className="main-view-content" style={{ padding: 16, overflowY: 'auto' }}>
      {/* Overview stat cards */}
      <div className="insights-grid">
        {[
          { label: 'Sessions', value: fmtNum(d.total_sessions) },
          { label: 'Messages', value: fmtNum(d.total_messages) },
          { label: 'Tokens', value: fmtTokens(d.total_tokens) },
          { label: 'Cost', value: fmtCost(d.total_cost) },
        ].map(c => (
          <div key={c.label} className="insights-stat">
            <div className="insights-stat-value">{c.value}</div>
            <div className="insights-stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Daily token chart */}
      {chartRows.length > 0 ? (
        <div className="insights-card">
          <div className="insights-card-title">Daily tokens</div>
          <div className="insights-daily-token-chart">
            {chartRows.map((r, idx) => {
              const input = r.input_tokens || 0;
              const output = r.output_tokens || 0;
              const inputPct = Math.max((input / maxDaily) * 100, input ? 2 : 0).toFixed(1);
              const outputPct = Math.max((output / maxDaily) * 100, output ? 2 : 0).toFixed(1);
              const showLabel = idx === 0 || idx === chartRows.length - 1 || idx % labelEvery === 0;
              const titleDate = r.title || r.date;
              const title = `${titleDate} · In: ${fmtTokens(input)} · Out: ${fmtTokens(output)}`;
              const labelText = r.label !== undefined ? r.label : String(r.date || '').slice(5);
              return (
                <div key={idx} className="insights-daily-bar" title={title}>
                  <div className="insights-daily-stack" aria-label={title}>
                    <div className="insights-daily-bar-output" style={{ height: `${outputPct}%` }} />
                    <div className="insights-daily-bar-input" style={{ height: `${inputPct}%` }} />
                  </div>
                  <span>{showLabel ? labelText : ''}</span>
                </div>
              );
            })}
          </div>
          <div className="insights-daily-legend">
            <span><i className="insights-daily-legend-input" /> Input tokens</span>
            <span><i className="insights-daily-legend-output" /> Output tokens</span>
          </div>
        </div>
      ) : (
        <div className="insights-card"><div className="insights-card-title">Daily tokens</div><div className="insights-empty">No usage data available</div></div>
      )}

      {/* Token breakdown + Models */}
      <div className="insights-row insights-usage-grid">
        <div className="insights-card">
          <div className="insights-card-title">Token breakdown</div>
          <div className="insights-token-row">
            <span className="insights-token-label">Input tokens</span>
            <span className="insights-token-value">{fmtTokens(d.total_input_tokens)}</span>
          </div>
          <div className="insights-token-row">
            <span className="insights-token-label">Output tokens</span>
            <span className="insights-token-value">{fmtTokens(d.total_output_tokens)}</span>
          </div>
          <div className="insights-token-row insights-token-total">
            <span className="insights-token-label">Total</span>
            <span className="insights-token-value">{fmtTokens(d.total_tokens)}</span>
          </div>
        </div>
        {d.models && d.models.length > 0 ? (
          <div className="insights-card">
            <div className="insights-card-title">Models</div>
            <div className="insights-table insights-model-table">
              <div className="insights-table-head">
                <span>Model</span><span>Sessions</span><span>Tokens</span><span>Cost</span><span>Share</span>
              </div>
              {d.models.map(m => {
                const share = Number(m.cost_share || m.token_share || m.session_share || 0);
                return (
                  <div key={m.model} className="insights-table-row">
                    <span className="insights-model-name" title={m.model}>{m.model}</span>
                    <span>{fmtNum(m.sessions)}</span>
                    <span className="insights-model-tokens">{fmtTokens(m.total_tokens)}</span>
                    <span className="insights-model-cost">{fmtCost(m.cost)}</span>
                    <span>{share}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="insights-card"><div className="insights-card-title">Models</div><div className="insights-empty">No usage data available</div></div>
        )}
      </div>

      {/* Activity by day of week */}
      {d.activity_by_day && d.activity_by_day.length > 0 && (
        <div className="insights-card">
          <div className="insights-card-title">Activity by day</div>
          <div className="insights-bars">
            {d.activity_by_day.map(r => {
              const maxSessions = Math.max(...d.activity_by_day!.map(x => x.sessions), 1);
              const pct = (r.sessions / maxSessions * 100).toFixed(0);
              return (
                <div key={r.day} className="insights-bar-row">
                  <span className="insights-bar-label">{r.day}</span>
                  <div className="insights-bar-track"><div className="insights-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <span className="insights-bar-value">{r.sessions}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity by hour */}
      {d.activity_by_hour && d.activity_by_hour.length > 0 && (() => {
        const maxHod = Math.max(...d.activity_by_hour!.map(x => x.sessions), 1);
        const peakHour = d.activity_by_hour!.reduce((a, b) => b.sessions > a.sessions ? b : a, { hour: 0, sessions: 0 });
        return (
          <div className="insights-card">
            <div className="insights-card-title">Activity by hour <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--muted)' }}>Peak: {peakHour.hour}:00</span></div>
            <div className="insights-bars">
              {d.activity_by_hour!.map(r => {
                const pct = (r.sessions / maxHod * 100).toFixed(0);
                const isPeak = r.hour === peakHour.hour && peakHour.sessions > 0;
                return (
                  <div key={r.hour} className="insights-bar-row">
                    <span className="insights-bar-label">{String(r.hour).padStart(2, '0')}</span>
                    <div className="insights-bar-track"><div className={`insights-bar-fill${isPeak ? ' insights-bar-peak' : ''}`} style={{ width: `${pct}%` }} /></div>
                    <span className="insights-bar-value">{r.sessions}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 10, marginTop: 12, opacity: 0.6 }}>
        Data from the last {d.period_days || period} days
      </div>
    </div>
  );
}
