import { useState, useCallback, useRef } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { usePanelStore, type PanelId, type SettingsSection } from '../../store/panelStore';
import { useI18n } from '../../i18n';
import PanelHead from './PanelHead';
import SessionList from '../sessions/SessionList';
import CronPanel from '../panels/CronPanel';
import KanbanPanel from '../panels/KanbanPanel';
import SkillsPanel from '../panels/SkillsPanel';
import MemoryPanel, { MemorySideMenu } from '../panels/MemoryPanel';
import TodosPanel from '../panels/TodosPanel';
import WorkspacesPanel from '../panels/WorkspacesPanel';
import ProfilesPanel from '../panels/ProfilesPanel';
import InsightsPanel from '../panels/InsightsPanel';
import LogsPanel from '../panels/LogsPanel';

interface SidebarProps {
  activePanel: PanelId;
  mobileOpen: boolean;
  onSwitch: (panel: PanelId) => void;
}

/* ── Icons ── */
function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function SearchIcon() {
  return <svg className="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="14" height="14"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
}
function ClearIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function RefreshIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
}

const MOBILE_TABS: { id: PanelId; label: string }[] = [
  { id: 'chat', label: 'Chat' }, { id: 'tasks', label: 'Tasks' }, { id: 'kanban', label: 'Kanban' },
  { id: 'skills', label: 'Skills' }, { id: 'memory', label: 'Memory' }, { id: 'workspaces', label: 'Spaces' },
  { id: 'profiles', label: 'Profiles' }, { id: 'todos', label: 'Todos' }, { id: 'insights', label: 'Insights' },
  { id: 'logs', label: 'Logs' }, { id: 'settings', label: 'Settings' },
];

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
  const settingsSection = usePanelStore(s => s.settingsSection);
  const setSettingsSection = usePanelStore(s => s.setSettingsSection);

  const handleNewChat = useCallback(async () => { await createSession(); setSearchQuery(''); setSearchResults(null); }, [createSession]);
  const handleSearch = useCallback(async (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) { setSearchResults(null); return; }
    try { setSearchResults(await searchSessions(value)); } catch { setSearchResults(null); }
  }, [searchSessions]);
  const clearSearch = useCallback(() => { setSearchQuery(''); setSearchResults(null); searchInputRef.current?.focus(); }, []);

  const filteredSessions = getFilteredSessions();
  const displaySessions = searchResults !== null
    ? searchResults.filter(s => {
        if (sourceFilter !== 'all') { if (sourceFilter === 'webui') return !s.source || s.source === 'webui'; return s.source === sourceFilter; }
        return true;
      }) : filteredSessions;
  const isSearching = searchResults !== null;
  const serverNow = useSessionStore(s => s.serverNow);
  const now = serverNow();
  const grouped = isSearching ? null : {
    today: displaySessions.filter(s => now - s.updated_at * 1000 < 86400000),
    yesterday: displaySessions.filter(s => now - s.updated_at * 1000 >= 86400000 && now - s.updated_at * 1000 < 172800000),
    earlier: displaySessions.filter(s => now - s.updated_at * 1000 >= 172800000),
  };

  /* ── Settings section icons ── */
  const settingsSections = [
    { key: 'conversation' as const, label: t('settings_conversation'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { key: 'appearance' as const, label: t('settings_appearance'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
    { key: 'preferences' as const, label: t('settings_preferences'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg> },
    { key: 'providers' as const, label: t('settings_providers'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> },
    { key: 'plugins' as const, label: t('settings_plugins'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4.3 2.1 7L12 16.2 5.4 20.3l2.1-7L2 9h7z"/></svg> },
    { key: 'system' as const, label: t('settings_system'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><line x1="6" y1="7" x2="6.01" y2="7"/><line x1="6" y1="17" x2="6.01" y2="17"/></svg> },
  ];

  return (
    <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Mobile tab navigation — matches original sidebar-nav */}
      <div className="sidebar-nav">
        {MOBILE_TABS.map(tab => (
          <button key={tab.id}
            className={`nav-tab${activePanel === tab.id ? ' active' : ''}`}
            data-panel={tab.id} data-label={tab.label}
            onClick={() => onSwitch(tab.id)} title={tab.label}>
            <NavTabIcon panelId={tab.id} />
          </button>
        ))}
      </div>

      {/* ── Chat panel (id=panelChat) ── */}
      <div className={`panel-view${activePanel === 'chat' ? ' active' : ''}`} id="panelChat">
        <div className="panel-head">
          <span>{t('tab_chat')}</span>
          <div className="panel-head-actions">
            <button className="panel-head-btn" id="btnNewChat" onClick={handleNewChat} title="New conversation (Cmd+K)" aria-label="New conversation">
              <PlusIcon />
            </button>
          </div>
        </div>
        <div className="session-search sidebar-search">
          <div className="session-search-field">
            <SearchIcon />
            <input id="sessionSearch" ref={searchInputRef} placeholder="Filter conversations..."
              value={searchQuery} onChange={e => handleSearch(e.target.value)} autoComplete="off" />
            <button type="button" id="sessionSearchClear" className="session-search-clear"
              aria-label="Clear conversation filter" title="Clear conversation filter"
              onClick={clearSearch} hidden={!searchQuery}>
              <ClearIcon />
            </button>
          </div>
        </div>
        <div className="session-list" id="sessionList">
          <div className="project-bar">
            {['all', 'webui', 'cli', 'messaging'].map(f => (
              <span key={f} className={`project-chip${sourceFilter === f ? ' active' : ''}${f !== 'all' ? ' no-project' : ''}`}
                onClick={() => setSourceFilter(f as 'all' | 'webui' | 'cli' | 'messaging')}
                title={f !== 'all' ? `Show conversations from ${f}` : 'Show all conversations'}>
                {f === 'all' ? 'All' : f === 'webui' ? 'WebUI' : f === 'cli' ? 'CLI' : 'Messaging'}
              </span>
            ))}
          </div>
          <SessionList sessions={displaySessions} grouped={grouped} activeId={activeSid} searchQuery={searchQuery || undefined} />
        </div>
      </div>

      {/* ── Tasks panel (id=panelTasks) ── */}
      <div className={`panel-view${activePanel === 'tasks' ? ' active' : ''}`} id="panelTasks">
        <div className="panel-head">
          <span>{t('scheduled_jobs')}</span>
          <div className="panel-head-actions">
            <button className="panel-head-btn" id="cronRefreshBtn" onClick={() => { /* CronPanel will handle its own refresh */ }} title="Refresh job list" aria-label="Refresh job list"><RefreshIcon /></button>
            <button className="panel-head-btn" id="cronNewBtn" onClick={() => { /* Trigger new job form */ }} title="New job" aria-label="New job"><PlusIcon /></button>
          </div>
        </div>
        <div className="detail-alert cron-gateway-notice" id="cronGatewayNotice" style={{ display: 'none' }}>
          <div className="detail-alert-title">Gateway not configured</div>
          <p>The cron scheduler requires a gateway connection. Check your Hermes configuration.</p>
        </div>
        <div className="cron-list" id="cronList"><CronPanel /></div>
      </div>

      {/* ── Kanban panel (id=panelKanban) ── */}
      <div className={`panel-view${activePanel === 'kanban' ? ' active' : ''}`} id="panelKanban">
        <div className="panel-head"><span>{t('tab_kanban')}</span></div>
        <KanbanPanel />
      </div>

      {/* ── Skills panel (id=panelSkills) ── */}
      <div className={`panel-view${activePanel === 'skills' ? ' active' : ''}`} id="panelSkills">
        <div className="panel-head">
          <span>{t('tab_skills')}</span>
        </div>
        <SkillsPanel />
      </div>

      {/* ── Memory panel (id=panelMemory) — menu in sidebar, content in main area */}
      <div className={`panel-view${activePanel === 'memory' ? ' active' : ''}`} id="panelMemory">
        <div className="panel-head"><span>{t('tab_memory')}</span></div>
        <MemorySideMenu />
      </div>

      {/* ── Todos panel (id=panelTodos) ── */}
      <div className={`panel-view${activePanel === 'todos' ? ' active' : ''}`} id="panelTodos">
        <div className="panel-head"><span>{t('current_task_list')}</span></div>
        <TodosPanel />
      </div>

      {/* ── Insights panel (id=panelInsights) ── */}
      <div className={`panel-view${activePanel === 'insights' ? ' active' : ''}`} id="panelInsights">
        <div className="panel-head"><span>{t('tab_insights')}</span></div>
        <InsightsPanel sidebar />
      </div>

      {/* ── Workspaces panel (id=panelWorkspaces) ── */}
      <div className={`panel-view${activePanel === 'workspaces' ? ' active' : ''}`} id="panelWorkspaces">
        <div className="panel-head">
          <span>{t('tab_workspaces')}</span>
        </div>
        <WorkspacesPanel />
      </div>

      {/* ── Profiles panel (id=panelProfiles) ── */}
      <div className={`panel-view${activePanel === 'profiles' ? ' active' : ''}`} id="panelProfiles">
        <div className="panel-head">
          <span>{t('tab_profiles')}</span>
        </div>
        <ProfilesPanel />
      </div>

      {/* ── Logs panel (id=panelLogs) ── */}
      <div className={`panel-view${activePanel === 'logs' ? ' active' : ''}`} id="panelLogs">
        <div className="panel-head"><span>{t('tab_logs')}</span></div>
        <LogsPanel sidebar />
      </div>

      {/* ── Settings panel (id=panelSettings) — menu in sidebar, content in main area */}
      <div className={`panel-view${activePanel === 'settings' ? ' active' : ''}`} id="panelSettings">
        <div className="panel-head"><span>{t('tab_settings')}</span></div>
        <div className="side-menu" id="settingsMenu">
          {settingsSections.map(s => (
            <button key={s.key} type="button"
              className={`side-menu-item${settingsSection === s.key ? ' active' : ''}`}
              data-settings-section={s.key} onClick={() => setSettingsSection(s.key)}>
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="resize-handle" id="sidebarResize" />
    </aside>
  );
}

/* ── Mobile nav-tab icons ── */
function NavTabIcon({ panelId }: { panelId: PanelId }) {
  const w = 18, h = 18;
  switch (panelId) {
    case 'chat': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'tasks': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'kanban': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16"/><path d="M16 4v16"/><path d="M3 10h18"/></svg>;
    case 'skills': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
    case 'memory': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>;
    case 'workspaces': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
    case 'profiles': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'insights': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>;
    case 'logs': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/></svg>;
    case 'settings': return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    default: return <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  }
}
