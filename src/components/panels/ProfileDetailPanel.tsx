import { useState, useEffect } from 'react';
import { usePanelStore } from '../../store/panelStore';
import { getProfiles, createProfile, switchProfile, deleteProfile } from '../../api/endpoints';
import type { Profile } from '../../types';

/* ── Inline SVG icons ── */

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CancelIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ProfileEmptyIcon = () => (
  <svg className="main-view-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

export default function ProfileDetailPanel() {
  const profileDetailName = usePanelStore(s => s.profileDetailName);
  const profileMode = usePanelStore(s => s.profileMode);
  const setProfileDetail = usePanelStore(s => s.setProfileDetail);
  const clearProfileDetail = usePanelStore(s => s.clearProfileDetail);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeName, setActiveName] = useState<string>('');
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formClone, setFormClone] = useState(false);
  const [formModel, setFormModel] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formError, setFormError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const loadData = async () => {
    try {
      const data = await getProfiles();
      setAllProfiles(data.profiles || []);
      setActiveName(data.active || 'default');
      if (profileDetailName) {
        const p = data.profiles.find(x => x.name === profileDetailName);
        setProfile(p || null);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { loadData(); }, [profileDetailName]);

  const handleActivate = async () => {
    if (!profile) return;
    await switchProfile(profile.name);
    loadData();
  };

  const handleDelete = async () => {
    if (!profile) return;
    await deleteProfile(profile.name);
    clearProfileDetail();
    loadData();
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }
    setSaveLoading(true);
    setFormError('');
    try {
      await createProfile(formName.trim(), formBaseUrl || undefined, formApiKey || undefined);
      clearProfileDetail();
      // Reload sidebar
      window.dispatchEvent(new CustomEvent('profiles-changed'));
    } catch (e: any) {
      setFormError(e.message || 'Failed to create profile');
    }
    setSaveLoading(false);
  };

  const handleCancelCreate = () => {
    clearProfileDetail();
  };

  // ── Render create form ──
  if (profileMode === 'create') {
    return (
      <>
        <div className="main-view-header">
          <div className="main-view-title">New Profile</div>
          <div className="main-view-actions">
            <button className="panel-head-btn has-tooltip has-tooltip--bottom"
              onClick={handleCancelCreate} data-tooltip="Cancel" aria-label="Cancel">
              <CancelIcon />
            </button>
            <button className="panel-head-btn primary has-tooltip has-tooltip--bottom"
              onClick={handleCreate} data-tooltip="Save" aria-label="Save"
              disabled={saveLoading}>
              <CheckIcon />
            </button>
          </div>
        </div>
        <div className="main-view-body" style={{ display: '' }}>
          <div className="main-view-content">
            <form className="detail-form" onSubmit={e => { e.preventDefault(); handleCreate(); }}>
              <div className="detail-form-row">
                <label htmlFor="profileFormName">Name</label>
                <input type="text" id="profileFormName"
                  placeholder="lowercase, a-z 0-9 hyphens"
                  autoComplete="off" autoCapitalize="none" autoCorrect="off"
                  spellCheck="false" required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  style={{ background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }}
                />
                <div className="detail-form-hint">Lowercase letters, numbers, hyphens, underscores only.</div>
              </div>
              <div className="detail-form-row">
                <label className="detail-form-check" htmlFor="profileFormClone">
                  <input type="checkbox" id="profileFormClone"
                    checked={formClone}
                    onChange={e => setFormClone(e.target.checked)}
                  /> <span>Clone config from active profile</span>
                </label>
              </div>
              <div className="detail-form-row">
                <label htmlFor="profileFormModel">Model / provider</label>
                <select id="profileFormModel"
                  value={formModel}
                  onChange={e => setFormModel(e.target.value)}
                  style={{ background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }}
                >
                  <option value="">Use active profile default</option>
                </select>
                <div className="detail-form-hint">Choose from configured providers and models for this new profile.</div>
              </div>
              <div className="detail-form-row">
                <label htmlFor="profileFormBaseUrl">Base URL</label>
                <input type="text" id="profileFormBaseUrl"
                  placeholder="Optional, e.g. http://localhost:11434"
                  autoComplete="off" autoCapitalize="none" autoCorrect="off"
                  spellCheck="false"
                  value={formBaseUrl}
                  onChange={e => setFormBaseUrl(e.target.value)}
                  style={{ background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }}
                />
              </div>
              <div className="detail-form-row">
                <label htmlFor="profileFormApiKey">API key</label>
                <input type="password" id="profileFormApiKey"
                  placeholder="Optional"
                  autoComplete="off"
                  value={formApiKey}
                  onChange={e => setFormApiKey(e.target.value)}
                  style={{ background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }}
                />
              </div>
              {formError && (
                <div className="detail-form-error" style={{ display: '' }}>{formError}</div>
              )}
            </form>
          </div>
        </div>
      </>
    );
  }

  // ── Render concept help ──
  if (profileDetailName === '_help') {
    return (
      <>
        <div className="main-view-header">
          <div className="main-view-title">Profiles vs workspaces</div>
          <div className="main-view-actions"></div>
        </div>
        <div className="main-view-body" style={{ display: '' }}>
          <div className="main-view-content">
            <div className="detail-card">
              <div className="detail-card-title">Use profiles for how; workspaces for what</div>
              <div className="detail-row">
                <div className="detail-row-label">Profiles</div>
                <div className="detail-row-value">Agent identity, memory, skills, model/provider config, and connected tools. Create profiles for roles like researcher, writer, marketer, or developer when those roles should carry different context or capabilities.</div>
              </div>
              <div className="detail-row">
                <div className="detail-row-label">Workspaces</div>
                <div className="detail-row-value">Project or product folders on disk. Use one workspace per repo/product so chat, terminal, and file browsing point at the right files.</div>
              </div>
              <div className="detail-row">
                <div className="detail-row-label">Together</div>
                <div className="detail-row-value">A profile can have a default workspace, but you can still switch workspaces for a session. Profiles answer "who is working?"; workspaces answer "where are they working?"</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Render empty state ──
  if (!profile || profileMode === 'empty') {
    return (
      <>
        <div className="main-view-header">
          <div className="main-view-title"></div>
          <div className="main-view-actions"></div>
        </div>
        <div className="main-view-body" style={{ display: 'none' }}></div>
        <div className="main-view-empty" style={{ display: '' }}>
          <ProfileEmptyIcon />
          <div className="main-view-empty-title">Select a profile</div>
          <div className="main-view-empty-sub">Pick an agent profile from the sidebar to view and edit its settings, or create a new one.</div>
        </div>
      </>
    );
  }

  // ── Render profile detail (read mode) ──
  const isActive = profile.name === activeName;
  const isDefault = !!profile.is_default;

  const rows: React.ReactNode[] = [];

  // Status row
  rows.push(
    <div className="detail-row" key="status">
      <div className="detail-row-label">Status</div>
      <div className="detail-row-value">
        {isActive ? <span className="detail-badge active">Active</span> : <span className="detail-badge">Inactive</span>}
        {isDefault && <> <span className="detail-badge">default</span></>}
      </div>
    </div>
  );

  // Gateway row
  rows.push(
    <div className="detail-row" key="gateway">
      <div className="detail-row-label">Gateway</div>
      <div className="detail-row-value">
        {profile.gateway_running
          ? <span className="detail-badge ok">Running</span>
          : <span className="detail-badge">Stopped</span>}
      </div>
    </div>
  );

  // Model
  if (profile.model) {
    rows.push(
      <div className="detail-row" key="model">
        <div className="detail-row-label">Model</div>
        <div className="detail-row-value"><code>{profile.model}</code></div>
      </div>
    );
  }

  // Provider
  if (profile.provider) {
    rows.push(
      <div className="detail-row" key="provider">
        <div className="detail-row-label">Provider</div>
        <div className="detail-row-value">{profile.provider}</div>
      </div>
    );
  }

  // API key
  rows.push(
    <div className="detail-row" key="apikey">
      <div className="detail-row-label">API key</div>
      <div className="detail-row-value">
        {profile.has_env
          ? 'Environment variables configured'
          : <span style={{ color: 'var(--muted)' }}>Not configured</span>}
      </div>
    </div>
  );

  // Skills
  if (typeof profile.skill_count === 'number') {
    rows.push(
      <div className="detail-row" key="skills">
        <div className="detail-row-label">Skills</div>
        <div className="detail-row-value">{profile.skill_count} skills</div>
      </div>
    );
  }

  return (
    <>
      <div className="main-view-header">
        <div className="main-view-title">{profile.name}</div>
        <div className="main-view-actions">
          {!isActive && (
            <button className="panel-head-btn has-tooltip has-tooltip--bottom"
              onClick={handleActivate} data-tooltip="Switch to this profile" aria-label="Switch to this profile">
              <CheckIcon />
            </button>
          )}
          {!isDefault && (
            <button className="panel-head-btn has-tooltip has-tooltip--bottom"
              onClick={handleDelete} data-tooltip="Delete this profile" aria-label="Delete this profile">
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
      <div className="main-view-body" style={{ display: '' }}>
        <div className="main-view-content">
          <div className="detail-card">
            <div className="detail-card-title">Profile</div>
            {rows}
          </div>
        </div>
      </div>
    </>
  );
}
