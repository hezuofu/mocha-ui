import { useState, useEffect } from 'react';
import { getMemory, saveMemory, getUserMemory, saveUserMemory } from '../../api/endpoints';
/* All icons replaced with original inline SVGs from static/icons.js */

const SECTIONS = [
  { key: 'agent' as const, label: 'Agent Memory' },
  { key: 'user' as const, label: 'User Memory' },
];

export default function MemoryPanel() {
  const [section, setSection] = useState<'agent' | 'user'>('agent');
  const [agentMemory, setAgentMemory] = useState('');
  const [userMemory, setUserMemory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getMemory().then(d => setAgentMemory(d.content || '')).catch(() => {}),
      getUserMemory().then(d => setUserMemory(d.content || '')).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (section === 'agent') await saveMemory(agentMemory).catch(() => {});
    else await saveUserMemory(userMemory).catch(() => {});
    setSaving(false);
  };

  if (loading) return <div className="panel-loading"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>;

  return (
    <div className="settings-layout memory-panel">
      <div className="side-menu">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            className={`side-menu-item ${section === s.key ? 'active' : ''}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="settings-content">
        <div className="settings-section">
          <textarea
            className="memory-textarea"
            value={section === 'agent' ? agentMemory : userMemory}
            onChange={e => section === 'agent' ? setAgentMemory(e.target.value) : setUserMemory(e.target.value)}
            rows={10}
            placeholder={section === 'agent' ? 'Memory the agent can reference...' : 'Information about you the agent should know...'}
          />
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save {section === 'agent' ? 'Agent' : 'User'} Memory
          </button>
        </div>
      </div>
    </div>
  );
}
