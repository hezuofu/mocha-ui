import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import FileTree from '../workspace/FileTree';
import FilePreview from '../workspace/FilePreview';
import Breadcrumb from '../workspace/Breadcrumb';
import GitBadge from '../workspace/GitBadge';
import PromptDialog from '../shared/PromptDialog';

export default function WorkspacePanel() {
  const workspaceOpen = useWorkspaceStore(s => s.open);
  const setOpen = useWorkspaceStore(s => s.setOpen);
  const navigate = useWorkspaceStore(s => s.navigate);
  const showHidden = useWorkspaceStore(s => s.showHidden);
  const createFile = useWorkspaceStore(s => s.createFile);
  const createDir = useWorkspaceStore(s => s.createDir);
  const clearPreview = useWorkspaceStore(s => s.clearPreview);
  const wsLoading = useWorkspaceStore(s => s.loading);
  const previewPath = useWorkspaceStore(s => s.previewPath);
  const [activeTab, setActiveTab] = useState<'files' | 'artifacts'>('files');
  const [prefsMenuOpen, setPrefsMenuOpen] = useState(false);
  const [promptDialog, setPromptDialog] = useState<{ kind: 'file' | 'dir' } | null>(null);

  useEffect(() => {
    if (workspaceOpen) navigate('.');
  }, [navigate, workspaceOpen]);

  const toggleHidden = () => {
    useWorkspaceStore.setState(s => ({ showHidden: !s.showHidden }));
    setPrefsMenuOpen(false);
    navigate(useWorkspaceStore.getState().currentPath);
  };

  const handlePromptConfirm = async (value: string) => {
    if (!promptDialog || !value.trim()) { setPromptDialog(null); return; }
    if (promptDialog.kind === 'file') await createFile(value.trim());
    else await createDir(value.trim());
    setPromptDialog(null);
  };

  const handleUpDir = async () => {
    const parts = useWorkspaceStore.getState().currentPath.split('/');
    parts.pop();
    await navigate(parts.join('/') || '.');
  };
  const handleRefresh = () => {
    navigate(useWorkspaceStore.getState().currentPath);
  };

  return (
    <>
      {/* Edge toggle — fixed-position floating pill outside rightpanel. Toggles panel open/close */}
      <button
        className="workspace-panel-edge-toggle has-tooltip has-tooltip--left"
        id="btnWorkspacePanelEdgeToggle"
        onClick={() => useWorkspaceStore.getState().toggle()}
        data-tooltip={workspaceOpen ? "Hide workspace panel" : "Show workspace panel"}
        aria-label={workspaceOpen ? "Hide workspace panel" : "Show workspace panel"}
        aria-expanded={workspaceOpen}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {workspaceOpen
            ? <polyline points="15 18 9 12 15 6"/>
            : <polyline points="9 18 15 12 9 6"/>}
        </svg>
      </button>

      <aside className="rightpanel" data-active-tab={activeTab}>
        <div className="resize-handle" id="rightpanelResize" />
        {/* panel-header: title-group + git-badge + panel-actions */}
        <div className="panel-header">
          <div className="workspace-panel-title-group">
            <span id="workspacePanelHeading" className="workspace-panel-heading">Workspace</span>
          </div>
          <GitBadge />
          <div className="panel-actions">
            {/* Up directory */}
            <button className="panel-icon-btn" id="btnUpDir" onClick={handleUpDir} title="Parent directory" style={{ display: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
            {/* New file */}
            <button className="panel-icon-btn" id="btnNewFile" onClick={() => setPromptDialog({ kind: 'file' })} title="New file">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            {/* New folder */}
            <button className="panel-icon-btn" id="btnNewFolder" onClick={() => setPromptDialog({ kind: 'dir' })} title="New folder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </button>
            {/* Refresh */}
            <button className="panel-icon-btn" id="btnRefreshPanel" onClick={handleRefresh} title="Refresh" disabled={wsLoading}>
              {wsLoading ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              )}
            </button>
            {/* Upload */}
            <button className="panel-icon-btn" id="btnUploadWorkspace" title="Upload file"
              onClick={() => document.getElementById('workspaceFileInput')?.click()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            {/* Preferences kebab */}
            <div style={{ position: 'relative' }}>
              <button className="panel-icon-btn" id="btnWorkspacePrefs" onClick={() => setPrefsMenuOpen(!prefsMenuOpen)} title="Workspace options" aria-label="Workspace options" aria-haspopup="true" aria-expanded={prefsMenuOpen}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              {prefsMenuOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 300, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, padding: 4, minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,.35)' }}>
                  <button onClick={toggleHidden} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, justifyContent: 'flex-start' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {showHidden ? 'Hide hidden files' : 'Show hidden files'}
                  </button>
                </div>
              )}
            </div>
            {/* Close preview / close workspace panel — X button */}
            <button className="panel-icon-btn close-preview" id="btnClearPreview"
              onClick={() => {
                if (previewPath) { clearPreview(); }
                else { useWorkspaceStore.getState().toggle(); }
              }}
              title={previewPath ? "Close preview" : "Close workspace panel"}
              style={!previewPath ? {} : {}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <input type="file" id="workspaceFileInput" className="file-input-visually-hidden" multiple
          accept="image/*,text/*,.pdf,.json,.csv,.md,.py,.js,.ts,.yaml,.yml,.toml,.zip,.tar,.gz,.tgz,.bz2,.xz" />
        <div className="workspace-panel-tabs" role="tablist">
          <button className={`workspace-panel-tab${activeTab === 'files' ? ' active' : ''}`} role="tab" aria-selected={activeTab === 'files'} onClick={() => setActiveTab('files')}>Files</button>
          <button className={`workspace-panel-tab${activeTab === 'artifacts' ? ' active' : ''}`} role="tab" aria-selected={activeTab === 'artifacts'} onClick={() => setActiveTab('artifacts')}>Artifacts <span className="workspace-artifacts-count">0</span></button>
        </div>
        {/* breadcrumb-bar — direct child of rightpanel (rendered by Breadcrumb component) */}
        <Breadcrumb />
        {/* file-tree — FileTree renders its own .file-tree wrapper */}
        <FileTree />
        {/* artifacts */}
        <div className="workspace-artifacts" id="workspaceArtifacts" hidden>
          <div className="workspace-artifact-empty">No artifacts yet</div>
        </div>
        {/* empty state */}
        <div id="wsEmptyState" style={{ display: 'none', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }} />
        {/* preview area — FilePreview renders its own .preview-area wrapper */}
        <FilePreview />
      </aside>
      <PromptDialog
        open={!!promptDialog}
        title={promptDialog?.kind === 'file' ? 'New file' : 'New folder'}
        placeholder={promptDialog?.kind === 'file' ? 'filename.txt' : 'folder-name'}
        confirmLabel="Create"
        onConfirm={handlePromptConfirm}
        onCancel={() => setPromptDialog(null)}
      />
    </>
  );
}
