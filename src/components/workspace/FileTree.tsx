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

  const iconSvg = (name: string, type: 'file' | 'dir') => {
    if (type === 'dir') {
      return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
    }
    // File icon
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  };

  return (
    <div className="file-tree" id="fileTree">
      {/* Toolbar — matches original panel-header actions; styled with panel-icon-btn */}
      <div className="file-tree-toolbar" style={{ display: 'none' }}>
        {currentPath !== '.' && (
          <button className="panel-icon-btn" onClick={async () => {
            const parts = currentPath.split('/'); parts.pop();
            const parent = parts.join('/') || '.';
            await navigate(parent);
          }} title="Go up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <span className="file-tree-path" style={{ flex: 1, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{currentPath}</span>
        <button className="panel-icon-btn" title="New file" onClick={() => setNewItem({ parent: currentPath, type: 'file' })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button className="panel-icon-btn" title="New folder" onClick={() => setNewItem({ parent: currentPath, type: 'dir' })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
        </button>
      </div>

      {newItem && (
        <div className="file-tree-new-item" style={{ padding: '2px 0 4px 0' }}>
          <input autoFocus className="file-rename-input" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setNewItem(null); setNewName(''); } }}
            onBlur={handleCreate}
            placeholder={newItem.type === 'file' ? 'filename.ts' : 'folder-name'}
            style={{ width: '100%' }} />
        </div>
      )}

      {sorted.map(entry => {
        const isExpanded = entry.type === 'dir' && expandedDirs.has(entry.path);
        return (
          <div key={entry.path}
            className={`file-item ${previewPath === entry.path ? 'active' : ''}`}
            style={{ paddingLeft: '8px' }}
            onContextMenu={e => handleContextMenu(e, entry)}>
            {/* Toggle arrow for dirs, placeholder spacer for files */}
            {entry.type === 'dir' ? (
              <span className="file-tree-toggle" onClick={() => toggleDir(entry)}>
                {isExpanded ? '▾' : '▸'}
              </span>
            ) : (
              <span className="file-tree-toggle-placeholder" aria-hidden="true" />
            )}
            {/* Icon */}
            <span className="file-icon"
              onClick={() => entry.type === 'dir' ? toggleDir(entry) : preview(entry.path)}
              dangerouslySetInnerHTML={{ __html: iconSvg(entry.name, entry.type) }} />
            {/* Name */}
            {renaming === entry.path ? (
              <input ref={renameRef} className="file-rename-input" value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(entry.path); if (e.key === 'Escape') setRenaming(null); }}
                onBlur={() => handleRename(entry.path)}
                onClick={e => e.stopPropagation()}
                style={{ padding: '1px 4px', flex: '1 1 0', minWidth: 0 }} />
            ) : (
              <span className="file-name"
                onClick={() => entry.type === 'dir' ? toggleDir(entry) : preview(entry.path)}
                title={entry.type !== 'dir' ? 'Double-click to rename' : undefined}>
                {entry.name}
              </span>
            )}
          </div>
        );
      })}
      {sorted.length === 0 && !newItem && <div className="file-item file-empty">Empty directory</div>}

      {/* Context menu */}
      {contextMenu && (
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 500, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, padding: 4, minWidth: 140, boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
          {contextMenu.entry.type === 'file' && (
            <button className="panel-icon-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, justifyContent: 'flex-start' }}
              onClick={() => { preview(contextMenu.entry.path); setContextMenu(null); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Preview
            </button>
          )}
          <button className="panel-icon-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, justifyContent: 'flex-start' }}
            onClick={() => { setRenaming(contextMenu.entry.path); setRenameValue(contextMenu.entry.name); setContextMenu(null); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> Rename
          </button>
          <button className="panel-icon-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, justifyContent: 'flex-start' }}
            onClick={() => handleCopyPath(contextMenu.entry.path)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy path
          </button>
          <button className="panel-icon-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 12, justifyContent: 'flex-start' }}
            onClick={() => handleDelete(contextMenu.entry.path)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg> Delete
          </button>
        </div>
      )}
    </div>
  );
}
