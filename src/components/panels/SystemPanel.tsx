import { useState, useEffect } from 'react';
import { getVersion, getHealth } from '../../api/endpoints';
/* All icons replaced with original inline SVGs from static/icons.js */

export default function SystemPanel() {
  const [version, setVersion] = useState('');
  const [health, setHealth] = useState<Record<string, unknown>>({});

  useEffect(() => {
    getVersion().then(v => setVersion(v.version)).catch(() => {});
    getHealth().then(h => setHealth(h)).catch(() => {});
  }, []);

  return (
    <div className="system-panel">
      <section className="settings-section">
        <h4>System</h4>
        <div className="system-info">
          <div className="info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
            <span>Version</span>
            <span className="info-value">{version || '...'}</span>
          </div>
          <div className="info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>Status</span>
            <span className="info-value">{health.status ? 'Healthy' : '...'}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
