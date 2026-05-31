import { useWorkspaceStore } from '../../store/workspaceStore';
import type { WorkspaceEntry } from '../../types';
import { useState, useCallback, useRef, useEffect } from 'react';

export default function FileTree() {
  const { entries, currentPath, navigate, preview, previewPath, createFile, createDir, deleteEntry, renameEntry } = useWorkspaceStore();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState<{ parent: string; type: 'file' | 'dir' } | null>(null);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: WorkspaceEntry } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => { if (renaming) renameRef.current?.focus(); }, [renaming]);

  const toggleDir = useCallback(async (entry: WorkspaceEntry) => {
    const key = entry.path;
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    // Navigate into the directory to load its contents
    await navigate(entry.path);
  }, [navigate]);

  const handleCreate = useCallback(async () => {
    if (!newItem || !newName.trim()) return;
    if (newItem.type === 'file') await createFile(newName);
    else await createDir(newName);
    setNewItem(null); setNewName('');
  }, [newItem, newName, createFile, createDir]);

  const handleContextMenu = (e: React.MouseEvent, entry: WorkspaceEntry) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  };

  const handleRename = async (oldPath: string) => {
    if (!renameValue.trim()) { setRenaming(null); return; }
    const parts = oldPath.split('/');
    parts[parts.length - 1] = renameValue.trim();
    await renameEntry(oldPath, renameValue.trim());
    setRenaming(null);
  };

  const handleDelete = async (path: string) => {
    if (confirm(`Delete ${path}?`)) {
      await deleteEntry(path);
    }
    setContextMenu(null);
  };

  const handleCopyPath = async (path: string) => {
    await navigator.clipboard.writeText(path);
    setContextMenu(null);
  };

  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="file-tree">
      <div className="file-tree-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {currentPath !== '.' && (
          <button className="btn-icon-sm" onClick={async () => {
            const parts = currentPath.split('/'); parts.pop();
            const parent = parts.join('/') || '.';
            await navigate(parent);
          }} title="Go up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <span className="file-tree-path">{currentPath}</span>
      </div>
        <div className="file-tree-actions">
          <button className="btn-icon-sm" title="New file" onClick={() => setNewItem({ parent: currentPath, type: 'file' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button className="btn-icon-sm" title="New folder" onClick={() => setNewItem({ parent: currentPath, type: 'dir' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </button>
        </div>
      </div>

      {newItem && (
        <div className="file-tree-new-item">
          <input autoFocus className="file-tree-input" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setNewItem(null); setNewName(''); } }}
            onBlur={handleCreate}
            placeholder={newItem.type === 'file' ? 'filename.ts' : 'folder-name'} />
        </div>
      )}

      <div className="file-tree-list">
        {sorted.map(entry => (
          <div key={entry.path}
            className={`file-tree-item ${entry.type} ${previewPath === entry.path ? 'selected' : ''}`}
            onContextMenu={e => handleContextMenu(e, entry)}>
            <div className="file-tree-item-label"
              onClick={() => entry.type === 'dir' ? toggleDir(entry) : preview(entry.path)}>
              <span className="file-tree-item-icon">
                {entry.type === 'dir' ? (
                  expandedDirs.has(entry.path)
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                ) : null}
                {entry.type === 'dir'
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                }
              </span>
              {renaming === entry.path ? (
                <input ref={renameRef} className="file-tree-input" value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(entry.path); if (e.key === 'Escape') setRenaming(null); }}
                  onBlur={() => handleRename(entry.path)}
                  onClick={e => e.stopPropagation()}
                  style={{ padding: '1px 6px', width: '100%' }} />
              ) : (
                <span className="file-tree-item-name">{entry.name}</span>
              )}
            </div>
          </div>
        ))}
        {sorted.length === 0 && !newItem && <div className="file-tree-empty">Empty directory</div>}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div className="dropdown-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 500 }}>
          {contextMenu.entry.type === 'file' && (
            <button onClick={() => { preview(contextMenu.entry.path); setContextMenu(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Preview
            </button>
          )}
          <button onClick={() => { setRenaming(contextMenu.entry.path); setRenameValue(contextMenu.entry.name); setContextMenu(null); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> Rename
          </button>
          <button onClick={() => handleCopyPath(contextMenu.entry.path)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy path
          </button>
          <button onClick={() => handleDelete(contextMenu.entry.path)} className="danger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg> Delete
          </button>
        </div>
      )}
    </div>
  );
}
