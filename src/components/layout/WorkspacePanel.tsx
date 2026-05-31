import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import FileTree from '../workspace/FileTree';
import FilePreview from '../workspace/FilePreview';
import Breadcrumb from '../workspace/Breadcrumb';
import GitBadge from '../workspace/GitBadge';

export default function WorkspacePanel() {
  const workspaceOpen = useWorkspaceStore(s => s.open);
  const setOpen = useWorkspaceStore(s => s.setOpen);
  const navigate = useWorkspaceStore(s => s.navigate);
  const showHidden = useWorkspaceStore(s => s.showHidden);
  const [activeTab, setActiveTab] = useState<'files' | 'artifacts'>('files');
  const [prefsMenuOpen, setPrefsMenuOpen] = useState(false);

  useEffect(() => {
    if (workspaceOpen) navigate('.');
  }, [navigate, workspaceOpen]);

  const toggleHidden = () => {
    useWorkspaceStore.setState(s => ({ showHidden: !s.showHidden }));
    setPrefsMenuOpen(false);
    navigate(useWorkspaceStore.getState().currentPath);
  };

  return (
    <div className={`workspace-panel${workspaceOpen ? '' : ' collapsed'}`}>
      <div className="workspace-panel-header">
        <div className="workspace-panel-title-group">
          <span className="workspace-panel-heading">Workspace</span>
          <Breadcrumb />
          <GitBadge />
        </div>
        <div className="workspace-panel-actions">
          <div style={{ position: 'relative' }}>
            <button
              className="workspace-panel-edge-toggle"
              onClick={() => setPrefsMenuOpen(!prefsMenuOpen)}
              title="Workspace preferences"
              aria-label="Workspace preferences"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            {prefsMenuOpen && (
              <div className="dropdown-menu" style={{ right: 0 }}>
                <button onClick={toggleHidden}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {showHidden ? 'Hide hidden files' : 'Show hidden files'}
                </button>
              </div>
            )}
          </div>
          <button
            className="workspace-panel-edge-toggle"
            onClick={() => setOpen(false)}
            title="Close workspace panel"
            aria-label="Close workspace panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M16 15l-3-3 3-3"/></svg>
          </button>
        </div>
      </div>
      <div className="workspace-panel-tabs" role="tablist">
        <button
          className={`workspace-panel-tab ${activeTab === 'files' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
        <button
          className={`workspace-panel-tab ${activeTab === 'artifacts' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'artifacts'}
          onClick={() => setActiveTab('artifacts')}
        >
          Artifacts <span className="workspace-artifacts-count">0</span>
        </button>
      </div>
      <div className="workspace-panel-body">
        {activeTab === 'files' ? (
          <>
            <FileTree />
            <FilePreview />
          </>
        ) : (
          <div className="panel-empty">No artifacts yet</div>
        )}
      </div>
    </div>
  );
}
