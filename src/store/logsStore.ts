import { create } from 'zustand';

interface LogsState {
  file: string;
  tail: number;
  severity: string;
  autoRefresh: boolean;
  wrap: boolean;
  logs: string[];
  status: string;
  loading: boolean;
  refreshKey: number;
  setFile: (f: string) => void;
  setTail: (n: number) => void;
  setSeverity: (s: string) => void;
  setAutoRefresh: (b: boolean) => void;
  setWrap: (b: boolean) => void;
  setLogs: (lines: string[], status: string) => void;
  setLoading: (b: boolean) => void;
  refresh: () => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  file: 'agent',
  tail: 200,
  severity: 'all',
  autoRefresh: true,
  wrap: false,
  logs: [],
  status: 'Choose a log file to view recent lines.',
  loading: true,
  refreshKey: 0,
  setFile: (f) => set({ file: f }),
  setTail: (n) => set({ tail: n }),
  setSeverity: (s) => set({ severity: s }),
  setAutoRefresh: (b) => set({ autoRefresh: b }),
  setWrap: (b) => set({ wrap: b }),
  setLogs: (lines, status) => set({ logs: lines, status, loading: false }),
  setLoading: (b) => set({ loading: b }),
  refresh: () => set(s => ({ refreshKey: s.refreshKey + 1 })),
}));
