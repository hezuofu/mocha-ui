import { useMemo } from 'react';
import { useSessionStore } from '../../store/sessionStore';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

/* ── Status SVGs (matching original li() icons from static/icons.js) ── */

const SquareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const LoaderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="spin">
    <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

const CheckSqIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const statusIcon: Record<string, React.ReactNode> = {
  pending: <SquareIcon />,
  in_progress: <LoaderIcon />,
  completed: <CheckSqIcon />,
  cancelled: <XIcon />,
};

const statusColor: Record<string, string> = {
  pending: 'var(--muted)',
  in_progress: 'var(--blue)',
  completed: 'rgba(100,200,100,.8)',
  cancelled: 'rgba(200,100,100,.5)',
};

/* ── Parse todos from session messages (matching original loadTodos()) ── */
function parseTodos(messages: any[]): TodoItem[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === 'tool') {
      try {
        const d = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
        if (d && Array.isArray(d.todos) && d.todos.length) {
          return d.todos;
        }
      } catch { /* malformed JSON — skip */ }
    }
  }
  return [];
}

export default function TodosPanel() {
  const messages = useSessionStore(s => s.messages);
  const activeSid = useSessionStore(s => s.activeSessionId);

  const todos = useMemo(() => {
    if (!activeSid || !messages.length) return [];
    return parseTodos(messages);
  }, [messages, activeSid]);

  return (
    <div id="todoPanel" style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
      {!todos.length ? (
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: '4px 0' }}>
          No active task list in this session.
        </div>
      ) : (
        todos.map(t => (
          <div key={t.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '6px 0', borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{
              fontSize: 14, display: 'inline-flex', alignItems: 'center',
              flexShrink: 0, marginTop: 1,
              color: statusColor[t.status] || 'var(--muted)',
            }}>
              {statusIcon[t.status] || <SquareIcon />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                color: t.status === 'completed' ? 'var(--muted)' : 'var(--text)',
                textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                opacity: t.status === 'completed' ? 0.5 : 1,
                lineHeight: 1.4,
              }}>
                {t.content}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--muted)',
                marginTop: 2, opacity: 0.6,
              }}>
                {t.id} · {t.status}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
