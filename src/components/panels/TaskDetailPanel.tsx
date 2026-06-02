import { useState, useEffect } from 'react';
import { usePanelStore } from '../../store/panelStore';
import { getCrons, runCronNow, deleteCron } from '../../api/endpoints';
import { apiPost } from '../../api/client';
import type { CronJob } from '../../types';

/* ── Icons ── */
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>;
const ResumeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/><line x1="22" y1="4" x2="22" y2="20"/></svg>;
const EditIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const DupIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const ClockIcon = () => <svg className="main-view-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

export default function TaskDetailPanel() {
  const cronDetailId = usePanelStore(s => s.cronDetailId);
  const cronMode = usePanelStore(s => s.cronMode);
  const clearCronDetail = usePanelStore(s => s.clearCronDetail);
  const setCronDetail = usePanelStore(s => s.setCronDetail);

  const [job, setJob] = useState<CronJob | null>(null);
  const [allJobs, setAllJobs] = useState<CronJob[]>([]);

  const load = async () => {
    try {
      const data = await getCrons();
      setAllJobs(data.jobs || []);
      if (cronDetailId) {
        const j = data.jobs.find(x => x.id === cronDetailId);
        setJob(j || null);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, [cronDetailId]);

  // Reload when cron jobs change
  useEffect(() => {
    const h = () => load();
    window.addEventListener('cron-list-changed', h);
    return () => window.removeEventListener('cron-list-changed', h);
  }, [cronDetailId]);

  const handleRun = async () => { if (!job) return; await runCronNow(job.id); };
  const handlePause = async () => { if (!job) return; await apiPost('/api/crons/pause', { job_id: job.id }); load(); };
  const handleResume = async () => { if (!job) return; await apiPost('/api/crons/resume', { job_id: job.id }); load(); };
  const handleDelete = async () => { if (!job) return; await deleteCron(job.id); clearCronDetail(); window.dispatchEvent(new CustomEvent('cron-list-changed')); };

  // ── Empty state ──
  if (!job || cronMode === 'empty') {
    return (
      <>
        <div className="main-view-header">
          <div className="main-view-title" id="taskDetailTitle"></div>
          <div className="main-view-actions"></div>
        </div>
        <div className="main-view-body" id="taskDetailBody" style={{ display: 'none' }}></div>
        <div className="main-view-empty" id="taskDetailEmpty" style={{ display: '' }}>
          <ClockIcon />
          <div className="main-view-empty-title">Select a scheduled job</div>
          <div className="main-view-empty-sub">Pick a job from the sidebar to view its details and runs, or create a new one.</div>
        </div>
      </>
    );
  }

  // ── Read mode ──
  const isActive = job.active !== false;
  const statusMeta = isActive ? { label: 'Active', detailClass: 'active' } : { label: 'Paused', detailClass: '' };
  const schedule = job.schedule_display || job.schedule || '';
  const nextRun = job.next_run_at ? new Date(job.next_run_at * 1000).toLocaleString() : 'N/A';
  const lastRun = job.last_run_at ? new Date(job.last_run_at * 1000).toLocaleString() : 'Never';
  const skills = Array.isArray((job as any).skills) && (job as any).skills.length ? (job as any).skills.join(', ') : '—';

  return (
    <>
      <div className="main-view-header">
        <div className="main-view-title" id="taskDetailTitle">{job.name || schedule || '(unnamed)'}</div>
        <div className="main-view-actions">
          {isActive && (
            <button className="panel-head-btn has-tooltip has-tooltip--bottom" onClick={handleRun} data-tooltip="Run now" aria-label="Run now"><PlayIcon /></button>
          )}
          <button className="panel-head-btn has-tooltip has-tooltip--bottom"
            onClick={isActive ? handlePause : handleResume}
            data-tooltip={isActive ? 'Pause' : 'Resume'} aria-label={isActive ? 'Pause' : 'Resume'}>
            {isActive ? <PauseIcon /> : <ResumeIcon />}
          </button>
          <button className="panel-head-btn has-tooltip has-tooltip--bottom" data-tooltip="Edit" aria-label="Edit"><EditIcon /></button>
          <button className="panel-head-btn has-tooltip has-tooltip--bottom" data-tooltip="Duplicate" aria-label="Duplicate"><DupIcon /></button>
          <button className="panel-head-btn has-tooltip has-tooltip--bottom" onClick={handleDelete} data-tooltip="Delete" aria-label="Delete"><TrashIcon /></button>
        </div>
      </div>
      <div className="main-view-body" id="taskDetailBody" style={{ display: '' }}>
        <div className="main-view-content">
          <div className="detail-card">
            <div className="detail-card-title">Status</div>
            <div className="detail-row"><div className="detail-row-label">Status</div><div className="detail-row-value"><span className={`detail-badge ${statusMeta.detailClass}`}>{statusMeta.label}</span></div></div>
            <div className="detail-row"><div className="detail-row-label">Schedule</div><div className="detail-row-value"><code>{schedule}</code></div></div>
            <div className="detail-row"><div className="detail-row-label">Next run</div><div className="detail-row-value">{nextRun}</div></div>
            <div className="detail-row"><div className="detail-row-label">Last run</div><div className="detail-row-value">{lastRun}</div></div>
            {job.skills && <div className="detail-row"><div className="detail-row-label">Skills</div><div className="detail-row-value">{skills}</div></div>}
          </div>
          {job.prompt && (
            <div className="detail-card">
              <div className="detail-card-title">Prompt</div>
              <div className="detail-prompt expanded">{job.prompt}</div>
            </div>
          )}
          {job.last_error && (
            <div className="detail-row" style={{ padding: '8px 0' }}>
              <div className="detail-row-label">Error</div>
              <div className="detail-row-value" style={{ color: 'var(--accent-text)' }}>{job.last_error}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
