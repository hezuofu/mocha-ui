import { create } from 'zustand';
import type { WorkspaceEntry } from '../types';
import * as api from '../api/endpoints';
import storage from '../util/storage';

interface WorkspaceState {
  open: boolean;
  currentPath: string;
  entries: WorkspaceEntry[];
  previewPath: string | null;
  previewContent: string | null;
  previewType: string | null;
  breadcrumbs: { name: string; path: string }[];
  loading: boolean;
  showHidden: boolean;

  toggle: () => void;
  setOpen: (open: boolean) => void;
  navigate: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  preview: (path: string) => Promise<void>;
  clearPreview: () => void;
  createFile: (name: string, content?: string) => Promise<void>;
  createDir: (name: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  renameEntry: (oldPath: string, newName: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
}

function getActiveSessionId(): string {
  return storage.get('hermes-webui-session') || '';
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  open: storage.get('hermes-webui-workspace-panel') === 'open',
  currentPath: '.',
  entries: [],
  previewPath: null,
  previewContent: null,
  previewType: null,
  breadcrumbs: [],
  loading: false,
  showHidden: false,

  toggle() {
    set(s => {
      const next = !s.open;
      storage.set('hermes-webui-workspace-panel', next ? 'open' : 'closed')
      return { open: next };
    });
  },

  setOpen(open: boolean) {
    storage.set('hermes-webui-workspace-panel', open ? 'open' : 'closed')
    set({ open });
  },

  async navigate(path: string) {
    set({ loading: true, previewPath: null, previewContent: null, previewType: null });
    try {
      let sessionId = getActiveSessionId();
      // Auto-create a session if none exists (workspace needs a session to list files)
      if (!sessionId) {
        try {
          const data = await api.createSession();
          sessionId = data.session.session_id;
          storage.set('hermes-webui-session', sessionId);
        } catch {
          set({ loading: false, entries: [] });
          return;
        }
      }
      const data = await api.listDir(path, sessionId);
      const crumbs = buildBreadcrumbs(data.path);
      set({ currentPath: data.path, entries: data.entries, breadcrumbs: crumbs, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  async refresh() {
    const { currentPath } = get();
    await get().navigate(currentPath);
  },

  async preview(path: string) {
    try {
      const data = await api.readFile(path);
      set({ previewPath: data.path, previewContent: data.content, previewType: data.type });
    } catch {
      // silent
    }
  },

  clearPreview() {
    set({ previewPath: null, previewContent: null, previewType: null });
  },

  async createFile(name: string, content = '') {
    const { currentPath } = get();
    const fullPath = currentPath === '.' ? name : `${currentPath}/${name}`;
    await api.writeFile(fullPath, content);
    await get().refresh();
  },

  async createDir(name: string) {
    const { currentPath } = get();
    const fullPath = currentPath === '.' ? name : `${currentPath}/${name}`;
    await api.createDir(fullPath);
    await get().refresh();
  },

  async deleteEntry(path: string) {
    await api.deleteFile(path);
    await get().refresh();
  },

  async renameEntry(oldPath: string, newName: string) {
    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    await api.renameFile(oldPath, newPath);
    await get().refresh();
  },

  async saveFile(path: string, content: string) {
    await api.writeFile(path, content);
  },
}));

function buildBreadcrumbs(path: string): { name: string; path: string }[] {
  if (path === '.') return [{ name: 'Workspace', path: '.' }];
  const parts = path.replace(/\\/g, '/').split('/');
  const crumbs: { name: string; path: string }[] = [{ name: 'Workspace', path: '.' }];
  let accumulated = '';
  for (const part of parts) {
    accumulated = accumulated ? `${accumulated}/${part}` : part;
    crumbs.push({ name: part, path: accumulated });
  }
  return crumbs;
}
