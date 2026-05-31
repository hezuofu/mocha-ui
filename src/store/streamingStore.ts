import { create } from 'zustand';

interface StreamingState {
  isStreaming: boolean;
  streamId: string | null;
  approvalCount: number;
  approvalId: string | null;
  clarifyPending: boolean;
  clarifyQuestion: string;
  clarifyChoices: string[];
  compressionRunning: boolean;
  compressionMessage: string;
  contextTokens: number;
  contextMax: number;

  startStream: (streamId: string) => void;
  endStream: () => void;
  setApproval: (count: number, approvalId?: string) => void;
  clearApproval: () => void;
  setClarify: (pending: boolean) => void;
  showClarify: (question: string, choices: string[]) => void;
  hideClarify: () => void;
  setCompression: (running: boolean, message?: string) => void;
  setContext: (tokens: number, max: number) => void;
  saveInflightState: (sessionId: string, messages: unknown[], toolCalls: unknown[]) => void;
  loadInflightState: () => { sessionId: string; messages: unknown[]; toolCalls: unknown[] } | null;
  clearInflightState: () => void;
  playSound: (type?: 'message' | 'attention') => void;
}

export const useStreamingStore = create<StreamingState>((set) => ({
  isStreaming: false,
  streamId: null,
  approvalCount: 0,
  approvalId: null,
  clarifyPending: false,
  clarifyQuestion: '',
  clarifyChoices: [],
  compressionRunning: false,
  compressionMessage: '',
  contextTokens: 0,
  contextMax: 200000,

  startStream(streamId: string) {
    set({ isStreaming: true, streamId, approvalCount: 0, approvalId: null, clarifyPending: false });
  },

  endStream() {
    set({ isStreaming: false, streamId: null });
  },

  setApproval(count: number, approvalId?: string) {
    set({ approvalCount: count, approvalId: approvalId || null });
  },

  clearApproval() {
    set({ approvalCount: 0, approvalId: null });
  },

  setClarify(pending: boolean) {
    set({ clarifyPending: pending });
  },

  showClarify(question: string, choices: string[]) {
    set({ clarifyPending: true, clarifyQuestion: question, clarifyChoices: choices });
  },

  hideClarify() {
    set({ clarifyPending: false, clarifyQuestion: '', clarifyChoices: [] });
  },

  setCompression(running: boolean, message?: string) {
    set({ compressionRunning: running, compressionMessage: message || '' });
  },

  setContext(tokens: number, max: number) {
    set({ contextTokens: tokens, contextMax: max });
  },

  saveInflightState(sessionId: string, messages: unknown[], toolCalls: unknown[]) {
    try { localStorage.setItem('hermes-inflight', JSON.stringify({ sessionId, messages, toolCalls, ts: Date.now() })); } catch {}
  },

  loadInflightState() {
    try {
      const raw = localStorage.getItem('hermes-inflight');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > 3600000) { localStorage.removeItem('hermes-inflight'); return null; }
      return data;
    } catch { return null; }
  },

  clearInflightState() {
    try { localStorage.removeItem('hermes-inflight'); } catch {}
  },

  playSound(_type: 'message' | 'attention' = 'message') {
    try {
      const ctx = new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = _type === 'attention' ? 880 : 520;
      osc.type = 'sine';
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  },
}));
