import { useTheme } from '../../hooks/useTheme';
import { useState, useEffect } from 'react';

const SKINS = ['default', 'ares', 'mono', 'slate', 'poseidon', 'sisyphus', 'charizard', 'sienna', 'catppuccin', 'hepburn', 'nous', 'geist-contrast', 'neon'];
const FONT_SIZES = ['default', 'small', 'large', 'xlarge'];

const ALL_TABS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'tasks', label: 'Tasks', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id: 'kanban', label: 'Kanban', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16"/><path d="M16 4v16"/><path d="M3 10h18"/></svg> },
  { id: 'skills', label: 'Skills', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
  { id: 'memory', label: 'Memory', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg> },
  { id: 'workspaces', label: 'Spaces', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
  { id: 'profiles', label: 'Profiles', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { id: 'todos', label: 'Todos', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg> },
  { id: 'insights', label: 'Insights', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg> },
  { id: 'logs', label: 'Logs', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/></svg> },
];

function loadHiddenTabs(): Set<string> {
  try {
    const raw = localStorage.getItem('hermes-webui-hidden-tabs');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveHiddenTabs(set: Set<string>) {
  try { localStorage.setItem('hermes-webui-hidden-tabs', JSON.stringify([...set])); } catch { /* ignore */ }
}

export default function AppearancePanel() {
  const { theme, skin, fontSize, setTheme, setSkin, setFontSize } = useTheme();
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(loadHiddenTabs);

  const toggleTabVisibility = (id: string) => {
    setHiddenTabs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveHiddenTabs(next);
      return next;
    });
  };

  // Sync hidden tabs to DOM for CSS selectors
  useEffect(() => {
    document.querySelectorAll('[data-panel]').forEach(el => {
      const panelId = el.getAttribute('data-panel');
      if (panelId && hiddenTabs.has(panelId)) {
        el.classList.add('nav-tab-hidden');
      } else {
        el.classList.remove('nav-tab-hidden');
      }
    });
  }, [hiddenTabs]);

  return (
    <div className="appearance-panel">
      <section className="settings-section">
        <h4>Theme</h4>
        <div className="theme-options">
          {(['system', 'dark', 'light'] as const).map(t => (
            <button
              key={t}
              className={`theme-option ${theme === (t === 'system'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : t) ? 'active' : ''}`}
              onClick={() => setTheme(t)}
            >
              <span className={`theme-swatch ${t}`} />
              <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h4>Skin</h4>
        <div className="skin-grid">
          {SKINS.map(s => (
            <button
              key={s}
              className={`skin-option ${skin === s ? 'active' : ''}`}
              onClick={() => setSkin(s)}
            >
              <span className={`skin-swatch skin-${s}`} />
              <span>{s}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h4>Font Size</h4>
        <div className="settings-field">
          <select value={fontSize} onChange={e => setFontSize(e.target.value)}>
            {FONT_SIZES.map(fs => (
              <option key={fs} value={fs}>{fs}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="settings-section">
        <h4>Sidebar Tabs</h4>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Show or hide navigation tabs. Chat and Settings are always visible.</p>
        <div className="tab-visibility-grid">
          {ALL_TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-visibility-chip${hiddenTabs.has(tab.id) ? ' hidden-chip' : ''}`}
              onClick={() => toggleTabVisibility(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
