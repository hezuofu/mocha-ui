import { useState, useCallback, useRef } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import type { PanelId } from '../../store/panelStore';
import { useI18n } from '../../i18n';
import PanelHead from './PanelHead';
import SessionList from '../sessions/SessionList';
import CronPanel from '../panels/CronPanel';
import SkillsPanel from '../panels/SkillsPanel';
import MemoryPanel from '../panels/MemoryPanel';
import ProfilesPanel from '../panels/ProfilesPanel';
import SettingsPanel from '../panels/SettingsPanel';
import AppearancePanel from '../panels/AppearancePanel';
import SystemPanel from '../panels/SystemPanel';
import PreferencesPanel from '../panels/PreferencesPanel';
import ProvidersPanel from '../panels/ProvidersPanel';
import PluginsPanel from '../panels/PluginsPanel';
import InsightsPanel from '../panels/InsightsPanel';
import LogsPanel from '../panels/LogsPanel';
import KanbanPanel from '../panels/KanbanPanel';
import TodosPanel from '../panels/TodosPanel';
import WorkspacesPanel from '../panels/WorkspacesPanel';

interface SidebarProps {
  activePanel: PanelId;
  mobileOpen: boolean;
  onSwitch: (panel: PanelId) => void;
}

const MOBILE_TABS: { id: PanelId; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'skills', label: 'Skills' },
  { id: 'memory', label: 'Memory' },
  { id: 'workspaces', label: 'Spaces' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'todos', label: 'Todos' },
  { id: 'insights', label: 'Insights' },
  { id: 'logs', label: 'Logs' },
  { id: 'settings', label: 'Settings' },
];

/** Inline SVG icons for PanelHead actions and search (matching original index.html) */
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="14" height="14">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Sidebar({ activePanel, mobileOpen, onSwitch }: SidebarProps) {
  const { t } = useI18n();
  const sessions = useSessionStore(s => s.sessions);
  const getFilteredSessions = useSessionStore(s => s.getFilteredSessions);
  const sourceFilter = useSessionStore(s => s.sourceFilter);
  const setSourceFilter = useSessionStore(s => s.setSourceFilter);
  const showArchived = useSessionStore(s => s.showArchived);
  const setShowArchived = useSessionStore(s => s.setShowArchived);
  const activeSid = useSessionStore(s => s.activeSessionId);
  const createSession = useSessionStore(s => s.createSession);
  const searchSessions = useSessionStore(s => s.searchSessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof sessions | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleNewChat = useCallback(async () => {
    await createSession();
    setSearchQuery('');
    setSearchResults(null);
  }, [createSession]);

  const handleSearch = useCallback(async (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await searchSessions(value);
      setSearchResults(results);
    } catch {
      setSearchResults(null);
    }
  }, [searchSessions]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    searchInputRef.current?.focus();
  }, []);

  // Group sessions by time (only when not searching)
  const filteredSessions = getFilteredSessions();
  const displaySessions = searchResults !== null
    ? searchResults.filter(s => {
        if (sourceFilter !== 'all') {
          if (sourceFilter === 'webui') return !s.source || s.source === 'webui';
          return s.source === sourceFilter;
        }
        return true;
      })
    : filteredSessions;
  const isSearching = searchResults !== null;

  // Use server time if available
  const serverNow = useSessionStore(s => s.serverNow);
  const now = serverNow();
  const grouped = isSearching ? null : {
    today: displaySessions.filter(s => now - s.updated_at * 1000 < 86400000),
    yesterday: displaySessions.filter(s => now - s.updated_at * 1000 >= 86400000 && now - s.updated_at * 1000 < 172800000),
    earlier: displaySessions.filter(s => now - s.updated_at * 1000 >= 172800000),
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Mobile tab navigation */}
      <div className="sidebar-nav">
        {MOBILE_TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activePanel === tab.id ? 'active' : ''}`}
            onClick={() => onSwitch(tab.id)}
            data-panel={tab.id}
            data-label={tab.label}
            title={tab.label}
          >
            <NavTabIcon panelId={tab.id} />
          </button>
        ))}
      </div>

      {/* Chat panel */}
      <div className={`panel-view ${activePanel === 'chat' ? 'active' : ''}`}>
        <PanelHead
          title="Chat"
          actions={
            <button
              className="panel-head-btn"
              onClick={handleNewChat}
              title="New conversation (Cmd+K)"
              aria-label="New conversation"
            >
              <PlusIcon />
            </button>
          }
        />
        <div className="session-search sidebar-search">
          <div className="session-search-field">
            <SearchIcon />
            <input
              ref={searchInputRef}
              placeholder="Filter conversations..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className="session-search-clear"
              aria-label="Clear conversation filter"
              title="Clear conversation filter"
              onClick={clearSearch}
              hidden={!searchQuery}
            >
              <ClearIcon />
            </button>
          </div>
        </div>
        {/* Source filter tabs */}
        <div className="session-source-tabs" style={{ display: 'flex', gap: 2, padding: '0 12px 4px', flexShrink: 0 }}>
            {(['all', 'webui', 'cli', 'messaging'] as const).map(f => (
              <button
                key={f}
                className={`session-source-tab${sourceFilter === f ? ' active' : ''}`}
                onClick={() => setSourceFilter(f)}
                style={{
                  flex: 1, padding: '3px 6px', fontSize: 11, border: '1px solid var(--border)',
                  borderRadius: 6, background: sourceFilter === f ? 'var(--accent-bg)' : 'transparent',
                  color: sourceFilter === f ? 'var(--accent-text)' : 'var(--muted)', cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >{f === 'all' ? t('all') : f === 'webui' ? t('webui') : f === 'cli' ? t('cli') : t('msg')}</button>
            ))}
          </div>
        {/* Archive toggle */}
        <div style={{ padding: '0 12px 6px', flexShrink: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            {t('show_archived')}
          </label>
        </div>
        <SessionList
          sessions={displaySessions}
          grouped={grouped}
          activeId={activeSid}
          searchQuery={searchQuery || undefined}
        />
      </div>

      {/* Tasks (Cron) panel */}
      <div className={`panel-view ${activePanel === 'tasks' ? 'active' : ''}`}>
        <PanelHead title={t("scheduled_jobs")} actions={
          <button className="panel-head-btn" title="New job" aria-label="New job">
            <PlusIcon />
          </button>
        } />
        <CronPanel />
      </div>

      {/* Kanban panel */}
      <div className={`panel-view ${activePanel === 'kanban' ? 'active' : ''}`}>
        <PanelHead title={t("tab_kanban")} actions={
          <button className="panel-head-btn" title="Refresh" aria-label="Refresh">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        } />
        <KanbanPanel />
      </div>

      {/* Skills panel */}
      <div className={`panel-view ${activePanel === 'skills' ? 'active' : ''}`}>
        <PanelHead title={t("tab_skills")} actions={
          <button className="panel-head-btn" title="New skill" aria-label="New skill">
            <PlusIcon />
          </button>
        } />
        <SkillsPanel />
      </div>

      {/* Memory panel */}
      <div className={`panel-view ${activePanel === 'memory' ? 'active' : ''}`}>
        <PanelHead title={t("tab_memory")} />
        <MemoryPanel />
      </div>

      {/* Workspaces panel */}
      <div className={`panel-view ${activePanel === 'workspaces' ? 'active' : ''}`}>
        <PanelHead title={t("tab_workspaces")} actions={
          <button className="panel-head-btn" title="Add space" aria-label="Add space">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        } />
        <WorkspacesPanel />
      </div>

      {/* Profiles panel */}
      <div className={`panel-view ${activePanel === 'profiles' ? 'active' : ''}`}>
        <PanelHead title={t("tab_profiles")} actions={
          <button className="panel-head-btn" title="New profile" aria-label="New profile">
            <PlusIcon />
          </button>
        } />
        <ProfilesPanel />
      </div>

      {/* Todos panel */}
      <div className={`panel-view ${activePanel === 'todos' ? 'active' : ''}`}>
        <PanelHead title={t("tab_todos")} />
        <TodosPanel />
      </div>

      {/* Insights panel */}
      <div className={`panel-view ${activePanel === 'insights' ? 'active' : ''}`}>
        <PanelHead title={t("tab_insights")} />
        <InsightsPanel />
      </div>

      {/* Logs panel */}
      <div className={`panel-view ${activePanel === 'logs' ? 'active' : ''}`}>
        <PanelHead title={t("tab_logs")} />
        <LogsPanel />
      </div>

      {/* Settings panel */}
      <div className={`panel-view ${activePanel === 'settings' ? 'active' : ''}`}>
        <PanelHead title={t("tab_settings")} />
        <SettingsPanelWrapper />
      </div>
      <div className="resize-handle" id="sidebarResize" />
    </aside>
  );
}

/** Settings with side-menu layout matching original 6 sections */
function SettingsPanelWrapper() {
  const [section, setSection] = useState<'conversation' | 'appearance' | 'preferences' | 'providers' | 'plugins' | 'system'>('conversation');
  const { t } = useI18n();

  return (
    <div className="settings-layout">
      <div className="side-menu">
        <button className={`side-menu-item ${section === 'conversation' ? 'active' : ''}`} onClick={() => setSection('conversation')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>{t('settings_conversation')}</span>
        </button>
        <button className={`side-menu-item ${section === 'appearance' ? 'active' : ''}`} onClick={() => setSection('appearance')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <span>{t('settings_appearance')}</span>
        </button>
        <button className={`side-menu-item ${section === 'preferences' ? 'active' : ''}`} onClick={() => setSection('preferences')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
          <span>{t('settings_preferences')}</span>
        </button>
        <button className={`side-menu-item ${section === 'providers' ? 'active' : ''}`} onClick={() => setSection('providers')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          <span>{t('settings_providers')}</span>
        </button>
        <button className={`side-menu-item ${section === 'plugins' ? 'active' : ''}`} onClick={() => setSection('plugins')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.3 2.1 7L12 16.2 5.4 20.3l2.1-7L2 9h7z"/></svg>
          <span>{t('settings_plugins')}</span>
        </button>
        <button className={`side-menu-item ${section === 'system' ? 'active' : ''}`} onClick={() => setSection('system')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><line x1="6" y1="7" x2="6.01" y2="7"/><line x1="6" y1="17" x2="6.01" y2="17"/></svg>
          <span>{t('settings_system')}</span>
        </button>
      </div>
      <div className="settings-content">
        {section === 'conversation' && <SettingsPanel />}
        {section === 'appearance' && <AppearancePanel />}
        {section === 'preferences' && <PreferencesPanel />}
        {section === 'providers' && <ProvidersPanel />}
        {section === 'plugins' && <PluginsPanel />}
        {section === 'system' && <SystemPanel />}
      </div>
    </div>
  );
}

/** Inline SVG icons matching original index.html sidebar-nav tabs */
function NavTabIcon({ panelId }: { panelId: PanelId }) {
  const width = 18, height = 18;
  switch (panelId) {
    case 'chat':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'tasks':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'kanban':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16"/><path d="M16 4v16"/><path d="M3 10h18"/></svg>;
    case 'skills':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
    case 'memory':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>;
    case 'workspaces':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
    case 'profiles':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'todos':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>;
    case 'insights':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>;
    case 'logs':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/></svg>;
    case 'settings':
      return <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  }
}
