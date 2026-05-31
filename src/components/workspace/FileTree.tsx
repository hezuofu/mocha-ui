import { useWorkspaceStore } from '../../store/workspaceStore';
import type { WorkspaceEntry } from '../../types';
import { useState, useCallback } from 'react';
/* All icons replaced with original inline SVGs from static/icons.js */

export default function FileTree() {
  const { entries, currentPath, navigate, preview, previewPath, createFile, createDir } = useWorkspaceStore();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState<{ parent: string; type: 'file' | 'dir' } | null>(null);
  const [newName, setNewName] = useState('');

  const toggleDir = useCallback(async (entry: WorkspaceEntry) => {
    const key = entry.path;
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        navigate(entry.path);
      }
      return next;
    });
  }, [navigate]);

  const handleCreate = useCallback(async () => {
    if (!newItem || !newName.trim()) return;
    if (newItem.type === 'file') {
      await createFile(newName);
    } else {
      await createDir(newName);
    }
    setNewItem(null);
    setNewName('');
  }, [newItem, newName, createFile, createDir]);

  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="file-tree">
      <div className="file-tree-toolbar">
        <span className="file-tree-path">{currentPath}</span>
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
          <input
            autoFocus
            className="file-tree-input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setNewItem(null); setNewName(''); }
            }}
            onBlur={handleCreate}
            placeholder={newItem.type === 'file' ? 'filename.ts' : 'folder-name'}
          />
        </div>
      )}

      <div className="file-tree-list">
        {sorted.map(entry => (
          <div
            key={entry.path}
            className={`file-tree-item ${entry.type} ${previewPath === entry.path ? 'selected' : ''}`}
          >
            <div
              className="file-tree-item-label"
              onClick={() => {
                if (entry.type === 'dir') {
                  toggleDir(entry);
                } else {
                  preview(entry.path);
                }
              }}
            >
              <span className="file-tree-item-icon">
                {entry.type === 'dir' ? (
                  expandedDirs.has(entry.path) ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                ) : null}
                {entry.type === 'dir' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>}
              </span>
              <span className="file-tree-item-name">{entry.name}</span>
            </div>
          </div>
        ))}
        {sorted.length === 0 && !newItem && (
          <div className="file-tree-empty">Empty directory</div>
        )}
      </div>
    </div>
  );
}
