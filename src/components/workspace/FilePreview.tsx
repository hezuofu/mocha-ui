import { useState, useCallback } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { downloadFileUrl } from '../../api/endpoints';

export default function FilePreview() {
  const { previewPath, previewContent, previewType, clearPreview, saveFile, refresh } = useWorkspaceStore();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const startEdit = useCallback(() => { setEditContent(previewContent || ''); setEditing(true); }, [previewContent]);
  const handleSave = useCallback(async () => {
    if (!previewPath) return;
    await saveFile(previewPath, editContent);
    setEditing(false); refresh();
  }, [previewPath, editContent, saveFile, refresh]);

  if (!previewPath) {
    return <div className="file-preview-empty"><p className="text-muted">Select a file to preview</p></div>;
  }

  const fileName = previewPath.split('/').pop() || previewPath;
  const isImage = previewType?.startsWith('image/');
  const isBinary = previewType && !previewType.startsWith('text/') && !isImage;

  return (
    <div className="file-preview">
      <div className="file-preview-header">
        <span className="file-preview-name">{fileName}</span>
        <div className="file-preview-actions">
          {!isBinary && !isImage && (
            <button className="btn-icon-sm" onClick={editing ? handleSave : startEdit} title={editing ? 'Save (Ctrl+S)' : 'Edit'}>
              {editing
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}
            </button>
          )}
          <a href={downloadFileUrl(previewPath)} className="btn-icon-sm" title="Download" download>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
          <button className="btn-icon-sm" onClick={() => { setEditing(false); clearPreview(); }} title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div className="file-preview-content">
        {editing ? (
          <textarea className="msg-edit-area" value={editContent} onChange={e => setEditContent(e.target.value)}
            onKeyDown={e => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave(); } }}
            style={{ width: '100%', minHeight: 200, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, resize: 'vertical' }} />
        ) : isBinary ? (
          <p className="text-muted">Binary file — cannot preview</p>
        ) : isImage ? (
          <img src={downloadFileUrl(previewPath)} alt={fileName} className="preview-image" />
        ) : (
          <pre className="preview-code"><code>{previewContent}</code></pre>
        )}
      </div>
    </div>
  );
}
