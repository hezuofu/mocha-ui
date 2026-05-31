import { useState, useRef, useEffect, useCallback } from 'react';
import type { Session } from '../../types';
/* All icons replaced with original inline SVGs from static/icons.js */

// Pin icon from original sessions.js
const PIN_SVG = <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="8,1.5 9.8,5.8 14.5,6.2 11,9.4 12,14 8,11.5 4,14 5,9.4 1.5,6.2 6.2,5.8"/></svg>;
const UNPIN_SVG = <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><polygon points="8,2 9.8,6.2 14.2,6.2 10.7,9.2 12,13.8 8,11 4,13.8 5.3,9.2 1.8,6.2 6.2,6.2"/></svg>;

interface SessionItemProps {
  session: Session;
  active: boolean;
  onSelect: () => void;
  onPin: () => void;
  onArchive: (archive: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

export default function SessionItem({
  session,
  active,
  onSelect,
  onPin,
  onArchive,
  onDuplicate,
  onDelete,
  onRename,
}: SessionItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleRename = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
    setEditing(false);
  }, [editTitle, session.title, onRename]);

  return (
    <div
      className={`session-item ${active ? 'active' : ''} ${session.pinned ? 'pinned' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onSelect(); }}
    >
      <div className="session-item-icon">
        {session.pinned ? <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="8,1.5 9.8,5.8 14.5,6.2 11,9.4 12,14 8,11.5 4,14 5,9.4 1.5,6.2 6.2,5.8"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
      </div>
      <div className="session-item-body">
        {editing ? (
          <input
            ref={inputRef}
            className="session-rename-input"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setEditing(false); setEditTitle(session.title); }
            }}
            onBlur={handleRename}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="session-item-title">{session.title}</span>
        )}
        <span className="session-item-meta">
          {session.source && session.source !== 'webui' && (
            <span className="session-badge">{session.source}</span>
          )}
          {session.archived && <span className="session-badge archived">Archived</span>}
          {session.message_count !== undefined && (
            <span>{session.message_count} message{session.message_count !== 1 ? 's' : ''}</span>
          )}
        </span>
      </div>
      <div className="session-item-menu" ref={menuRef}>
        <button
          className="btn-icon-sm"
          onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          title="More"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
        {menuOpen && (
          <div className="dropdown-menu">
            <button onClick={e => { e.stopPropagation(); onPin(); setMenuOpen(false); }}>
              {session.pinned ? UNPIN_SVG : PIN_SVG} {session.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={e => { e.stopPropagation(); setEditing(true); setMenuOpen(false); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> Rename
            </button>
            <button onClick={e => { e.stopPropagation(); onDuplicate(); setMenuOpen(false); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Duplicate
            </button>
            <button onClick={e => { e.stopPropagation(); onArchive(!session.archived); setMenuOpen(false); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg> {session.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              className="danger"
              onClick={e => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
