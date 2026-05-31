import { useSessionStore } from '../../store/sessionStore';
import { useI18n } from '../../i18n';
import type { Session } from '../../types';
import SessionItem from './SessionItem';

interface SessionListProps {
  sessions: Session[];
  grouped: { today: Session[]; yesterday: Session[]; earlier: Session[] } | null;
  activeId: string | null;
  searchQuery?: string;
}

export default function SessionList({ sessions, grouped, activeId, searchQuery }: SessionListProps) {
  const { t } = useI18n();
  const loadSession = useSessionStore(s => s.loadSession);
  const deleteActiveSession = useSessionStore(s => s.deleteActiveSession);
  const pinSession = useSessionStore(s => s.pinSession);
  const archiveSession = useSessionStore(s => s.archiveSession);
  const duplicateSession = useSessionStore(s => s.duplicateSession);
  const renameSession = useSessionStore(s => s.renameSession);
  const batchMode = useSessionStore(s => s.batchMode);
  const selectedSessionIds = useSessionStore(s => s.selectedSessionIds);
  const toggleBatchMode = useSessionStore(s => s.toggleBatchMode);
  const toggleSessionSelected = useSessionStore(s => s.toggleSessionSelected);

  if (sessions.length === 0) {
    return (
      <div className="session-list-empty">
        <p>{t('no_conversations')}</p>
        <p className="text-muted">{t('start_new')}</p>
      </div>
    );
  }

  const itemProps = (s: Session) => ({
    session: s,
    active: s.session_id === activeId,
    searchQuery: searchQuery || undefined,
    batchMode,
    selected: selectedSessionIds.has(s.session_id),
    onSelect: () => { if (batchMode) { toggleSessionSelected(s.session_id); return; } loadSession(s.session_id); },
    onPin: () => pinSession(s.session_id),
    onArchive: (archive: boolean) => archiveSession(s.session_id, archive),
    onDuplicate: () => duplicateSession(s.session_id),
    onDelete: () => deleteActiveSession(s.session_id),
    onRename: (title: string) => renameSession(s.session_id, title),
  });

  if (grouped) {
    return (
      <div className="session-list">
        {batchMode && (
          <div className="batch-action-bar">
            <span>{selectedSessionIds.size} selected</span>
            <button className="batch-exit-btn" onClick={toggleBatchMode}>Done</button>
          </div>
        )}
        {grouped.today.length > 0 && (
          <div className="session-group">
            <div className="session-group-label">{t('today')}</div>
            {grouped.today.map(s => <SessionItem key={s.session_id} {...itemProps(s)} />)}
          </div>
        )}
        {grouped.yesterday.length > 0 && (
          <div className="session-group">
            <div className="session-group-label">{t('yesterday')}</div>
            {grouped.yesterday.map(s => <SessionItem key={s.session_id} {...itemProps(s)} />)}
          </div>
        )}
        {grouped.earlier.length > 0 && (
          <div className="session-group">
            <div className="session-group-label">{t('earlier')}</div>
            {grouped.earlier.map(s => <SessionItem key={s.session_id} {...itemProps(s)} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="session-list">
      {sessions.map(s => <SessionItem key={s.session_id} {...itemProps(s)} />)}
    </div>
  );
}
