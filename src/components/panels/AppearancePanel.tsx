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
    <div className="appearance-panel">
      <section className="settings-section">
        <h4>Theme</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {(['system', 'dark', 'light'] as const).map(t => (
            <button key={t} onClick={() => setTheme(t)}
              style={{
                padding: '12px 8px', borderRadius: 10, border: rawThemeSetting === t ? '2px solid var(--accent)' : '2px solid var(--border)',
                background: rawThemeSetting === t ? 'var(--accent-bg)' : 'var(--surface-subtle)',
                cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
              }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', margin: '0 auto 6px',
                background: t === 'system' ? 'linear-gradient(135deg, #0D0D1A 50%, #FEFCF7 50%)' : t === 'dark' ? '#0D0D1A' : '#FEFCF7',
                border: '2px solid var(--border)' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: rawThemeSetting === t ? 'var(--accent-text)' : 'var(--text)' }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h4>Skin</h4>
        <div className="skin-grid">
          {SKINS.map(s => (
            <button key={s} className={`skin-option ${skin === s ? 'active' : ''}`} onClick={() => setSkin(s)}>
              <span className={`skin-swatch skin-${s}`} /><span>{s}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h4>Font Size</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {FONT_SIZES.map(fs => (
            <button key={fs} onClick={() => setFontSize(fs)}
              style={{ padding: '10px 6px', borderRadius: 8, border: fontSize === fs ? '2px solid var(--accent)' : '2px solid var(--border)',
                background: fontSize === fs ? 'var(--accent-bg)' : 'var(--surface-subtle)', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
              <div style={{ fontSize: fs === 'small' ? 11 : fs === 'large' ? 18 : fs === 'xlarge' ? 22 : 14, fontWeight: 700, color: fontSize === fs ? 'var(--accent-text)' : 'var(--text)', marginBottom: 2 }}>Aa</div>
              <div style={{ fontSize: 10, color: fontSize === fs ? 'var(--accent-text)' : 'var(--muted)', fontWeight: 500 }}>{fs}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h4>Sidebar Tabs</h4>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Show or hide navigation tabs. Chat and Settings are always visible.</p>
        <div className="tab-visibility-grid">
          {ALL_TABS.map(tab => (
            <button key={tab.id} className={`tab-visibility-chip${hiddenTabs.has(tab.id) ? ' hidden-chip' : ''}`} onClick={() => toggleTabVisibility(tab.id)}>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
