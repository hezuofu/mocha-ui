import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../../api/client';
import { usePanelStore } from '../../store/panelStore';

const SECTIONS = [
  { key: 'memory' as const, label: 'My Notes', iconKey: 'brain' },
  { key: 'user' as const, label: 'User Profile', iconKey: 'user' },
  { key: 'soul' as const, label: 'Agent Soul', iconKey: 'sparkles' },
];

/** Sidebar: section menu buttons — matches original #memoryPanel .side-menu */
export function MemorySideMenu() {
  const section = usePanelStore(s => s.memorySection);
  const setSection = usePanelStore(s => s.setMemorySection);
  return (
    <div className="side-menu" id="memoryPanel">
      {SECTIONS.map(s => (
        <button key={s.key} type="button" className={`side-menu-item${section === s.key ? ' active' : ''}`}
          onClick={() => setSection(s.key)} data-memory-section={s.key}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {s.key === 'memory' ? (
              <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></>
            ) : s.key === 'user' ? (
              <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>
            ) : (
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            )}
          </svg>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Main area: matches original #mainMemory structure */
export default function MemoryPanel() {
  const section = usePanelStore(s => s.memorySection);
  const [memories, setMemories] = useState<Record<string, string>>({});
  const [mtime, setMtime] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'empty' | 'read' | 'edit'>('empty');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Record<string, unknown>>('/api/memory');
      const d = data as unknown as Record<string, unknown>;
      const m: Record<string, string> = {};
      const t: Record<string, number> = {};
      for (const key of ['memory', 'user', 'soul'] as const) {
        m[key] = String(d[key] || '');
        // Try to extract mtime from meta if available
        const meta = (d as any)[key + '_mtime'];
        if (typeof meta === 'number') t[key] = meta;
      }
      setMemories(m);
      setMtime(t);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset mode when section changes
  useEffect(() => {
    if (section) {
      setMode('read');
    } else {
      setMode('empty');
    }
    setError('');
  }, [section]);

  const handleEdit = () => {
    if (!section) return;
    setEditContent(memories[section] || '');
    setMode('edit');
    setError('');
  };

  const handleCancel = () => {
    setMode('read');
    setError('');
  };

  const handleSave = async () => {
    if (!section) return;
    setSaving(true);
    setError('');
    try {
      await apiPost('/api/memory/write', { section, content: editContent });
      setMemories(prev => ({ ...prev, [section]: editContent }));
      // Reload to get updated mtime
      await load();
      setMode('read');
    } catch (e) {
      setError((e as any)?.message || 'Save failed');
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--muted)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
    </div>;
  }

  const currentSection = SECTIONS.find(s => s.key === section);
  const content = section ? memories[section] || '' : '';

  return (
    <>
      {/* ── Header — matches original .main-view-header ── */}
      <div className="main-view-header">
        <div className="main-view-title" id="memoryDetailTitle">
          {currentSection?.label || ''}
        </div>
        <div className="main-view-actions">
          {/* Edit button — shown in read mode */}
          {mode === 'read' && (
            <button id="btnEditMemoryDetail" className="panel-head-btn has-tooltip has-tooltip--bottom"
              data-tooltip="Edit" aria-label="Edit" onClick={handleEdit}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          )}
          {/* Cancel + Save — shown in edit mode */}
          {mode === 'edit' && (
            <>
              <button id="btnCancelMemoryDetail" className="panel-head-btn has-tooltip has-tooltip--bottom"
                data-tooltip="Cancel" aria-label="Cancel" onClick={handleCancel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <button id="btnSaveMemoryDetail" className="panel-head-btn primary has-tooltip has-tooltip--bottom"
                data-tooltip="Save" aria-label="Save" onClick={handleSave} disabled={saving}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Body (read mode) — matches original #memoryDetailBody ── */}
      {mode === 'read' && (
        <div className="main-view-body" id="memoryDetailBody">
          {content ? (
            <div className="main-view-content">
              {mtime[section || ''] ? (
                <div className="memory-detail-mtime">{new Date(mtime[section || ''] * 1000).toLocaleString()}</div>
              ) : null}
              <div className="memory-content preview-md">{content}</div>
            </div>
          ) : (
            <div className="main-view-content">
              <div className="memory-empty">Nothing here yet</div>
            </div>
          )}
        </div>
      )}

      {/* ── Body (edit mode) — textarea form ── */}
      {mode === 'edit' && (
        <div className="main-view-body" id="memoryDetailBody">
          <div className="main-view-content">
            <form className="detail-form" onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="detail-form-row">
                <label htmlFor="memEditContent">Notes</label>
                <textarea id="memEditContent" rows={20} spellCheck={false}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)} />
              </div>
              {error && <div className="detail-form-error">{error}</div>}
            </form>
          </div>
        </div>
      )}

      {/* ── Empty state — matches original #memoryDetailEmpty ── */}
      {mode === 'empty' && (
        <div className="main-view-empty" id="memoryDetailEmpty">
          <svg className="main-view-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>
          <div className="main-view-empty-title">Select a memory section</div>
          <div className="main-view-empty-sub">Pick a section from the sidebar to view or edit its contents.</div>
        </div>
      )}
    </>
  );
}
