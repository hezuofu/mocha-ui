import { usePanelStore } from '../../store/panelStore';
/* All icons replaced with original inline SVGs from static/index.html */
import SettingsPanel from './SettingsPanel';
import AppearancePanel from './AppearancePanel';
import SystemPanel from './SystemPanel';
import CronPanel from './CronPanel';
import SkillsPanel from './SkillsPanel';
import MemoryPanel from './MemoryPanel';
import ProfilesPanel from './ProfilesPanel';

const PANEL_CONFIG: Record<string, { icon: React.ReactNode; label: string; component: React.ReactNode }> = {
  conversation: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    label: 'Conversations',
    component: <div style={{ padding: 16, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>Select a conversation</div>,
  },
  settings: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
    label: 'Settings',
    component: <SettingsPanel />,
  },
  appearance: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
    label: 'Appearance',
    component: <AppearancePanel />,
  },
  system: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><line x1="6" y1="7" x2="6.01" y2="7"/><line x1="6" y1="17" x2="6.01" y2="17"/></svg>,
    label: 'System',
    component: <SystemPanel />,
  },
  cron: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    label: 'Cron Jobs',
    component: <CronPanel />,
  },
  skills: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.3 2.1 7L12 16.2 5.4 20.3l2.1-7L2 9h7z"/></svg>,
    label: 'Skills',
    component: <SkillsPanel />,
  },
  memory: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>,
    label: 'Memory',
    component: <MemoryPanel />,
  },
  profiles: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    label: 'Profiles',
    component: <ProfilesPanel />,
  },
  todos: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    label: 'Todos',
    component: <div style={{ padding: 16, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>No tasks yet</div>,
  },
  spaces: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    label: 'Spaces',
    component: <div style={{ padding: 16, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>No spaces configured</div>,
  },
  providers: {
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
    label: 'Providers',
    component: <div style={{ padding: 16, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>No providers configured</div>,
  },
};

export default function ControlCenter() {
  const activePanel = usePanelStore(s => s.activePanel);
  const isOpen = usePanelStore(s => s.isOpen);
  const openPanel = usePanelStore(s => s.open);
  const close = usePanelStore(s => s.close);

  if (!isOpen || !activePanel) return null;

  const config = PANEL_CONFIG[activePanel];

  return (
    <div className="control-center-overlay" onClick={close}>
      <div className="control-center" onClick={e => e.stopPropagation()}>
        <div className="control-center-sidebar">
          <div className="cc-sidebar-header">
            <span>Hermes WebUI</span>
            <button className="panel-icon-btn" onClick={close}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <nav className="cc-nav">
            {Object.entries(PANEL_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                className={`cc-nav-item ${activePanel === key ? 'active' : ''}`}
                onClick={() => openPanel(key as typeof activePanel)}
              >
                {cfg.icon}
                <span>{cfg.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="control-center-content">
          <div className="cc-content-header">
            <h3>{config?.label || 'Settings'}</h3>
          </div>
          <div className="cc-content-body">
            {config?.component}
          </div>
        </div>
      </div>
    </div>
  );
}
