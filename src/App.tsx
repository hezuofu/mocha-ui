import { useEffect, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSessionStore } from './store/sessionStore';
import { useSettingsStore } from './store/settingsStore';
import { useWorkspaceStore } from './store/workspaceStore';
import { usePanelStore } from './store/panelStore';
import type { PanelId } from './store/panelStore';
import { useTheme } from './hooks/useTheme';
import Titlebar from './components/layout/Titlebar';
import Rail from './components/layout/Rail';
import Sidebar from './components/layout/Sidebar';
import WorkspacePanel from './components/layout/WorkspacePanel';
import LoginPage from './components/auth/LoginPage';
import MainArea from './components/chat/MainArea';

const PANEL_TITLEBAR_KEYS: Record<string, string> = {
  tasks: 'Scheduled jobs',
  kanban: 'Kanban',
  skills: 'Skills',
  memory: 'Memory',
  workspaces: 'Spaces',
  profiles: 'Agent profiles',
  todos: 'Tasks',
  insights: 'Insights',
  logs: 'Logs',
  settings: 'Settings',
};

export default function App() {
  const loadSessions = useSessionStore(s => s.loadSessions);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const loadModels = useSettingsStore(s => s.loadModels);
  const activeSessionId = useSessionStore(s => s.activeSessionId);
  const sessions = useSessionStore(s => s.sessions);
  const messages = useSessionStore(s => s.messages);
  const workspaceOpen = useWorkspaceStore(s => s.open);
  const activePanel = usePanelStore(s => s.activePanel);
  const switchPanel = usePanelStore(s => s.switchTo);
  const { theme, skin, fontSize } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('hermes-webui-sidebar-collapsed') === '1'; }
    catch { return false; }
  });

  useEffect(() => {
    loadSessions();
    loadSettings();
    loadModels();
    try { setSidebarCollapsed(localStorage.getItem('hermes-webui-sidebar-collapsed') === '1'); }
    catch { /* ignore */ }
  }, [loadSessions, loadSettings, loadModels]);

  // Sync theme / skin / font-size / workspace-panel to DOM attributes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    if (skin && skin !== 'default') root.dataset.skin = skin;
    else delete root.dataset.skin;
    if (fontSize && fontSize !== 'default') root.dataset.fontSize = fontSize;
    else delete root.dataset.fontSize;
    root.dataset.workspacePanel = workspaceOpen ? 'open' : 'closed';
  }, [theme, skin, fontSize, workspaceOpen]);

  // Sync theme-color meta tag
  useEffect(() => {
    const color = theme === 'dark' ? '#141425' : '#FAF7F0';
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
      m.setAttribute('content', color);
    });
  }, [theme]);

  const handlePanelSwitch = useCallback((panel: PanelId) => {
    if (panel === activePanel && window.innerWidth >= 641) {
      const next = !sidebarCollapsed;
      setSidebarCollapsed(next);
      try { localStorage.setItem('hermes-webui-sidebar-collapsed', next ? '1' : '0'); }
      catch { /* ignore */ }
    } else {
      switchPanel(panel);
    }
    setMobileSidebarOpen(false);
  }, [switchPanel, activePanel, sidebarCollapsed]);

  // Derived titlebar info
  const activeSession = sessions.find(s => s.session_id === activeSessionId);
  const titlebarSubtitle = activePanel === 'chat' && activeSession
    ? (messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? 's' : ''}` : '')
    : '';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <div className={`app-root ${theme}`}>
          <Titlebar
            onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            title={activePanel === 'chat'
              ? (activeSession?.title || 'Hermes')
              : (PANEL_TITLEBAR_KEYS[activePanel] || 'Hermes')}
            subtitle={titlebarSubtitle}
          />
          <div className={`layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
            <Rail activePanel={activePanel} onSwitch={handlePanelSwitch} />
            <Sidebar
              activePanel={activePanel}
              mobileOpen={mobileSidebarOpen}
              onSwitch={handlePanelSwitch}
            />
            <MainArea />
            <WorkspacePanel />
          </div>
        </div>
      } />
    </Routes>
  );
}
