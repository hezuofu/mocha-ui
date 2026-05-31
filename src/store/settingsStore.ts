import { create } from 'zustand';
import type { Settings, ModelGroup } from '../types';
import * as api from '../api/endpoints';

interface SettingsState extends Settings {
  loaded: boolean;
  availableModels: ModelGroup[];
  loadSettings: () => Promise<void>;
  saveSettings: (s: Partial<Settings>) => Promise<void>;
  loadModels: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  loaded: false,
  theme: 'dark',
  skin: 'default',
  language: 'en',
  font_size: 'default',
  send_key: 'enter',
  token_display: false,
  show_cli_sessions: true,
  busy_input_mode: 'queue',
  bot_name: 'Hermes',
  availableModels: [],

  async loadSettings() {
    try {
      const s = await api.getSettings();
      set({ ...s, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  async saveSettings(s: Partial<Settings>) {
    await api.saveSettings(s);
    set(s);
  },

  async loadModels() {
    try {
      const raw = await api.getModels();
      const data = raw as unknown as Record<string, unknown>;
      const groups = (data.groups as ModelGroup[]) || (Array.isArray(raw) ? raw as ModelGroup[] : []);
      set({ availableModels: groups });
    } catch {
      // keep previous models
    }
  },
}));
