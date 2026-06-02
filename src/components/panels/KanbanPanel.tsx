import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../../api/client';

interface KanbanTask {
  id: string; title: string; status: string;
  assignee?: string; priority?: string;
}

interface KanbanStats { by_status?: Record<string, number>; total?: number }

export default function KanbanPanel() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [tenants, setTenants] = useState<string[]>([]);
  const [stats, setStats] = useState<KanbanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (assigneeFilter) p.set('assignee', assigneeFilter);
    if (tenantFilter) p.set('tenant', tenantFilter);
    if (includeArchived) p.set('include_archived', '1');
    if (onlyMine) p.set('only_mine', '1');
    const qs = p.toString();
    return qs ? '?' + qs : '';
  }, [assigneeFilter, tenantFilter, includeArchived, onlyMine]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load board data
      const data = await apiGet<any>('/api/kanban/board' + buildQuery());
      const board = data || { columns: [] };
      const allTasks: KanbanTask[] = [];
      const cols = board.columns || [];
      for (const col of cols) {
        for (const t of (col.tasks || [])) {
          allTasks.push({ ...t, status: col.name || t.status });
        }
      }
      setTasks(allTasks);

      // Load assignees
      try {
        const a = await apiGet<any>('/api/kanban/assignees');
        const raw = a?.assignees || board?.assignees || [];
        // Assignees may be strings or objects {name, on_disk, counts}
        setAssignees(raw.map((v: any) => typeof v === 'string' ? v : v.name).filter(Boolean));
      } catch { /* ignore */ }

      // Load tenants
      if (board?.tenants) {
        const raw = board.tenants;
        setTenants(raw.map((v: any) => typeof v === 'string' ? v : v.name || v).filter(Boolean));
      }

      // Load stats
      try {
        const s = await apiGet<KanbanStats>('/api/kanban/stats');
        setStats(s);
      } catch { /* ignore */ }
    } catch {
      setTasks([]);
    }
    setLoading(false);
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  // Listen for sidebar refresh button
  useEffect(() => {
    const h = () => load();
    window.addEventListener('kanban-refresh', h);
    return () => window.removeEventListener('kanban-refresh', h);
  }, [load]);

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await apiGet<any>('/api/kanban/tasks/create', {
        method: 'POST', body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res?.task) setTasks(prev => [...prev, res.task]);
      setNewTitle('');
    } catch { /* ignore */ }
  };

  const bulkUpdate = async () => {
    if (!bulkStatus) return;
    try {
      await apiGet<any>('/api/kanban/tasks/bulk', {
        method: 'POST',
        body: JSON.stringify({ status: bulkStatus }),
      });
      load();
    } catch { /* ignore */ }
  };

  const totalStats = stats?.by_status
    ? Object.values(stats.by_status).reduce((a: number, b: any) => a + Number(b || 0), 0)
    : 0;

  return (
    <>
      {/* ── kanban-filter-stack ── */}
      <div className="kanban-filter-stack">
        {/* Search */}
        <div className="sidebar-search">
          <svg className="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input id="kanbanSearch" placeholder="Search tasks" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Assignee filter */}
        <select id="kanbanAssigneeFilter" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} aria-label="Assignee filter">
          <option value="">All assignees</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Tenant filter */}
        <select id="kanbanTenantFilter" value={tenantFilter} onChange={e => setTenantFilter(e.target.value)} aria-label="Tenant filter">
          <option value="">All tenants</option>
          {tenants.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Checkboxes */}
        <label className="kanban-check">
          <input id="kanbanIncludeArchived" type="checkbox" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)} />
          <span>Include archived</span>
        </label>
        <label className="kanban-check">
          <input id="kanbanOnlyMine" type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />
          <span>Only mine</span>
        </label>

        {/* Stats */}
        <div id="kanbanStats" className="kanban-stats" aria-live="polite">
          {stats?.by_status ? (
            <div className="kanban-stats-grid">
              <span className="kanban-stat-cell total"><strong>{totalStats}</strong> Stats</span>
              {Object.entries(stats.by_status).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => (
                <span key={status} className="kanban-stat-cell"><strong>{String(count)}</strong> {status}</span>
              ))}
            </div>
          ) : !loading ? (
            <div className="kanban-stats-grid">
              <span className="kanban-stat-cell total"><strong>0</strong> Stats</span>
            </div>
          ) : null}
        </div>

        {/* Bulk bar */}
        <div id="kanbanBulkBar" className="kanban-bulk-bar">
          <select id="kanbanBulkStatus" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} aria-label="Bulk status">
            <option value="">Status</option>
            <option value="ready">Ready</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </select>
          <button className="btn secondary" onClick={bulkUpdate}>Bulk action</button>
          <button className="btn secondary kanban-nudge-dispatch-btn" onClick={() => load()} title="Dry-run: shows what would be claimed without spawning workers">Preview dispatcher</button>
          <button className="btn primary kanban-run-dispatch-btn" onClick={() => load()} title="Claims Ready tasks and spawns worker subprocesses">Run dispatcher</button>
        </div>

        {/* New task row */}
        <div className="kanban-new-task-row">
          <input id="kanbanNewTaskTitle" placeholder="New task" value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask(); }} />
          <button className="btn secondary" onClick={addTask}>New task</button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="kanban-summary" id="kanbanSummary">{filtered.length} visible tasks</div>

      {/* ── Task list ── */}
      <div className="kanban-list" id="kanbanList">
        {loading ? (
          <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="kanban-empty">No matching tasks</div>
        ) : (
          filtered.map(task => (
            <div key={task.id} className="kanban-list-item" draggable
              onDragStart={e => { e.dataTransfer!.setData('text/plain', task.id); }}>
              <span className="kanban-list-status">{task.status}</span>
              <span className="kanban-list-title">{task.title}</span>
              {task.assignee && <span className="kanban-list-meta" style={{ fontSize: 10, color: 'var(--muted)' }}>{task.assignee}</span>}
            </div>
          ))
        )}
      </div>
    </>
  );
}
