import { useEffect } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { usePanelStore } from '../store/panelStore';

export function useKeyboardShortcuts() {
  const createSession = useSessionStore(s => s.createSession);
  const switchPanel = usePanelStore(s => s.switchTo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl+K: new chat
      if (mod && e.key === 'k') {
        e.preventDefault();
        switchPanel('chat');
        createSession();
        return;
      }
      // Cmd/Ctrl+B: toggle sidebar (desktop only)
      if (mod && e.key === 'b' && window.innerWidth >= 641) {
        e.preventDefault();
        const collapsed = localStorage.getItem('hermes-webui-sidebar-collapsed') === '1';
        localStorage.setItem('hermes-webui-sidebar-collapsed', collapsed ? '0' : '1');
        window.location.reload();
        return;
      }
      // Escape: close dialogs (handled by individual components)
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [createSession, switchPanel]);
}
