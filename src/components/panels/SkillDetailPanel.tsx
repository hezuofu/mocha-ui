import { useState, useEffect } from 'react';
import { usePanelStore } from '../../store/panelStore';
import { apiGet, apiPost } from '../../api/client';
import { marked } from 'marked';

/** Strip YAML frontmatter from skill content (mirrors _stripYamlFrontmatter) */
function stripFrontmatter(content: string): { frontmatter: string | null; body: string } {
  if (!content) return { frontmatter: null, body: '' };
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!m) return { frontmatter: null, body: content };
  return { frontmatter: m[1], body: content.slice(m[0].length) };
}

export default function SkillDetailPanel() {
  const skillDetailName = usePanelStore(s => s.skillDetailName);
  const skillMode = usePanelStore(s => s.skillMode);
  const setSkillDetail = usePanelStore(s => s.setSkillDetail);
  const clearSkillDetail = usePanelStore(s => s.clearSkillDetail);

  const [content, setContent] = useState('');
  const [linkedFiles, setLinkedFiles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!skillDetailName || skillMode !== 'read') return;
    setLoading(true);
    setError('');
    apiGet<any>(`/api/skills/content?name=${encodeURIComponent(skillDetailName)}`)
      .then(data => {
        setContent(data?.content || '');
        setLinkedFiles(data?.linked_files || {});
      })
      .catch(() => setContent(''))
      .finally(() => setLoading(false));
  }, [skillDetailName, skillMode]);

  // Listen for create event from sidebar button
  useEffect(() => {
    const onCreate = () => {
      setFormName('');
      setFormCategory('');
      setFormContent('');
      setFormError('');
      setSkillDetail(null, 'create');
    };
    window.addEventListener('skill-create', onCreate);
    return () => window.removeEventListener('skill-create', onCreate);
  }, [setSkillDetail]);

  const handleEdit = () => {
    if (!skillDetailName) return;
    setFormName(skillDetailName);
    setFormContent(content);
    setFormError('');
    setSkillDetail(skillDetailName, 'edit');
  };

  const handleCancel = () => {
    if (skillDetailName) {
      setSkillDetail(skillDetailName, 'read');
    } else {
      clearSkillDetail();
    }
    setFormError('');
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Name is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      await apiPost('/api/skills/save', { name: formName.trim(), content: formContent, category: formCategory.trim() || undefined });
      setSkillDetail(skillDetailName, 'read');
      clearSkillDetail();
      // Reload will be triggered by skills-changed event
      window.dispatchEvent(new CustomEvent('skills-changed'));
    } catch (e: any) {
      setFormError(e?.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!skillDetailName) return;
    try {
      await apiPost('/api/skills/delete', { name: skillDetailName });
      clearSkillDetail();
      window.dispatchEvent(new CustomEvent('skills-changed'));
    } catch { /* ignore */ }
  };

  // ── Empty state ──
  if (!skillDetailName || skillMode === 'empty') {
    return (
      <>
        <div className="main-view-header">
          <div className="main-view-title" id="skillDetailTitle"></div>
          <div className="main-view-actions"></div>
        </div>
        <div className="main-view-body" id="skillDetailBody" style={{ display: 'none' }}></div>
        <div className="main-view-empty" id="skillDetailEmpty">
          <svg className="main-view-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <div className="main-view-empty-title">Select a skill</div>
          <div className="main-view-empty-sub">Pick a skill from the sidebar to view its contents, or create a new one.</div>
        </div>
      </>
    );
  }

  // ── Create / Edit mode ──
  if (skillMode === 'create' || skillMode === 'edit') {
    const isEdit = skillMode === 'edit';
    return (
      <>
        <div className="main-view-header">
          <div className="main-view-title" id="skillDetailTitle">
            {isEdit ? `Edit · ${skillDetailName}` : 'New skill'}
          </div>
          <div className="main-view-actions">
            <button id="btnCancelSkillDetail" className="panel-head-btn has-tooltip has-tooltip--bottom"
              data-tooltip="Cancel" aria-label="Cancel" onClick={handleCancel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <button id="btnSaveSkillDetail" className="panel-head-btn primary has-tooltip has-tooltip--bottom"
              data-tooltip="Save" aria-label="Save" onClick={handleSave} disabled={saving}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          </div>
        </div>
        <div className="main-view-body" id="skillDetailBody">
          <div className="main-view-content">
            <form className="detail-form" onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="detail-form-row">
                <label htmlFor="skillFormName">Name</label>
                <input type="text" id="skillFormName" value={formName} disabled={isEdit}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="my-skill" autoComplete="off" required />
                {isEdit && <div className="detail-form-hint">Renaming a skill is not supported. Create a new skill and delete the old one to rename.</div>}
              </div>
              <div className="detail-form-row">
                <label htmlFor="skillFormCategory">Category</label>
                <input type="text" id="skillFormCategory" value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  placeholder="Optional, e.g. devops" autoComplete="off" />
              </div>
              <div className="detail-form-row">
                <label htmlFor="skillFormContent">SKILL.md content</label>
                <textarea id="skillFormContent" rows={18} value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="YAML frontmatter + markdown body" />
              </div>
              {formError && <div className="detail-form-error">{formError}</div>}
            </form>
          </div>
        </div>
        <div className="main-view-empty" id="skillDetailEmpty" style={{ display: 'none' }}></div>
      </>
    );
  }

  // ── Read mode ──
  const { frontmatter, body } = stripFrontmatter(content);
  const linkCategories = Object.entries(linkedFiles).filter(([, files]) => files && files.length > 0);

  return (
    <>
      <div className="main-view-header">
        <div className="main-view-title" id="skillDetailTitle">{skillDetailName}</div>
        <div className="main-view-actions">
          <button id="btnEditSkillDetail" className="panel-head-btn has-tooltip has-tooltip--bottom"
            data-tooltip="Edit" aria-label="Edit" onClick={handleEdit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button id="btnDeleteSkillDetail" className="panel-head-btn has-tooltip has-tooltip--bottom"
            data-tooltip="Delete" aria-label="Delete" onClick={handleDelete}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div className="main-view-body" id="skillDetailBody">
        <div className="main-view-content skill-detail-content">
          {loading ? (
            <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : error ? (
            <div className="detail-form-error">{error}</div>
          ) : (
            <>
              {frontmatter && (
                <details className="skill-frontmatter">
                  <summary>Metadata</summary>
                  <pre><code>{frontmatter}</code></pre>
                </details>
              )}
              <div className="preview-md" dangerouslySetInnerHTML={{ __html: body ? marked(body) as string : '(no content)' }} />
              {linkCategories.length > 0 && (
                <div className="skill-linked-files">
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Linked files</div>
                  {linkCategories.map(([cat, files]) => (
                    <div key={cat} className="skill-linked-section">
                      <h4>{cat}</h4>
                      {files.map((f: string) => (
                        <a key={f} className="skill-linked-file" href="#" onClick={e => e.preventDefault()}>{f}</a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="main-view-empty" id="skillDetailEmpty" style={{ display: 'none' }}></div>
    </>
  );
}
