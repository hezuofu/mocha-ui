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
  profileDetailName: string | null;
  profileMode: 'read' | 'create' | 'empty';
  cronDetailId: string | null;
  cronMode: 'read' | 'create' | 'edit' | 'empty';
  skillDetailName: string | null;
  skillMode: 'read' | 'create' | 'edit' | 'empty';
  switchTo: (panel: PanelId) => void;
  open: (panel?: PanelId) => void;
  close: () => void;
  setInsightsPeriod: (p: number) => void;
  setSettingsSection: (s: SettingsSection) => void;
  setMemorySection: (s: MemorySection) => void;
  setProfileDetail: (name: string | null, mode?: 'read' | 'create' | 'empty') => void;
  clearProfileDetail: () => void;
  setCronDetail: (id: string | null, mode?: 'read' | 'create' | 'edit' | 'empty') => void;
  clearCronDetail: () => void;
  setSkillDetail: (name: string | null, mode?: 'read' | 'create' | 'edit' | 'empty') => void;
  clearSkillDetail: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  activePanel: 'chat',
  isOpen: false,
  insightsPeriod: 30,
  settingsSection: 'conversation',
  memorySection: 'agent',
  profileDetailName: null,
  profileMode: 'empty',
  cronDetailId: null,
  cronMode: 'empty',
  skillDetailName: null,
  skillMode: 'empty',
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
  setProfileDetail(name: string | null, mode: 'read' | 'create' | 'empty' = 'read') {
    set({ profileDetailName: name, profileMode: mode });
  },
  clearProfileDetail() {
    set({ profileDetailName: null, profileMode: 'empty' });
  },
  setCronDetail(id: string | null, mode: 'read' | 'create' | 'edit' | 'empty' = 'read') {
    set({ cronDetailId: id, cronMode: mode });
  },
  clearCronDetail() {
    set({ cronDetailId: null, cronMode: 'empty' });
  },
  setSkillDetail(name: string | null, mode: 'read' | 'create' | 'edit' | 'empty' = 'read') {
    set({ skillDetailName: name, skillMode: mode });
  },
  clearSkillDetail() {
    set({ skillDetailName: null, skillMode: 'empty' });
  },
}));
