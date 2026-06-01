import { create } from 'zustand';

export type PanelId =
  | 'chat' | 'tasks' | 'kanban' | 'skills' | 'memory'
  | 'workspaces' | 'profiles' | 'todos' | 'insights' | 'logs' | 'settings';

export type SettingsSection = 'conversation' | 'appearance' | 'preferences' | 'providers' | 'plugins' | 'system';
export type MemorySection = 'memory' | 'user' | 'soul' | 'external_notes';

interface PanelState {
  activePanel: PanelId;
  isOpen: boolean;
  insightsPeriod: number;
  settingsSection: SettingsSection;
  memorySection: MemorySection;
  switchTo: (panel: PanelId) => void;
  open: (panel?: PanelId) => void;
  close: () => void;
  setInsightsPeriod: (p: number) => void;
  setSettingsSection: (s: SettingsSection) => void;
  setMemorySection: (s: MemorySection) => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  activePanel: 'chat',
  isOpen: false,
  insightsPeriod: 30,
  settingsSection: 'conversation',
  memorySection: 'agent',
  switchTo(panel: PanelId) {
    set({ activePanel: panel });
  },
  open(panel?: PanelId) {
    set({ isOpen: true, ...(panel ? { activePanel: panel } : {}) });
  },
  close() {
    set({ isOpen: false });
  },
  setInsightsPeriod(p: number) {
    set({ insightsPeriod: p });
  },
  setSettingsSection(s: SettingsSection) {
    set({ settingsSection: s });
  },
  setMemorySection(s: MemorySection) {
    set({ memorySection: s });
  },
}));
