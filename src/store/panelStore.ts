import { create } from 'zustand';

export type PanelId =
  | 'chat' | 'tasks' | 'kanban' | 'skills' | 'memory'
  | 'workspaces' | 'profiles' | 'todos' | 'insights' | 'logs' | 'settings';

interface PanelState {
  activePanel: PanelId;
  isOpen: boolean;
  switchTo: (panel: PanelId) => void;
  open: (panel?: PanelId) => void;
  close: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  activePanel: 'chat',
  isOpen: false,
  switchTo(panel: PanelId) {
    set({ activePanel: panel });
  },
  open(panel?: PanelId) {
    set({ isOpen: true, ...(panel ? { activePanel: panel } : {}) });
  },
  close() {
    set({ isOpen: false });
  },
}));
