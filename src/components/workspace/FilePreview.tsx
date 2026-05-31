import { useWorkspaceStore } from '../../store/workspaceStore';
import { downloadFileUrl } from '../../api/endpoints';
/* All icons replaced with original inline SVGs from static/icons.js */

export default function FilePreview() {
  const { previewPath, previewContent, previewType, clearPreview } = useWorkspaceStore();

  if (!previewPath) {
    return (
      <div className="file-preview-empty">
        <p className="text-muted">Select a file to preview</p>
      </div>
    );
  }

  const fileName = previewPath.split('/').pop() || previewPath;
  const isImage = previewType?.startsWith('image/');
  const isBinary = previewType && !previewType.startsWith('text/') && !isImage;

  return (
    <div className="file-preview">
      <div className="file-preview-header">
        <span className="file-preview-name">{fileName}</span>
        <div className="file-preview-actions">
          <a
            href={downloadFileUrl(previewPath)}
            className="btn-icon-sm"
            title="Download"
            download
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
          <button className="btn-icon-sm" onClick={clearPreview} title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div className="file-preview-content">
        {isBinary ? (
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
