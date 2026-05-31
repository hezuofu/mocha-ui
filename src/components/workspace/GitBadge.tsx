import { useState, useEffect } from 'react';
import { apiGet } from '../../api/client';

export default function GitBadge() {
  const [branch, setBranch] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    apiGet<{ branch: string; dirty: boolean }>('/api/git/status').then((d: unknown) => {
      const s = d as Record<string, unknown>;
      if (s.branch) setBranch(String(s.branch));
      if (s.dirty !== undefined) setDirty(Boolean(s.dirty));
    }).catch(() => {});
  }, []);

  return (
    <span className={`git-badge${dirty ? ' dirty' : ''}`} title={`Git: ${branch || 'unknown'}${dirty ? ' (uncommitted changes)' : ''}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
      {branch && <span style={{ marginLeft: 4 }}>{branch}</span>}
    </span>
  );
}
