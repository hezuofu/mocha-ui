import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settingsStore';
import { useState, useEffect } from 'react';

const SKINS = ['default', 'ares', 'mono', 'slate', 'poseidon', 'sisyphus', 'charizard', 'sienna', 'catppuccin', 'hepburn', 'nous', 'geist-contrast', 'neon'];
const FONT_SIZES = ['default', 'small', 'large', 'xlarge'];
const ALL_TABS = [
  { id: 'tasks', label: 'Tasks' }, { id: 'kanban', label: 'Kanban' }, { id: 'skills', label: 'Skills' },
  { id: 'memory', label: 'Memory' }, { id: 'workspaces', label: 'Spaces' }, { id: 'profiles', label: 'Profiles' },
  { id: 'todos', label: 'Todos' }, { id: 'insights', label: 'Insights' }, { id: 'logs', label: 'Logs' },
];

function loadHiddenTabs(): Set<string> {
  try { const raw = localStorage.getItem('hermes-webui-hidden-tabs'); return raw ? new Set(JSON.parse(raw)) : new Set(); }
  catch { return new Set(); }
}
function saveHiddenTabs(set: Set<string>) { try { localStorage.setItem('hermes-webui-hidden-tabs', JSON.stringify([...set])); } catch {} }

export default function AppearancePanel() {
  const { theme, skin, fontSize, setTheme, setSkin, setFontSize } = useTheme();
  const rawThemeSetting = useSettingsStore(s => s.theme);
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(loadHiddenTabs);

  const toggleTabVisibility = (id: string) => {
    setHiddenTabs(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); saveHiddenTabs(next); return next; });
  };

  useEffect(() => {
    document.querySelectorAll('[data-panel]').forEach(el => {
      const panelId = el.getAttribute('data-panel');
      if (panelId && hiddenTabs.has(panelId)) el.classList.add('nav-tab-hidden');
      else el.classList.remove('nav-tab-hidden');
    });
  }, [hiddenTabs]);

  return (
    <>
      <div className="settings-section-head">
        <div>
          <div className="settings-section-title">Appearance</div>
          <div className="settings-section-meta">Theme, accent colors, and visual style.</div>
        </div>
      </div>

      {/* ── Theme ── */}
      <div className="settings-field">
        <label>Theme</label>
        <div id="themePickerGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
          {['light', 'dark', 'system'].map(t => (
            <button key={t} type="button" data-theme-val={t}
              onClick={() => setTheme(t)}
              className={`theme-pick-btn${rawThemeSetting === t ? ' active' : ''}`}
              style={{ borderRadius: 10, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: 'none', transition: '.15s' }}>
              <div style={{
                width: '100%', height: 40, borderRadius: 6,
                background: t === 'light' ? '#fff' : t === 'dark' ? '#1a1a2e' : 'linear-gradient(to right, #fff, #1a1a2e)',
                border: t === 'light' || t === 'system' ? '1px solid rgba(0,0,0,.12)' : '1px solid rgba(255,255,255,.1)',
                marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {t === 'light' ? (
                  <svg width="16" height="16" fill="none" stroke="#999" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : t === 'dark' ? (
                  <svg width="16" height="16" fill="none" stroke="#666" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                )}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Skin ── */}
      <div className="settings-field">
        <label>Skin</label>
        <div id="skinPickerGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 4 }}>
          {SKINS.map(s => (
            <button key={s} type="button" data-skin-val={s}
              onClick={() => setSkin(s)}
              className={`skin-pick-btn${skin === s ? ' active' : ''}`}
              style={{ borderRadius: 8, padding: '8px 4px', textAlign: 'center', cursor: 'pointer', background: 'none', transition: '.15s' }}>
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: s === 'default' ? '#FFD700' : s === 'ares' ? '#FF4444' : s === 'mono' ? '#888' : s === 'slate' ? '#5B7FA5' : s === 'poseidon' ? '#2D7DD2' : s === 'sisyphus' ? '#C84B31' : s === 'charizard' ? '#EE8130' : s === 'sienna' ? '#A0522D' : s === 'catppuccin' ? '#CBA6F7' : s === 'hepburn' ? '#E91E63' : s === 'nous' ? '#6C5CE7' : s === 'geist-contrast' ? '#FAFAFA' : '#39FF14' }} />
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: s === 'default' ? '#FFBF00' : s === 'ares' ? '#CC3333' : s === 'mono' ? '#666' : s === 'slate' ? '#3A5770' : s === 'poseidon' ? '#1B5299' : s === 'sisyphus' ? '#9B3A22' : s === 'charizard' ? '#D4721A' : s === 'sienna' ? '#8B4513' : s === 'catppuccin' ? '#B4BEFE' : s === 'hepburn' ? '#C2185B' : s === 'nous' ? '#4834D4' : s === 'geist-contrast' ? '#D4D4D4' : '#2BFF00' }} />
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: s === 'default' ? '#CD7F32' : s === 'ares' ? '#992222' : s === 'mono' ? '#444' : s === 'slate' ? '#284058' : s === 'poseidon' ? '#0E3266' : s === 'sisyphus' ? '#722B15' : s === 'charizard' ? '#AA5A0F' : s === 'sienna' ? '#6B3410' : s === 'catppuccin' ? '#A6E3A1' : s === 'hepburn' ? '#880E4F' : s === 'nous' ? '#2C1A99' : s === 'geist-contrast' ? '#A0A0A0' : '#1FCC00' }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text)' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Font Size ── */}
      <div className="settings-field">
        <label>Font Size</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
          {FONT_SIZES.map(fs => (
            <button key={fs} onClick={() => setFontSize(fs)} type="button"
              style={{ padding: '10px 6px', borderRadius: 8, border: fontSize === fs ? '2px solid var(--accent)' : '2px solid var(--border)', background: fontSize === fs ? 'var(--accent-bg)' : 'var(--surface-subtle)', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
              <div style={{ fontSize: fs === 'small' ? 11 : fs === 'large' ? 18 : fs === 'xlarge' ? 22 : 14, fontWeight: 700, color: fontSize === fs ? 'var(--accent-text)' : 'var(--text)', marginBottom: 2 }}>Aa</div>
              <div style={{ fontSize: 10, color: fontSize === fs ? 'var(--accent-text)' : 'var(--muted)', fontWeight: 500 }}>{fs}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sidebar Tabs ── */}
      <div className="settings-field">
        <label style={{ marginBottom: 8 }}>Sidebar Tabs</label>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Show or hide navigation tabs. Chat and Settings are always visible.</p>
        <div className="tab-visibility-grid">
          {ALL_TABS.map(tab => (
            <button key={tab.id} className={`tab-visibility-chip${hiddenTabs.has(tab.id) ? ' hidden-chip' : ''}`} onClick={() => toggleTabVisibility(tab.id)}>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
