import { useState, useEffect } from 'react';
import { getProfiles, switchProfile, deleteProfile, createProfile } from '../../api/endpoints';
import type { Profile } from '../../types';
/* All icons replaced with original inline SVGs from static/icons.js */

export default function ProfilesPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getProfiles();
      setProfiles(data.profiles || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSwitch = async (name: string) => {
    await switchProfile(name);
    load();
  };

  const handleDelete = async (name: string) => {
    await deleteProfile(name);
    load();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProfile(newName.trim());
    setNewName('');
    setCreating(false);
    load();
  };

  if (loading) return <div className="panel-loading"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>;

  return (
    <div className="profiles-panel">
      <div className="panel-toolbar">
        <button className="btn-icon-sm" onClick={load}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
        <button className="btn-primary-sm" onClick={() => setCreating(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Profile
        </button>
      </div>

      {creating && (
        <div className="create-profile-form">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            placeholder="Profile name..."
          />
          <button className="btn-primary-sm" onClick={handleCreate}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></button>
        </div>
      )}

      <div className="profiles-list">
        {profiles.map(p => (
          <div key={p.name} className={`profile-item ${p.active ? 'active' : ''}`}>
            <div className="profile-item-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <div>
                <div className="profile-name">
                  {p.name}
                  {p.active && <span className="profile-active-badge">Active</span>}
                </div>
                {p.model && <div className="profile-model">{p.model}</div>}
              </div>
            </div>
            <div className="profile-item-actions">
              {!p.active && (
                <button className="btn-icon-sm" onClick={() => handleSwitch(p.name)} title="Switch to profile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                </button>
              )}
              {p.name !== 'default' && (
                <button className="btn-icon-sm danger" onClick={() => handleDelete(p.name)} title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
