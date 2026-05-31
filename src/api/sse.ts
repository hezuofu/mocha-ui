// ── SSE streaming client for chat responses ──

export type SSEHandler = (event: string, data: string) => void;

export interface SSEConnection {
  close: () => void;
  readyState: number;
}

const connections = new Map<string, { es: EventSource; handlers: Set<SSEHandler> }>();

export function connectSSE(
  sessionId: string,
  streamId: string,
  onEvent: SSEHandler,
): SSEConnection {
  // Close any existing connection for this session
  closeSSE(sessionId);

  const url = `/api/chat/stream?session_id=${encodeURIComponent(sessionId)}&stream_id=${encodeURIComponent(streamId)}`;
  const es = new EventSource(url);

  const handleEvent = (e: MessageEvent) => {
    try {
      onEvent(e.type === 'message' ? 'token' : e.type, e.data);
    } catch {
      // ignore parse errors on individual events
    }
  };

  // Listen for common SSE event types
  es.addEventListener('token', handleEvent as EventListener);
  es.addEventListener('done', handleEvent as EventListener);
  es.addEventListener('error', handleEvent as EventListener);
  es.addEventListener('tool_call', handleEvent as EventListener);
  es.addEventListener('approval', handleEvent as EventListener);
  es.addEventListener('thinking', handleEvent as EventListener);
  es.addEventListener('status', handleEvent as EventListener);
  es.addEventListener('clarify', handleEvent as EventListener);

  es.onerror = () => {
    onEvent('connection_error', '');
  };

  const set = new Set<SSEHandler>([onEvent]);
  connections.set(sessionId, { es, handlers: set });

  return {
    close: () => closeSSE(sessionId),
    get readyState() { return es.readyState; },
  };
}

export function closeSSE(sessionId: string) {
  const entry = connections.get(sessionId);
  if (entry) {
    entry.es.close();
    connections.delete(sessionId);
  }
}

export function closeAllSSE() {
  for (const [sid, entry] of connections) {
    (() => { void sid; })(); // discard hash key
    entry.es.close();
  }
  connections.clear();
}

// ── Approval SSE (real-time approval polling replacement) ──

let approvalEs: EventSource | null = null;

export function connectApprovalSSE(sessionId: string, onPending: (count: number, approvalId?: string) => void) {
  if (approvalEs) approvalEs.close();
  approvalEs = new EventSource(`/api/approval/stream?session_id=${encodeURIComponent(sessionId)}`);

  approvalEs.addEventListener('initial', (e: MessageEvent) => {
    try {
      const d = JSON.parse(e.data);
      if (d.count != null) onPending(d.count, d.approval_id);
    } catch { /* ignore */ }
  });

  approvalEs.addEventListener('approval', (e: MessageEvent) => {
    try {
      const d = JSON.parse(e.data);
      if (d.count != null) onPending(d.count, d.approval_id);
    } catch { /* ignore */ }
  });

  approvalEs.onerror = () => { /* silently reconnect */ };

  return () => {
    approvalEs?.close();
    approvalEs = null;
  };
}
