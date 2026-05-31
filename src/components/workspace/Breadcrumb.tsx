import { useWorkspaceStore } from '../../store/workspaceStore';
/* All icons replaced with original inline SVGs from static/icons.js */

export default function Breadcrumb() {
  const breadcrumbs = useWorkspaceStore(s => s.breadcrumbs);
  const navigate = useWorkspaceStore(s => s.navigate);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="breadcrumb">
      {breadcrumbs.map((crumb, i) => (
        <span key={crumb.path} className="breadcrumb-item">
          {i > 0 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="breadcrumb-sep"><polyline points="9 18 15 12 9 6"/></svg>}
          {i === 0 ? (
            <button className="breadcrumb-link" onClick={() => navigate(crumb.path)} title="Root">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
          ) : i === breadcrumbs.length - 1 ? (
            <span className="breadcrumb-current">{crumb.name}</span>
          ) : (
            <button className="breadcrumb-link" onClick={() => navigate(crumb.path)}>
              {crumb.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
