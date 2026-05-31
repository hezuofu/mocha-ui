interface TitlebarProps {
  onToggleMobileSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export default function Titlebar({ onToggleMobileSidebar, title, subtitle }: TitlebarProps) {
  return (
    <header className="app-titlebar" role="banner">
      <button
        className="app-titlebar-hamburger"
        onClick={onToggleMobileSidebar}
        type="button"
        aria-label="Menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="app-titlebar-inner">
        <span className="app-titlebar-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="16" height="16" aria-hidden="true">
            <defs>
              <linearGradient id="app-titlebar-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F5C542" />
                <stop offset="100%" stopColor="#D4961C" />
              </linearGradient>
            </defs>
            <rect x="30" y="10" width="4" height="46" rx="2" fill="url(#app-titlebar-gold)" />
            <path d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20" fill="#F5C542" opacity="0.9" />
            <path d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20" fill="#F5C542" opacity="0.9" />
            <circle cx="32" cy="10" r="4" fill="#F5C542" />
          </svg>
        </span>
        <span className="app-titlebar-title" id="appTitlebarTitle">{title || 'Hermes'}</span>
        <span className="app-titlebar-sub" id="appTitlebarSub" hidden={!subtitle}>{subtitle}</span>
      </div>
      <div className="app-titlebar-spacer" aria-hidden="true" />
      <button
        className="app-titlebar-reload"
        id="btnReload"
        onClick={() => window.location.reload()}
        type="button"
        aria-label="Reload"
        title="Reload page"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
    </header>
  );
}
