import { useState, useEffect } from 'react';
import { apiGet } from '../../api/client';

interface KanbanColumn { name: string; tasks: any[] }
interface KanbanBoard { columns: KanbanColumn[]; read_only?: boolean }

export default function KanbanBoardPanel() {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<any>('/api/kanban/board');
      if (data && data.columns) {
        setBoard(data);
      } else {
        setBoard(null);
      }
    } catch {
      setBoard(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Listen for refresh
  useEffect(() => {
    const h = () => load();
    window.addEventListener('kanban-refresh', h);
    return () => window.removeEventListener('kanban-refresh', h);
  }, []);

  const columns = board?.columns || [];
  const totalTasks = columns.reduce((n, col) => n + (col.tasks || []).length, 0);

  return (
    <>
      {/* ── Header ── */}
      <div className="main-view-header">
        <div>
          <div className="main-view-title-row">
            <div className="main-view-title">Board</div>
          </div>
          {board?.read_only && <div className="kanban-readonly" style={{ display: '' }}>Read-only view</div>}
        </div>
        <div className="main-view-actions">
          <button className="panel-head-btn has-tooltip has-tooltip--bottom" data-tooltip="New board" aria-label="New board">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="17.5" y1="14" x2="17.5" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>
          </button>
          <button className="panel-head-btn has-tooltip has-tooltip--bottom kanban-nudge-dispatch-btn" data-tooltip="Preview dispatcher (dry-run)" aria-label="Preview dispatcher (dry-run)">▶</button>
          <button className="panel-head-btn has-tooltip has-tooltip--bottom kanban-run-dispatch-btn" data-tooltip="Run dispatcher — claim Ready tasks" aria-label="Run dispatcher">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
          </button>
        </div>
      </div>

      <div className="kanban-task-preview" id="kanbanTaskPreview" style={{ display: 'none' }}></div>

      {/* ── Board area ── */}
      <div className="kanban-board-wrap">
        <div className="kanban-board" id="kanbanBoard">
          {loading ? (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : !board || totalTasks === 0 ? (
            <div className="main-view-empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="main-view-empty-title">No Kanban data</div>
              <div className="main-view-empty-sub">This is the Hermes Agent work queue. Create or triage a task, assign it, move it to Ready, then let the dispatcher claim it.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, overflow: 'auto', padding: '8px 0' }}>
              {columns.map(col => (
                <div key={col.name} className="kanban-col" style={{ flex: '0 0 280px', minWidth: 240, background: 'var(--surface-subtle)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{col.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 99 }}>{col.tasks?.length || 0}</span>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                    {(col.tasks || []).map((task: any) => (
                      <div key={task.id} className="kanban-card" style={{ padding: 8, marginBottom: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{task.title || task.id}</div>
                        {task.assignee && <div style={{ fontSize: 10, color: 'var(--muted)' }}>@{task.assignee}</div>}
                      </div>
                    ))}
                    {(!col.tasks || col.tasks.length === 0) && (
                      <div style={{ padding: 12, color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>No tasks</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
