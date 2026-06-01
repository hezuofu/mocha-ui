import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../api/client';
import { usePanelStore } from '../../store/panelStore';

const SECTIONS = [
  { key: 'memory' as const, label: 'My Notes' },
  { key: 'user' as const, label: 'User Profile' },
  { key: 'soul' as const, label: 'Agent Soul' },
];

export default function MemoryPanel() {
  const section = usePanelStore(s => s.memorySection);
  const [memories, setMemories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Record<string, unknown>>('/api/memory');
      const d = data as unknown as Record<string, unknown>;
      const m: Record<string, string> = {};
      for (const key of ['memory', 'user', 'soul'] as const) {
        const section = d[key] as Record<string, unknown> | undefined;
        m[key] = String(section?.content || '');
      }
      setMemories(m);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPost('/api/memory/save', { section, content: memories[section] || '' });
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="settings-main" style={{ padding: 24 }}><div style={{ color: 'var(--muted)' }}>Loading...</div></div>;

  return (
    <div className="settings-main" style={{ padding: 24, maxWidth: 960, margin: '0 auto', width: '100%' }}>
      <div className="settings-section">
        <textarea
          style={{ width: '100%', minHeight: 200, background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-mono)' }}
          value={memories[section] || ''}
          onChange={e => { const v = e.target.value; setMemories(prev => ({ ...prev, [section]: v })); }}
          placeholder={section === 'memory' ? 'Notes your agent can reference...' : section === 'user' ? 'Information about you the agent should know...' : 'Define your agent\'s personality and behavior...'}
        />
        <button className="panel-icon-btn" onClick={handleSave} disabled={saving} style={{ marginTop: 12, display: 'inline-flex', gap: 6, fontSize: 13, padding: '8px 16px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save {SECTIONS.find(s => s.key === section)?.label}
        </button>
      </div>
    </div>
  );
}

/** Sidebar: section menu buttons */
export function MemorySideMenu() {
  const section = usePanelStore(s => s.memorySection);
  const setSection = usePanelStore(s => s.setMemorySection);
  return (
    <div className="side-menu" id="memoryPanel">
      {SECTIONS.map(s => (
        <button key={s.key} className={`side-menu-item${section === s.key ? ' active' : ''}`}
          onClick={() => setSection(s.key)} data-memory-section={s.key}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
