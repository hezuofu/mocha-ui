import { useState, useEffect } from 'react';
import { getCrons, runCronNow, deleteCron, createCron } from '../../api/endpoints';
import { apiPost } from '../../api/client';
import { usePanelStore } from '../../store/panelStore';
import type { CronJob } from '../../types';

export default function CronPanel() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSchedule, setFormSchedule] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAgent, setFormAgent] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const setCronDetail = usePanelStore(s => s.setCronDetail);
  const cronDetailId = usePanelStore(s => s.cronDetailId);

  const load = async () => {
    setLoading(true);
    try { const data = await getCrons(); setJobs(data.jobs || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Listen for sidebar button events
  useEffect(() => {
    const hRefresh = () => load();
    const hNew = () => setShowForm(true);
    window.addEventListener('cron-refresh', hRefresh);
    window.addEventListener('cron-new', hNew);
    return () => {
      window.removeEventListener('cron-refresh', hRefresh);
      window.removeEventListener('cron-new', hNew);
    };
  }, []);

  const handleRun = async (id: string) => { await runCronNow(id); load(); };
  const handleDelete = async (id: string) => { await deleteCron(id); load(); };

  const handlePause = async (id: string) => { await apiPost('/api/crons/pause', { job_id: id }); load(); };
  const handleResume = async (id: string) => { await apiPost('/api/crons/resume', { job_id: id }); load(); };

  const resetForm = () => { setFormName(''); setFormSchedule(''); setFormDescription(''); setFormAgent(''); setShowForm(false); setEditingId(null); };

  const startEdit = (job: CronJob) => {
    setEditingId(job.id); setFormName(job.name); setFormSchedule(job.schedule || '');
    setFormDescription(job.description || ''); setFormAgent(job.agent || ''); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    if (editingId) {
      await apiPost('/api/crons/update', { job_id: editingId, name: formName.trim(), schedule: formSchedule.trim(), description: formDescription.trim(), agent: formAgent.trim() || undefined });
    } else {
      await createCron({ name: formName.trim(), schedule: formSchedule.trim(), description: formDescription.trim(), agent: formAgent.trim() || undefined });
    }
    resetForm(); load();
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20, color: "var(--muted)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>;

  return (
    <>

      {showForm && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input autoFocus value={formName} onChange={e => setFormName(e.target.value)} placeholder="Job name..."
            style={{ padding: '6px 10px', minHeight: 'auto', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, outline: 'none', width: '100%' }} />
          <input value={formSchedule} onChange={e => setFormSchedule(e.target.value)} placeholder="Cron schedule (e.g. 0 9 * * *)"
            style={{ padding: '6px 10px', minHeight: 'auto', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, outline: 'none', width: '100%' }} />
          <input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Description (optional)"
            style={{ padding: '6px 10px', minHeight: 'auto', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, outline: 'none', width: '100%' }} />
          <input value={formAgent} onChange={e => setFormAgent(e.target.value)} placeholder="Agent name (optional)"
            style={{ padding: '6px 10px', minHeight: 'auto', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, outline: 'none', width: '100%' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="panel-icon-btn" onClick={handleSubmit} disabled={!formName.trim()}>{editingId ? 'Update' : 'Create'}</button>
            <button className="panel-icon-btn" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12 }}>No scheduled jobs found.</div>
      ) : (
        <>
          {jobs.map(job => (
            <div key={job.id} className={`cron-item${cronDetailId === job.id ? ' active' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => { setCronDetail(job.id); }}>
                <div className="cron-item-info">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <div>
                    <div className="cron-name">{job.name}</div>
                    <div className="cron-schedule">{job.schedule || 'Manual'}{!job.active ? ' (paused)' : ''}</div>
                  </div>
                </div>
                <div className="cron-item-actions">
                  <button className="panel-icon-btn" onClick={e => { e.stopPropagation(); job.active === false ? handleResume(job.id) : handlePause(job.id); }} title={job.active === false ? 'Resume' : 'Pause'}>
                    {job.active === false
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>}
                  </button>
                  <button className="panel-icon-btn" onClick={e => { e.stopPropagation(); handleRun(job.id); }} title="Run now">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </button>
                  <button className="panel-icon-btn" onClick={e => { e.stopPropagation(); startEdit(job); }} title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button className="panel-icon-btn danger" onClick={e => { e.stopPropagation(); handleDelete(job.id); }} title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                  </button>
                </div>
              </div>
              {expandedId === job.id && (
                <div style={{ padding: '8px 12px 8px 30px', borderTop: '1px solid var(--border)', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                  {job.description && <div style={{ marginBottom: 4 }}>{job.description}</div>}
                  {job.agent && <div>Agent: {job.agent}</div>}
                  {job.last_run && <div>Last run: {new Date(job.last_run * 1000).toLocaleString()}</div>}
                  {job.next_run && <div>Next run: {new Date(job.next_run * 1000).toLocaleString()}</div>}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}
