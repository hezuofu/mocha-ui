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
}));
