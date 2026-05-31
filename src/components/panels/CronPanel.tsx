import { useState, useEffect } from 'react';
import { getCrons, runCronNow, deleteCron, createCron } from '../../api/endpoints';
import type { CronJob } from '../../types';
/* All icons replaced with original inline SVGs from static/icons.js */

export default function CronPanel() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSchedule, setFormSchedule] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAgent, setFormAgent] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCrons();
      setJobs(data.jobs || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRun = async (id: string) => {
    await runCronNow(id);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteCron(id);
    load();
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    await createCron({
      name: formName.trim(),
      schedule: formSchedule.trim(),
      description: formDescription.trim(),
      agent: formAgent.trim() || undefined,
    });
    setFormName('');
    setFormSchedule('');
    setFormDescription('');
    setFormAgent('');
    setShowForm(false);
    load();
  };

  if (loading) return <div className="panel-loading"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>;

  return (
    <div className="cron-panel">
      <div className="panel-toolbar">
        <button className="btn-icon-sm" onClick={load}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
        <button className="btn-primary-sm" onClick={() => setShowForm(!showForm)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New job
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            autoFocus
            className="memory-textarea"
            style={{ padding: '6px 10px', minHeight: 'auto' }}
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="Job name..."
          />
          <input
            className="memory-textarea"
            style={{ padding: '6px 10px', minHeight: 'auto' }}
            value={formSchedule}
            onChange={e => setFormSchedule(e.target.value)}
            placeholder="Cron schedule (e.g. 0 9 * * *)"
          />
          <input
            className="memory-textarea"
            style={{ padding: '6px 10px', minHeight: 'auto' }}
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <input
            className="memory-textarea"
            style={{ padding: '6px 10px', minHeight: 'auto' }}
            value={formAgent}
            onChange={e => setFormAgent(e.target.value)}
            placeholder="Agent name (optional)"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary-sm" onClick={handleCreate} disabled={!formName.trim()}>Create</button>
            <button className="btn-icon-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="panel-empty">No cron jobs configured</div>
      ) : (
        <div className="cron-list">
          {jobs.map(job => (
            <div key={job.id} className="cron-item">
              <div className="cron-item-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div>
                  <div className="cron-name">{job.name}</div>
                  <div className="cron-schedule">{job.schedule || 'Manual'}</div>
                </div>
              </div>
              <div className="cron-item-actions">
                <button className="btn-icon-sm" onClick={() => handleRun(job.id)} title="Run now">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
                <button className="btn-icon-sm danger" onClick={() => handleDelete(job.id)} title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
