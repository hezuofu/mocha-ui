import { useState, useEffect, useCallback } from 'react';
import { getProfiles, switchProfile, deleteProfile } from '../../api/endpoints';
import { usePanelStore } from '../../store/panelStore';
import type { Profile } from '../../types';

/* ── Inline SVG icons (from original static/icons.js) ── */

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

/* ── i18n fallbacks ── */
const t = (key: string, fallback: string) => fallback;

export default function ProfilesPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeName, setActiveName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const setProfileDetail = usePanelStore(s => s.setProfileDetail);
  const profileDetailName = usePanelStore(s => s.profileDetailName);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfiles();
      setProfiles(data.profiles || []);
      setActiveName(data.active || 'default');
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Listen for external reload triggers
  useEffect(() => {
    const h = () => load();
    window.addEventListener('profiles-changed', h);
    return () => window.removeEventListener('profiles-changed', h);
  }, [load]);

  const handleSwitch = async (name: string) => {
    await switchProfile(name);
    load();
  };

  const handleDelete = async (name: string) => {
    await deleteProfile(name);
    load();
  };

  return (
    <>
      {/* ── panel-head with actions (matching original #panelProfiles) ── */}
      <div className="panel-head">
        <span>{t('tab_profiles', 'Profiles')}</span>
        <div className="panel-head-actions">
          <button className="panel-head-btn has-tooltip has-tooltip--bottom"
            data-tooltip={t('new_profile', 'New profile')}
            aria-label={t('new_profile', 'New profile')}
            onClick={() => setProfileDetail(null, 'create')}
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {/* ── Profile list content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }} id="profilesPanel">
        {loading ? (
          <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>
            {t('loading', 'Loading...')}
          </div>
        ) : (
          <>
            {/* Help card — explains profiles vs workspaces */}
            <div className="profile-card profile-help-card"
              onClick={() => setProfileDetail('_help')}
            >
              <div className="profile-card-header">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="profile-card-name">Profiles vs workspaces</div>
                  <div className="profile-card-meta">Use profiles for how the agent works; use workspaces for what files it works on.</div>
                </div>
              </div>
            </div>

            {profiles.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12 }}>
                {t('profiles_no_profiles', 'No profiles found.')}
              </div>
            ) : (
              profiles.map(p => {
                const isActive = p.name === activeName;
                const meta: string[] = [];
                if (p.model) meta.push(p.model.split('/').pop()!);
                if (p.provider) meta.push(p.provider);
                if (p.skill_count) meta.push(t('profile_skill_count', `${p.skill_count} skills`));

                return (
                  <div key={p.name}
                    className={`profile-card${p.name === profileDetailName ? ' active' : ''}`}
                    data-name={p.name}
                    onClick={() => setProfileDetail(p.name)}
                  >
                    <div className="profile-card-header">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className={`profile-card-name${isActive ? ' is-active' : ''}`}>
                          <span className={`profile-opt-badge ${p.gateway_running ? 'running' : 'stopped'}`}
                            title={p.gateway_running ? 'Gateway running' : 'Gateway stopped'}
                          />
                          {p.name}
                          {p.is_default ? <span style={{ opacity: '.5' }}> (default)</span> : null}
                          {isActive ? (
                            <span style={{ color: 'var(--link)', fontSize: 10, fontWeight: 600, marginLeft: 6 }}>
                              {t('profile_active', 'ACTIVE')}
                            </span>
                          ) : null}
                        </div>
                        <div className="profile-card-meta">
                          {meta.length ? meta.join(' · ') : t('profile_no_configuration', 'No configuration')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </>
  );
}
