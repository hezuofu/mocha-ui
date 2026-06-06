import { useState, useEffect } from 'react';

export default function GitBadge() {
  const [branch, setBranch] = useState('');

  useEffect(() => {
    // Git status is optional — silently ignore failures
    fetch('/api/git/status').then(r => r.json().catch(() => null)).then((d: any) => {
      if (d?.branch) setBranch(String(d.branch));
    }).catch(() => {});
  }, []);

  if (!branch) return <span className="git-badge" id="gitBadge" style={{ display: 'none' }} />;

  return (
    <span className="git-badge" id="gitBadge" title={`Git: ${branch}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
      <span style={{ marginLeft: 4 }}>{branch}</span>
    </span>
  );
}
