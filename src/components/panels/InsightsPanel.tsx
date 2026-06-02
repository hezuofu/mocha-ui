import { useState, useEffect, useCallback } from 'react';
import { getInsights, getSystemHealth, getWikiStatus, getSkillUsage } from '../../api/endpoints';
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

function fmtWikiTimestamp(value: any): string {
  if (!value) return 'Never';
  try { return new Date(value).toLocaleString(); }
  catch { return String(value); }
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

/* ── Stat icons (matching original) ── */
const StatIcons = {
  sessions: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  messages: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  tokens: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  cost: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
};

/* ── Sidebar controls ── */
export function InsightsControls() {
  const period = usePanelStore(s => s.insightsPeriod);
  const setPeriod = usePanelStore(s => s.setInsightsPeriod);
  return (
    <>
      <div className="panel-head-sub" style={{ padding: '0 12px 8px' }}>
        <select id="insightsPeriod" value={period} onChange={e => { setPeriod(Number(e.target.value)); }}
          style={{ width: '100%', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
          {PERIODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    </>
  );
}

/* ── Main area: full insights content ── */
export default function InsightsPanel({ sidebar }: { sidebar?: boolean }) {
  const period = usePanelStore(s => s.insightsPeriod);
  const [data, setData] = useState<InsightsData | null>(null);
  const [wikiStatus, setWikiStatus] = useState<any>(null);
  const [skillUsage, setSkillUsage] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [insightsData, wiki, skills] = await Promise.all([
        getInsights(period) as Promise<InsightsData>,
        getWikiStatus(),
        getSkillUsage(),
      ]);
      setData(insightsData);
      setWikiStatus(wiki);
      setSkillUsage(skills);
    } catch (e) {
      setError((e as Error).message || 'Failed to load insights');
    }
    setLoading(false);
  }, [period]);

  // Load system health separately
  const loadHealth = useCallback(async () => {
    try {
      const h = await getSystemHealth();
      setHealth(h);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadHealth(); }, []);

  // Sidebar mode
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
    return <div style={{ padding: 16, color: 'var(--error)' }}>{error}</div>;
  }

  if (!data) {
    return <div style={{ padding: 16, color: 'var(--muted)' }}>No insights available</div>;
  }

  const d = data;
  const dailyTokens = d.daily_tokens || [];
  const chartRows = bucketDaily(dailyTokens);
  const maxDaily = Math.max(...chartRows.map(r => (r.input_tokens || 0) + (r.output_tokens || 0)), 1);
  const labelEvery = Math.max(Math.ceil(chartRows.length / 7), 1);

  // System health
  const renderSystemHealth = () => {
    const h = health || {};
    const cpu = h.cpu != null ? Number(h.cpu) : null;
    const ram = h.memory != null ? Number(h.memory) : null;
    const disk = h.disk && typeof h.disk === 'object' ? Number((h.disk as any).percent) : null;
    const diskUsed = h.disk && (h.disk as any).used_bytes ? Math.round((h.disk as any).used_bytes / 1e9) + ' GB' : '';
    const diskTotal = h.disk && (h.disk as any).total_bytes ? Math.round((h.disk as any).total_bytes / 1e9) + ' GB' : '';
    const diskTitle = diskUsed && diskTotal ? `${diskUsed} / ${diskTotal}` : '';
    const hasAny = cpu != null || ram != null || disk != null;
    const statusText = h.status ? String(h.status).charAt(0).toUpperCase() + String(h.status).slice(1) : (hasAny ? 'Healthy' : 'Unavailable');

    return (
      <section className={`insights-card system-health-panel${!hasAny && !health ? ' loading' : ''}`}
        id="systemHealthPanel" aria-label="Host resource health" aria-live="polite">
        <div className="system-health-head">
          <div>
            <div className="insights-card-title">System health</div>
            <div className="system-health-sub">Current VPS resource usage</div>
          </div>
          <span className="system-health-status" id="systemHealthStatus">
            {!hasAny && !health ? <><span className="system-health-dot" aria-hidden="true" />Loading…</> : statusText}
          </span>
        </div>
        <div className="system-health-metrics">
          <div className="system-health-metric" data-system-health-metric="cpu">
            <div className="system-health-label"><span>CPU</span><span className="system-health-value">{cpu != null ? cpu + '%' : '—'}</span></div>
            <div className="system-health-bar" role="progressbar" aria-label="CPU usage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={cpu || 0}>
              <div className="system-health-bar-fill" style={{ width: (cpu || 0) + '%' }} />
            </div>
          </div>
          <div className="system-health-metric" data-system-health-metric="memory">
            <div className="system-health-label"><span>RAM</span><span className="system-health-value">{ram != null ? ram + '%' : '—'}</span></div>
            <div className="system-health-bar" role="progressbar" aria-label="RAM usage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ram || 0}>
              <div className="system-health-bar-fill" style={{ width: (ram || 0) + '%' }} />
            </div>
          </div>
          <div className="system-health-metric" data-system-health-metric="disk">
            <div className="system-health-label"><span>Disk</span><span className="system-health-value" title={diskTitle}>{disk != null ? disk + '%' : '—'}</span></div>
            <div className="system-health-bar" role="progressbar" aria-label="Disk usage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={disk || 0}>
              <div className="system-health-bar-fill" style={{ width: (disk || 0) + '%' }} />
            </div>
          </div>
        </div>
        <div className="system-health-foot">Live snapshot only; historical resource charts can build on this surface later.</div>
      </section>
    );
  };

  // LLM Wiki status
  const renderWikiStatus = () => {
    const s = wikiStatus || { status: 'error' };
    const isReady = s.available && s.status === 'ready';
    const isEmpty = s.available && s.status === 'empty';
    const isError = s.status === 'error';
    const badgeClass = isReady ? 'ok' : isError ? 'err' : isEmpty ? 'warn' : 'muted';
    const badgeText = isReady ? 'Available' : isError ? 'Error' : isEmpty ? 'Empty' : 'Unavailable';
    const docsUrl = /^https?:\/\//i.test(s.docs_url || '') ? s.docs_url : 'https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-llm-wiki';
    const toggleNote = s.toggle_available
      ? 'Toggle available from configured Hermes Agent setting.'
      : (s.toggle_reason || 'No stable LLM Wiki on/off config flag was detected, so this panel is read-only.');
    const statusNote = isReady
      ? 'LLM Wiki is configured and page metadata is visible without exposing wiki content.'
      : isEmpty
        ? 'LLM Wiki exists but has no entity, concept, comparison, or query pages yet.'
        : isError
          ? `Unable to inspect LLM Wiki status${s.error ? ': ' + s.error : ''}.`
          : 'No LLM Wiki directory was found. Set WIKI_PATH or skills.config.wiki.path to enable status visibility.';

    return (
      <div className="insights-card wiki-status-card" id="llmWikiStatusCard">
        <div className="wiki-status-head">
          <div>
            <div className="insights-card-title">LLM Wiki</div>
            <div className="wiki-status-sub">Knowledge-base observability</div>
          </div>
          <span className={`wiki-status-badge ${badgeClass}`}>{badgeText}</span>
        </div>
        <div className="wiki-status-note">{statusNote}</div>
        <div className="wiki-status-grid">
          <div><span>Enabled</span><strong>{s.enabled ? 'Yes' : 'No'}</strong></div>
          <div><span>Entries</span><strong>{Number(s.entry_count || 0).toLocaleString()}</strong></div>
          <div><span>Pages</span><strong>{Number(s.page_count || 0).toLocaleString()}</strong></div>
          <div><span>raw/ files</span><strong>{Number(s.raw_source_count || 0).toLocaleString()}</strong></div>
          <div><span>Last updated</span><strong>{fmtWikiTimestamp(s.last_updated)}</strong></div>
          <div><span>Last writer</span><strong>{s.last_writer || 'Not available'}</strong></div>
        </div>
        <div className="wiki-status-footer">
          <span>{toggleNote}</span>
          <a href={docsUrl} target="_blank" rel="noopener noreferrer">Docs</a>
        </div>
      </div>
    );
  };

  // Skill usage
  const renderSkillUsage = () => {
    const su = skillUsage || {};
    const skills = su.skill_names || [];
    const total = su.total_invocations || 0;
    if (!skills.length) {
      return (
        <div className="insights-card" id="skillUsageCard">
          <div className="insights-card-title">Skill Usage</div>
          <div className="insights-empty">No skill usage data yet</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Skills will appear here once used in conversations.</div>
        </div>
      );
    }
    // Build skill rows from usage data
    const usage = su.usage || {};
    const rows = skills.map((name: string) => {
      const u = usage[name] || {};
      return (
        <div key={name} className="insights-table-row">
          <span className="insights-model-name" title={name}>{name}</span>
          <span>{fmtNum(u.invocations || 0)}</span>
          <span>{fmtTokens(u.input_tokens || 0)}</span>
          <span>{fmtTokens(u.output_tokens || 0)}</span>
        </div>
      );
    });
    return (
      <div className="insights-card" id="skillUsageCard">
        <div className="insights-card-title">Skill Usage ({total} invocations)</div>
        <div className="insights-table insights-model-table">
          <div className="insights-table-head">
            <span>Skill</span><span>Uses</span><span>In tokens</span><span>Out tokens</span>
          </div>
          {rows}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── System health panel ── */}
      {renderSystemHealth()}

      {/* ── LLM Wiki status ── */}
      {renderWikiStatus()}

      {/* ── Skill usage ── */}
      {renderSkillUsage()}

      {/* ── Overview stat cards ── */}
      <div className="insights-grid">
        {[
          { key: 'sessions', label: 'Sessions', value: fmtNum(d.total_sessions) },
          { key: 'messages', label: 'Messages', value: fmtNum(d.total_messages) },
          { key: 'tokens', label: 'Tokens', value: fmtTokens(d.total_tokens) },
          { key: 'cost', label: 'Estimated Cost', value: fmtCost(d.total_cost) },
        ].map(c => (
          <div key={c.key} className="insights-stat">
            <div className="insights-stat-icon">{StatIcons[c.key as keyof typeof StatIcons]}</div>
            <div className="insights-stat-info">
              <div className="insights-stat-value">{c.value}</div>
              <div className="insights-stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Daily token chart ── */}
      {chartRows.length > 0 ? (
        <div className="insights-card">
          <div className="insights-card-title">Daily Tokens</div>
          <div className="insights-daily-token-chart">
            {chartRows.map((r, idx) => {
              const input = r.input_tokens || 0;
              const output = r.output_tokens || 0;
              const inputPct = Math.max((input / maxDaily) * 100, input ? 2 : 0).toFixed(1);
              const outputPct = Math.max((output / maxDaily) * 100, output ? 2 : 0).toFixed(1);
              const showLabel = idx === 0 || idx === chartRows.length - 1 || idx % labelEvery === 0;
              const titleDate = r.title || r.date;
              const title = `${titleDate} · In: ${fmtTokens(input)} · Out: ${fmtTokens(output)}`;
              return (
                <div key={idx} className="insights-daily-bar" title={title}>
                  <div className="insights-daily-stack" aria-label={title}>
                    <div className="insights-daily-bar-output" style={{ height: `${outputPct}%` }} />
                    <div className="insights-daily-bar-input" style={{ height: `${inputPct}%` }} />
                  </div>
                  <span>{showLabel ? (r.label !== undefined ? r.label : String(r.date || '').slice(5)) : ''}</span>
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
        <div className="insights-card"><div className="insights-card-title">Daily Tokens</div><div className="insights-empty">No usage data available</div></div>
      )}

      {/* ── Token breakdown + Models ── */}
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

      {/* ── Activity by day ── */}
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

      {/* ── Activity by hour ── */}
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
    </>
  );
}
