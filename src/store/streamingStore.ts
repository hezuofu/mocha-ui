import { create } from 'zustand';

interface StreamingState {
  isStreaming: boolean;
  streamId: string | null;
  approvalCount: number;
  approvalId: string | null;
  clarifyPending: boolean;
  contextTokens: number;
  contextMax: number;

  startStream: (streamId: string) => void;
  endStream: () => void;
  setApproval: (count: number, approvalId?: string) => void;
  clearApproval: () => void;
  setClarify: (pending: boolean) => void;
  setContext: (tokens: number, max: number) => void;
}

export const useStreamingStore = create<StreamingState>((set) => ({
  isStreaming: false,
  streamId: null,
  approvalCount: 0,
  approvalId: null,
  clarifyPending: false,
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

  setContext(tokens: number, max: number) {
    set({ contextTokens: tokens, contextMax: max });
  },
}));
