import { useState, useEffect } from 'react';
import { usePanelStore } from '../../store/panelStore';
import { apiGet, apiPost } from '../../api/client';

const LayersIcon = () => (
  <svg className="main-view-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
);

const EditIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

export default function SkillDetailPanel() {
  const skillDetailName = usePanelStore(s => s.skillDetailName);
  const skillMode = usePanelStore(s => s.skillMode);
  const clearSkillDetail = usePanelStore(s => s.clearSkillDetail);

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!skillDetailName || skillMode !== 'read') return;
    setLoading(true);
    apiGet<any>(`/api/skills/content?name=${encodeURIComponent(skillDetailName)}`)
      .then(data => setContent(data?.content || ''))
      .catch(() => setContent(''))
      .finally(() => setLoading(false));
  }, [skillDetailName, skillMode]);

  const handleDelete = async () => {
    if (!skillDetailName) return;
    try {
      await apiPost('/api/skills/delete', { name: skillDetailName });
      clearSkillDetail();
      window.dispatchEvent(new CustomEvent('skills-changed'));
    } catch { /* ignore */ }
  };

  if (!skillDetailName || skillMode === 'empty') {
    return (
      <>
        <div className="main-view-header">
          <div className="main-view-title" id="skillDetailTitle"></div>
          <div className="main-view-actions"></div>
        </div>
        <div className="main-view-body" id="skillDetailBody" style={{ display: 'none' }}></div>
        <div className="main-view-empty" id="skillDetailEmpty" style={{ display: '' }}>
          <LayersIcon />
          <div className="main-view-empty-title">Select a skill</div>
          <div className="main-view-empty-sub">Pick a skill from the sidebar to view its contents, or create a new one.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="main-view-header">
        <div className="main-view-title" id="skillDetailTitle">{skillDetailName}</div>
        <div className="main-view-actions">
          <button className="panel-head-btn has-tooltip has-tooltip--bottom" data-tooltip="Edit" aria-label="Edit"><EditIcon /></button>
          <button className="panel-head-btn has-tooltip has-tooltip--bottom" onClick={handleDelete} data-tooltip="Delete" aria-label="Delete"><TrashIcon /></button>
        </div>
      </div>
      <div className="main-view-body" id="skillDetailBody" style={{ display: '' }}>
        <div className="main-view-content skill-detail-content">
          {loading ? (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : content ? (
            <div className="skill-md" dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>(no content)</div>
          )}
        </div>
      </div>
    </>
  );
}
