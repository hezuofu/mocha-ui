import { useState, useEffect } from 'react';
import { getSkills, searchSkills } from '../../api/endpoints';
import { apiPost } from '../../api/client';
import { usePanelStore } from '../../store/panelStore';
import type { Skill } from '../../types';

export default function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const setSkillDetail = usePanelStore(s => s.setSkillDetail);
  const skillDetailName = usePanelStore(s => s.skillDetailName);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSkills();
      setSkills(data.skills || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const h = () => load();
    window.addEventListener('skills-changed', h);
    return () => window.removeEventListener('skills-changed', h);
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) { load(); return; }
    try { const data = await searchSkills(q); setSkills(data.skills || []); } catch {}
  };

  const toggleSkill = async (e: React.MouseEvent, name: string, currentlyEnabled: boolean) => {
    e.stopPropagation();
    const newEnabled = !currentlyEnabled;
    try {
      const result = await apiPost<any>('/api/skills/toggle', { name, enabled: newEnabled });
      if (result && result.ok) {
        setSkills(prev => prev.map(s => s.name === name ? { ...s, disabled: !newEnabled } : s));
      }
    } catch { /* ignore */ }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filtered = query ? skills.filter(s =>
    (s.name || '').toLowerCase().includes(query) ||
    (s.description || '').toLowerCase().includes(query)
  ) : skills;

  // Group by category
  const cats: Record<string, Skill[]> = {};
  for (const s of filtered) {
    const cat = s.category || '(general)';
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(s);
  }

  return (
    <>
      {/* Search bar — matches original .skills-search.sidebar-search */}
      <div className="skills-search sidebar-search">
        <svg className="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="skillsSearch" placeholder="Search skills..." value={query}
          onChange={e => handleSearch(e.target.value)} />
      </div>

      {/* Skills list — matches original #skillsList */}
      <div className="skills-list" id="skillsList">
        {loading ? (
          <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>Loading...</div>
        ) : !filtered.length ? (
          <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>No matching skills</div>
        ) : (
          Object.entries(cats).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => {
            const collapsed = collapsedCats.has(cat);
            return (
              <div key={cat} className={`skills-category${collapsed ? ' collapsed' : ''}`}>
                <div className="skills-cat-header" data-cat={cat} onClick={() => toggleCategory(cat)}>
                  <span className="cat-chevron" style={{ display: 'inline-flex', transition: 'transform .15s', transform: collapsed ? '' : 'rotate(90deg)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                  {' '}{cat} <span style={{ opacity: '.5' }}>({items.length})</span>
                </div>
                {items.sort((a, b) => a.name.localeCompare(b.name)).map(skill => {
                  const isDisabled = skill.disabled || false;
                  return (
                  <div key={skill.name}
                    className={`skill-item${skillDetailName === skill.name ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
                    style={{ display: collapsed ? 'none' : '' }}
                    onClick={() => setSkillDetail(skill.name)}
                  >
                    <span className={`skill-toggle${isDisabled ? '' : ' enabled'}`}
                      title={isDisabled ? 'Disabled' : 'Enabled'}
                      onClick={e => toggleSkill(e, skill.name, !isDisabled)}
                    />
                    <span className="skill-name">{skill.name}</span>
                    <span className="skill-desc">{skill.description || ''}</span>
                  </div>
                );
                })}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
