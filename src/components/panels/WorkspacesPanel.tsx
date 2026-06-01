import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../api/client';

interface Workspace {
  name: string;
  path: string;
  active?: boolean;
  friendly_name?: string;
}

export default function WorkspacesPanel() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPath, setNewPath] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ workspaces: Workspace[] }>('/api/workspaces');
      setWorkspaces((data as unknown as Record<string, unknown>).workspaces as Workspace[] || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleActivate = async (path: string) => {
    try { await apiPost('/api/workspaces/activate', { path }); load(); } catch {}
  };

  const handleDelete = async (path: string) => {
    if (!confirm(`Remove workspace "${path}"?`)) return;
    try { await apiPost('/api/workspaces/delete', { path }); load(); } catch {}
  };

  const handleCreate = async () => {
    if (!newPath.trim()) return;
    try { await apiPost('/api/workspaces/create', { path: newPath.trim() }); setNewPath(''); setCreating(false); load(); } catch {}
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20, color: "var(--muted)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin">
        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
      </svg>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 8px" }}>
        <button className="panel-icon-btn" onClick={load} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <button className="panel-icon-btn" onClick={() => setCreating(!creating)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
        </button>
      </div>

      {creating && (
        <div style={{ padding: '8px 12px', display: 'flex', gap: 8 }}>
          <input autoFocus value={newPath} onChange={e => setNewPath(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            placeholder="Workspace path..."
            style={{ background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", width: "100%" }} style={{ padding: '6px 10px', minHeight: 'auto', flex: 1 }} />
          <button className="panel-icon-btn" onClick={handleCreate}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></button>
        </div>
      )}

      <div className="panel-head-sub">Add and switch workspaces for your sessions.</div>

      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {workspaces.length === 0 ? (
          <div style={{ padding: 12, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>No workspaces configured</div>
        ) : (
          workspaces.map(w => (
            <div key={w.path} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', border: w.active ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 8, marginBottom: 6, background: w.active ? 'var(--accent-bg)' : 'var(--bg)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.friendly_name || w.name}
                  {w.active && <span className="profile-active-badge" style={{ marginLeft: 8 }}>Active</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{w.path}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {!w.active && (
                  <button className="panel-icon-btn" onClick={() => handleActivate(w.path)} title="Activate">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                )}
                <button className="panel-icon-btn danger" onClick={() => handleDelete(w.path)} title="Remove">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
