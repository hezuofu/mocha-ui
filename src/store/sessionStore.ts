import { create } from 'zustand';
import type { Session, Message, ToolCall } from '../types';
import * as api from '../api/endpoints';
import { closeSSE } from '../api/sse';

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  messages: Message[];
  busy: boolean;
  pendingFiles: File[];
  toolCalls: ToolCall[];
  activeStreamId: string | null;
  activeProfile: string;
  serverTimeSkew: number;
  serverTz: string | undefined;
  queueDrainSid: string | null;
  suggestedInput: string | null;

  // Actions
  loadSessions: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  createSession: (workspace?: string) => Promise<string>;
  deleteActiveSession: (id: string) => Promise<void>;
  pinSession: (id: string) => Promise<void>;
  archiveSession: (id: string, archive: boolean) => Promise<void>;
  duplicateSession: (id: string) => Promise<void>;
  searchSessions: (query: string) => Promise<Session[]>;
  renameSession: (id: string, title: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  setBusy: (busy: boolean) => void;
  setActiveStreamId: (id: string | null) => void;
  addMessage: (msg: Message) => void;
  appendToken: (text: string) => void;
  updateToolCall: (tc: ToolCall) => void;
  setPendingFiles: (files: File[]) => void;
  clearPendingFiles: () => void;
  setServerTime: (time: number, tz?: string) => void;
  serverNow: () => number;
  setSuggestedInput: (text: string | null) => void;
  consumeSuggestion: () => string | null;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  busy: false,
  pendingFiles: [],
  toolCalls: [],
  activeStreamId: null,
  activeProfile: 'default',
  serverTimeSkew: 0,
  serverTz: undefined,
  queueDrainSid: null,
  suggestedInput: null,

  async loadSessions() {
    const data = await api.getSessions();
    if (data.server_time) get().setServerTime(data.server_time, data.server_tz);
    set({ sessions: data.sessions || [] });
  },

  async loadSession(id: string) {
    closeSSE(id);
    const data = await api.getSession(id);
    set({
      activeSessionId: id,
      messages: data.messages || [],
      toolCalls: [],
      activeStreamId: data.session.active_stream_id || null,
      activeProfile: data.session.profile || 'default',
    });
  },

  async createSession(workspace?: string) {
    const data = await api.createSession(workspace);
    const sid = data.session.session_id;
    set({
      activeSessionId: sid,
      messages: [],
      toolCalls: [],
      busy: false,
      activeStreamId: null,
    });
    await get().loadSessions();
    return sid;
  },

  async deleteActiveSession(id: string) {
    await api.deleteSession(id);
    const { sessions, activeSessionId } = get();
    const remaining = sessions.filter(s => s.session_id !== id);
    set({ sessions: remaining });
    if (activeSessionId === id) {
      const next = remaining[0];
      if (next) await get().loadSession(next.session_id);
      else set({ activeSessionId: null, messages: [] });
    }
  },

  async pinSession(id: string) {
    await api.pinSession(id);
    await get().loadSessions();
  },

  async archiveSession(id: string, archive: boolean) {
    await api.archiveSession(id, archive);
    await get().loadSessions();
  },

  async duplicateSession(id: string) {
    await api.duplicateSession(id);
    await get().loadSessions();
  },

  async searchSessions(query: string) {
    const data = await api.searchSessions(query);
    return data.sessions;
  },

  async renameSession(id: string, title: string) {
    await api.renameSession(id, title);
    set(state => ({
      sessions: state.sessions.map(s =>
        s.session_id === id ? { ...s, title } : s,
      ),
    }));
  },

  setActiveSession(id) {
    set({ activeSessionId: id });
  },

  setBusy(busy: boolean) {
    set({ busy });
    if (!busy) {
      set({ toolCalls: [], pendingFiles: [] });
    }
  },

  setActiveStreamId(id) {
    set({ activeStreamId: id });
  },

  addMessage(msg: Message) {
    set(state => ({ messages: [...state.messages, msg] }));
  },

  appendToken(text: string) {
    set(state => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = {
          ...last,
          content: (last.content || '') + text,
        };
      } else {
        msgs.push({ role: 'assistant', content: text });
      }
      return { messages: msgs };
    });
  },

  updateToolCall(tc: ToolCall) {
    set(state => {
      const existing = state.toolCalls.findIndex(t => t.id === tc.id);
      if (existing >= 0) {
        const updated = [...state.toolCalls];
        updated[existing] = tc;
        return { toolCalls: updated };
      }
      return { toolCalls: [...state.toolCalls, tc] };
    });
  },

  setPendingFiles(files: File[]) {
    set({ pendingFiles: files });
  },

  clearPendingFiles() {
    set({ pendingFiles: [] });
  },

  setServerTime(time: number, tz?: string) {
    set({
      serverTimeSkew: time - Date.now(),
      serverTz: tz,
    });
  },

  serverNow() {
    return Date.now() + get().serverTimeSkew;
  },

  setSuggestedInput(text: string | null) {
    set({ suggestedInput: text });
  },

  consumeSuggestion() {
    const text = get().suggestedInput;
    if (text) set({ suggestedInput: null });
    return text;
  },
}));
