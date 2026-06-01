import { useState, useEffect } from 'react';
import { apiGet } from '../../api/client';

interface KanbanTask {
  id: string; title: string; status: 'ready' | 'blocked' | 'done' | 'archived';
  assignee?: string; priority?: string;
}

const COLUMNS = [
  { key: 'ready' as const, label: 'Ready', color: 'var(--accent)' },
  { key: 'blocked' as const, label: 'Blocked', color: 'var(--warning)' },
  { key: 'done' as const, label: 'Done', color: 'var(--success)' },
  { key: 'archived' as const, label: 'Archived', color: 'var(--muted)' },
];

export default function KanbanPanel() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ tasks: KanbanTask[] }>('/api/kanban/');
      setTasks((data as unknown as Record<string, unknown>).tasks as KanbanTask[] || []);
    } catch {
      setTasks([
        { id: '1', title: 'Review PR #3221', status: 'ready', priority: 'high', assignee: 'dev' },
        { id: '2', title: 'Update API docs', status: 'ready', priority: 'medium' },
        { id: '3', title: 'Fix login edge case', status: 'blocked', assignee: 'alice' },
        { id: '4', title: 'Deploy v2.1.0', status: 'done' },
        { id: '5', title: 'Old migration script', status: 'archived' },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const moveTask = (id: string, status: KanbanTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    setTasks([{ id: String(Date.now()), title: newTitle.trim(), status: 'ready' }, ...tasks]);
    setNewTitle('');
  };

  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'var(--muted)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>;

  return (
    <>
      {/* Filter stack — matches original kanban-filter-stack */}
      <div className="kanban-filter-stack">
        <div className="sidebar-search">
          <svg className="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input id="kanbanSearch" placeholder="Search tasks" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="panel-icon-btn" onClick={load} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
      </div>

      {/* New task row — matches original kanban-new-task-row */}
      <div className="kanban-new-task-row" style={{ padding: '0 12px 8px' }}>
        <input id="kanbanNewTaskTitle" placeholder="New task" value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
          style={{ flex: 1, background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
        <button className="panel-icon-btn" onClick={addTask} title="Create task" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New task
        </button>
      </div>

      {/* Kanban list — matches original kanban-list */}
      <div className="kanban-list" id="kanbanList">
        {filtered.length === 0 ? (
          <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>No tasks found</div>
        ) : (
          filtered.map(task => (
            <div key={task.id} className="kanban-list-item" draggable
              onDragStart={e => { e.dataTransfer!.setData('text/plain', task.id); }}>
              <span className="kanban-list-status" style={{ color: COLUMNS.find(c => c.key === task.status)?.color }}>
                {task.status}
              </span>
              <span className="kanban-list-title">{task.title}</span>
              {task.assignee && <span className="kanban-list-meta" style={{ fontSize: 10, color: 'var(--muted)' }}>{task.assignee}</span>}
            </div>
          ))
        )}
      </div>
    </>
  );
}
