import { useState, useEffect } from 'react';
import { getSkills, searchSkills, getSkillContent, deleteSkill, saveSkill } from '../../api/endpoints';
import type { Skill } from '../../types';
/* All icons replaced with original inline SVGs from static/icons.js */

export default function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formContent, setFormContent] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSkills();
      setSkills(data.skills || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) { load(); return; }
    try {
      const data = await searchSkills(q);
      setSkills(data.skills || []);
    } catch { /* ignore */ }
  };

  const handleSelect = async (skill: Skill) => {
    setSelectedSkill(skill);
    try {
      const data = await getSkillContent(skill.name);
      setSkillContent(data.content || '');
    } catch { setSkillContent(''); }
  };

  const handleDelete = async (name: string) => {
    await deleteSkill(name);
    setSelectedSkill(null);
    load();
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    await saveSkill(formName.trim(), formContent.trim(), formCategory.trim() || undefined);
    setFormName('');
    setFormCategory('');
    setFormContent('');
    setShowForm(false);
    load();
  };

  return (
    <div className="skills-list">

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 8px" }}>
        <div className="skills-search sidebar-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search skills..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="panel-icon-btn" onClick={load}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
          <button className="panel-icon-btn" onClick={() => setShowForm(!showForm)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            autoFocus
            style={{ background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", width: "100%" }}
            style={{ padding: '6px 10px', minHeight: 'auto' }}
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="Skill name..."
          />
          <input
            style={{ background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", width: "100%" }}
            style={{ padding: '6px 10px', minHeight: 'auto' }}
            value={formCategory}
            onChange={e => setFormCategory(e.target.value)}
            placeholder="Category (optional)"
          />
          <textarea
            style={{ background: "var(--input-bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", width: "100%" }}
            rows={4}
            value={formContent}
            onChange={e => setFormContent(e.target.value)}
            placeholder="Skill content..."
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="panel-icon-btn" onClick={handleCreate} disabled={!formName.trim()}>Create</button>
            <button className="panel-icon-btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="skills-layout">
        <div className="skills-list">
          {skills.map(skill => (
            <div
              key={skill.name}
              className={`skill-item ${selectedSkill?.name === skill.name ? 'active' : ''}`}
              onClick={() => handleSelect(skill)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <div>
                <div className="skill-name">{skill.name}</div>
                <div className="skill-category">{skill.category}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
          {skills.length === 0 && <div style={{ padding: 12, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>No skills found</div>}
        </div>
        {selectedSkill && (
          <div className="skill-detail">
            <h4>{selectedSkill.name}</h4>
            <p className="skill-desc">{selectedSkill.description}</p>
            <pre className="skill-content"><code>{skillContent}</code></pre>
            <button className="btn-danger-sm" onClick={() => handleDelete(selectedSkill.name)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
