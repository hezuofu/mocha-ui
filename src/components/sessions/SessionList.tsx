import { useSessionStore } from '../../store/sessionStore';
import type { Session } from '../../types';
import SessionItem from './SessionItem';

interface SessionListProps {
  sessions: Session[];
  grouped: { today: Session[]; yesterday: Session[]; earlier: Session[] } | null;
  activeId: string | null;
}

export default function SessionList({ sessions, grouped, activeId }: SessionListProps) {
  const loadSession = useSessionStore(s => s.loadSession);
  const deleteActiveSession = useSessionStore(s => s.deleteActiveSession);
  const pinSession = useSessionStore(s => s.pinSession);
  const archiveSession = useSessionStore(s => s.archiveSession);
  const duplicateSession = useSessionStore(s => s.duplicateSession);
  const renameSession = useSessionStore(s => s.renameSession);

  if (sessions.length === 0) {
    return (
      <div className="session-list-empty">
        <p>No conversations yet</p>
        <p className="text-muted">Start a new conversation to begin</p>
      </div>
    );
  }

  if (grouped) {
    return (
      <div className="session-list">
        {grouped.today.length > 0 && (
          <div className="session-group">
            <div className="session-group-label">Today</div>
            {grouped.today.map(s => (
              <SessionItem
                key={s.session_id}
                session={s}
                active={s.session_id === activeId}
                onSelect={() => loadSession(s.session_id)}
                onPin={() => pinSession(s.session_id)}
                onArchive={(archive) => archiveSession(s.session_id, archive)}
                onDuplicate={() => duplicateSession(s.session_id)}
                onDelete={() => deleteActiveSession(s.session_id)}
                onRename={(title) => renameSession(s.session_id, title)}
              />
            ))}
          </div>
        )}
        {grouped.yesterday.length > 0 && (
          <div className="session-group">
            <div className="session-group-label">Yesterday</div>
            {grouped.yesterday.map(s => (
              <SessionItem
                key={s.session_id}
                session={s}
                active={s.session_id === activeId}
                onSelect={() => loadSession(s.session_id)}
                onPin={() => pinSession(s.session_id)}
                onArchive={(archive) => archiveSession(s.session_id, archive)}
                onDuplicate={() => duplicateSession(s.session_id)}
                onDelete={() => deleteActiveSession(s.session_id)}
                onRename={(title) => renameSession(s.session_id, title)}
              />
            ))}
          </div>
        )}
        {grouped.earlier.length > 0 && (
          <div className="session-group">
            <div className="session-group-label">Earlier</div>
            {grouped.earlier.map(s => (
              <SessionItem
                key={s.session_id}
                session={s}
                active={s.session_id === activeId}
                onSelect={() => loadSession(s.session_id)}
                onPin={() => pinSession(s.session_id)}
                onArchive={(archive) => archiveSession(s.session_id, archive)}
                onDuplicate={() => duplicateSession(s.session_id)}
                onDelete={() => deleteActiveSession(s.session_id)}
                onRename={(title) => renameSession(s.session_id, title)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="session-list">
      {sessions.map(s => (
        <SessionItem
          key={s.session_id}
          session={s}
          active={s.session_id === activeId}
          onSelect={() => loadSession(s.session_id)}
          onPin={() => pinSession(s.session_id)}
          onArchive={(archive) => archiveSession(s.session_id, archive)}
          onDuplicate={() => duplicateSession(s.session_id)}
          onDelete={() => deleteActiveSession(s.session_id)}
          onRename={(title) => renameSession(s.session_id, title)}
        />
      ))}
    </div>
  );
}
