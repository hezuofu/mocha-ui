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
    return <div className="preview-area" id="previewArea"><div className="preview-path" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Select a file to preview</div></div>;
  }

  const fileName = previewPath.split('/').pop() || previewPath;
  const isImage = previewType?.startsWith('image/');
  const isBinary = previewType && !previewType.startsWith('text/') && !isImage;
  // Derive badge class
  const getBadge = () => {
    if (isImage) return 'img';
    if (isBinary) return 'code';
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    if (ext === 'md') return 'md';
    if (ext === 'pdf') return 'pdf';
    return 'code';
  };

  return (
    <div className="preview-area visible" id="previewArea">
      <div className="preview-path">
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
        <span className={`preview-badge ${getBadge()}`}>{getBadge()}</span>
        {!isBinary && !isImage && (
          <button className="panel-icon-btn" onClick={editing ? handleSave : startEdit} title={editing ? 'Save (Ctrl+S)' : 'Edit'} style={{ fontSize: 12, width: 'auto', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {editing
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}
            {editing ? 'Save' : 'Edit'}
          </button>
        )}
        <a href={downloadFileUrl(previewPath)} className="panel-icon-btn" title="Download" download style={{ fontSize: 12, width: 'auto', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </a>
        <button className="panel-icon-btn" onClick={() => { setEditing(false); clearPreview(); }} title="Close" style={{ fontSize: 12, width: 'auto', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      {editing ? (
        <textarea style={{ flex: 1, width: '100%', background: 'var(--code-bg)', color: 'var(--pre-text)', border: '1px solid var(--border2)', borderRadius: 8, padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, resize: 'none', outline: 'none' }}
          value={editContent} onChange={e => setEditContent(e.target.value)}
          onKeyDown={e => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave(); } }}
        />
      ) : isBinary ? (
        <p className="text-muted" style={{ padding: '16px 0', color: 'var(--muted)', fontSize: 12 }}>Binary file — cannot preview</p>
      ) : isImage ? (
        <div className="preview-img-wrap">
          <img src={downloadFileUrl(previewPath)} alt={fileName} className="preview-img" />
        </div>
      ) : (
        <pre className="preview-code"><code>{previewContent}</code></pre>
      )}
    </div>
  );
}
