import { useState, useEffect } from 'react';
import { apiGet } from '../../api/client';

interface KanbanTask {
  id: string; title: string; status: 'ready' | 'blocked' | 'done' | 'archived';
  assignee?: string; priority?: string;
}

const COLUMNS = [
  { key: 'ready' as const, label: 'Ready', color: 'var(--accent)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/></svg> },
  { key: 'blocked' as const, label: 'Blocked', color: 'var(--warning)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { key: 'done' as const, label: 'Done', color: 'var(--success)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> },
  { key: 'archived' as const, label: 'Archived', color: 'var(--muted)', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/></svg> },
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

  if (loading) return <div className="panel-loading"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Dispatcher */}
      <div style={{ padding: '4px 12px 6px', display: 'flex', gap: 6, flexShrink: 0 }}>
        <button className="btn-primary-sm" onClick={async () => {
          try { await import('../../api/client').then(({ apiPost }) => apiPost('/api/kanban/', { action: 'dispatch' })); load(); } catch {}
        }} title="Auto-assign tasks to workers">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run dispatcher
        </button>
        <button className="btn-icon-sm" onClick={load} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>

      {/* Toolbar */}
      <div className="panel-toolbar" style={{ gap: 8, flexShrink: 0 }}>
        <div className="panel-search" style={{ flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-icon-sm" onClick={load}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
      </div>

      {/* New task */}
      <div style={{ padding: '4px 12px 8px', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
          placeholder="New task..." className="memory-textarea" style={{ padding: '6px 10px', minHeight: 'auto', flex: 1 }} />
        <button className="btn-primary-sm" onClick={addTask}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
      </div>

      {/* Kanban board columns */}
      <div style={{ flex: 1, display: 'flex', gap: 6, overflow: 'auto', padding: '0 8px 8px' }}>
        {COLUMNS.map(col => {
          const colTasks = filtered.filter(t => t.status === col.key);
          return (
            <div key={col.key} style={{
              flex: '1 0 0', minWidth: 0, display: 'flex', flexDirection: 'column',
              border: dragOver === col.key ? `2px dashed ${col.color}` : '1px solid var(--border)',
              borderRadius: 10, background: dragOver === col.key ? 'var(--accent-bg)' : 'var(--surface-subtle)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault(); setDragOver(null);
                const id = e.dataTransfer!.getData('text/plain');
                if (id) moveTask(id, col.key);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <span style={{ color: col.color }}>{col.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{colTasks.length}</span>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
                {colTasks.map(task => (
                  <div key={task.id} draggable
                    onDragStart={e => { e.dataTransfer!.setData('text/plain', task.id); }}
                    style={{
                      padding: '8px 10px', margin: 3, borderRadius: 6, cursor: 'grab',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      fontSize: 12, color: 'var(--text)', lineHeight: 1.4,
                      transition: 'border-color 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    {(task.assignee || task.priority) && (
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 6 }}>
                        {task.assignee && <span>👤 {task.assignee}</span>}
                        {task.priority && <span style={{ color: task.priority === 'high' ? 'var(--error)' : 'var(--muted)' }}>● {task.priority}</span>}
                      </div>
                    )}
                  </div>
                ))}
                {colTasks.length === 0 && <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>Drop tasks here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
