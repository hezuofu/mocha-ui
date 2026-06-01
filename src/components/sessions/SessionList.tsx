import { useState } from 'react';
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (name: string) => {
    setCollapsed(prev => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next; });
  };
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
      <>

        {batchMode && (
          <div className="batch-action-bar">
            <span>{selectedSessionIds.size} selected</span>
            <button className="batch-exit-btn" onClick={toggleBatchMode}>Done</button>
          </div>
        )}
        {[
          { key: 'today', label: t('today'), items: grouped.today },
          { key: 'yesterday', label: t('yesterday'), items: grouped.yesterday },
          { key: 'earlier', label: t('earlier'), items: grouped.earlier },
        ].map(g => g.items.length > 0 && (
          <div key={g.key} className="session-date-group">
            <div className="session-date-header" onClick={() => toggleGroup(g.key)}>
              {g.label}
            </div>
            {!collapsed.has(g.key) && g.items.map(s => <SessionItem key={s.session_id} {...itemProps(s)} />)}
          </div>
        ))}
      </>
    );
  }

  return (
    <>{sessions.map(s => <SessionItem key={s.session_id} {...itemProps(s)} />)}</>
  );
}
