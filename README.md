# Hermes WebUI — React Frontend

React + TypeScript + Zustand rewrite of the Hermes WebUI. 54 files, 6,500+ lines of TypeScript/TSX, 4,600+ lines of CSS.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| State | Zustand 5 (5 stores) |
| Routing | React Router 7 |
| Build | Vite 8 |
| CSS | Custom CSS variables (4,600+ lines, 13 skin palettes) |
| Icons | Inline SVG (Lucide-compatible paths) |
| Code Highlight | Prism.js (CDN lazy-load) |
| Math | KaTeX (CDN lazy-load) |
| Diagrams | Mermaid (CDN lazy-load) |
| Terminal | xterm.js (CDN lazy-load) |
| Drawing | Excalidraw (CDN lazy-load) |
| PDF | PDF.js (CDN lazy-load) |
| i18n | React Context (en/zh, 120+ keys) |
| PWA | manifest.json + Service Worker |

## Quick Start

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # Production to dist/
```

Dev server proxies `/api/*` to `http://127.0.0.1:8787` (Python backend).
The complete original app is at `http://localhost:8787`.

## Architecture

```
src/
  App.tsx              # Root: routes, theme sync, layout
  main.tsx             # Entry: ReactDOM, BrowserRouter, PWA, notifications
  types.ts             # Shared types

  api/
    client.ts          # HTTP client (fetch wrapper, CSRF, timeout)
    endpoints.ts       # 50+ typed API endpoint functions
    sse.ts             # EventSource manager (chat + approval SSE)

  store/               # Zustand stores
    sessionStore.ts    # Sessions, messages, streaming, filters, batch
    settingsStore.ts   # User settings, model list
    streamingStore.ts  # Live stream, approval, clarify, compression
    panelStore.ts      # Active panel, sidebar state
    workspaceStore.ts  # File tree, preview, breadcrumbs

  components/
    auth/              # LoginPage
    chat/              # Composer, MainArea, ThinkingBlock, ToolCallCard,
                       # StreamingIndicator, EmptyState, SpecialRenderers,
                       # ComposerTerminal
    layout/            # Titlebar, Rail, Sidebar, Topbar, WorkspacePanel, PanelHead
    panels/            # 15 panel components
    sessions/          # SessionItem, SessionList
    shared/            # Toast, ConfirmDialog
    workspace/         # FileTree, FilePreview, Breadcrumb, GitBadge
    onboarding/        # OnboardingWizard

  hooks/
    useTheme.ts        # Theme/skin/font-size
    useKeyboardShortcuts.ts  # Cmd+K, Cmd+B

  i18n/
    index.tsx          # I18nProvider, useI18n(), en/zh (120+ keys)
```

## Complete Feature List

### Application Shell
- Titlebar with dynamic title/subtitle (session-aware)
- 12-button Rail (Chat/Tasks/Kanban/Skills/Memory/Spaces/Profiles/Todos/Insights/Logs/Dashboard/Settings)
- 11-panel Sidebar with PanelHead titles
- Sidebar collapse (click active panel, localStorage persisted)
- Mobile responsive (overlay sidebar, hamburger menu)
- 13 skin palettes, Dark/Light/System theme, 4 font sizes
- RTL layout support, custom scrollbar
- Toast notifications (success/error/warning/info), Confirm dialog
- Keyboard shortcuts (Cmd+K new chat, Cmd+B toggle sidebar)

### Chat / Messages
- SSE streaming (9 event types: token/tool_call/done/error/thinking/clarify/compression/status)
- Full Markdown (headings/lists/tables/quotes/code/inline formatting)
- Prism.js syntax highlighting, KaTeX math, Mermaid diagrams
- Code blocks with language labels + copy buttons
- Thinking block (collapsible), Tool call cards (expandable)
- Activity group ("Activity: N tools" summary)
- Message actions (Copy/Retry/Edit), TTS speak button
- Smart scroll (pin/unpin hysteresis), Jump to start button
- Empty state with 3 suggestion pills
- Inline renderers: CSV table, Diff viewer, HTML sandbox, PDF (PDF.js), Excalidraw
- Stream fade animation, user bubble styling (data-role attributes)

### Composer
- Auto-resize textarea, Send/Cancel button
- File attach (button + drag-drop + paste), attach tray with chips
- Model picker (grouped by provider), Profile picker, Workspace chip
- Reasoning chip (7 levels), Toolsets chip, Provider quota chip
- YOLO mode pill, Voice mode button, Microphone button (pulse animation)
- Context token bar, Composer status text
- Queue message pill, Background tasks badge
- **32 slash commands** with autocomplete and full execution logic
- Terminal button (xterm.js CDN + SSE backend connection)
- Mobile config panel, Upload progress bar

### 32 Slash Commands
`/help /model /theme /dark /light /system /skin /font /new /clear /stop /retry /undo /voice /yolo /workspace /title /reasoning /compress /compact /status /usage /background /btw /branch /personality /goal /interrupt /steer /queue /skills /language`

All execute immediately. `/language en/zh` switches UI locale.

### Session List
- Time grouping (Today/Yesterday/Earlier), Search with API
- Search hit highlighting, Source filter (All/WebUI/CLI/Msg)
- Archive toggle, Batch select mode
- Context menu (Pin/Rename/Duplicate/Copy ID/Archive/Delete)
- Session timestamps, Streaming/unread/attention indicators
- Message count, Source badges, Archived styling
- Optimistic session creation, Touch swipe gestures

### Approval & Clarify Cards
- 5-button approval (Allow once/session/always, Deny, Skip all) via SSE
- Clarify question + numbered choices + free-text input via SSE

### Panels (15 total)

| Panel | Features |
|---|---|
| CronPanel | CRUD + Pause/Resume + Edit + Run now + Expand details |
| KanbanPanel | 4-column drag-drop + Search + Filter + Dispatcher + Quick actions |
| SkillsPanel | List + Search + Detail + Create + Delete |
| MemoryPanel | Agent/User tabs + Textarea + Save |
| WorkspacesPanel | List + Create + Activate + Delete |
| ProfilesPanel | List + Create + Switch + Delete + Active badge |
| TodosPanel | Add + Toggle complete + Delete |
| InsightsPanel | Period selector (7/30/90/365d) + Data display |
| LogsPanel | File/Tail/Severity/Auto-refresh/Wrap/Copy + Line coloring |
| SettingsPanel | Bot name, Send key, Busy mode, Export MD/JSON, Import, Clear |
| AppearancePanel | Theme grid + Skin grid + Font size grid + Tab visibility |
| PreferencesPanel | Language switcher + **22+ toggle/select settings** |
| ProvidersPanel | Model list + Add API Key + API Quota display |
| PluginsPanel | Plugin list with enabled/disabled badges |
| SystemPanel | Versions, Health, Gateway, MCP, Passkeys, Check updates, Password, Shutdown, Sign out |

### Workspace Panel
- Files/Artifacts tabs, File tree (expand/collapse), Back button
- Right-click menu (Preview/Rename/Copy path/Delete)
- File preview (text/image/binary), File edit mode (Ctrl+S save)
- Download link, Breadcrumb navigation, Hidden files toggle
- Git badge (branch + dirty state from `/api/git/status`)

### Banners & Notifications
- Offline/Reconnect/Agent health banners
- Browser notification permission request
- Update banner (component ready)

### i18n
- React Context (I18nProvider + useI18n hook)
- English / 中文 (120+ keys), Instant UI switch
- Panel titles, Settings menu, Composer, Empty state, Session labels,
  Approval buttons, Composer chips — all translated

### PWA
- manifest.json, Service Worker, Apple touch icon, mobile meta tags

### Onboarding
- 5-step wizard (Welcome/Workspace/Providers/Security/Done)
- Auto-detect via `/api/onboarding/status`

## API Endpoints Used

```
GET  /api/sessions              POST /api/session/new
GET  /api/session/:id           POST /api/session/delete/rename/pin/archive/duplicate
POST /api/sessions/search

POST /api/chat/start            POST /api/chat/send
POST /api/chat/cancel           POST /api/chat/retry/edit
GET  /api/chat/stream (SSE)     GET  /api/approval/stream (SSE)
POST /api/approval/respond

GET  /api/auth/status           POST /api/auth/login/logout
GET  /api/models                GET/POST /api/settings
GET/POST /api/crons + /pause/resume/update/run/delete
GET/POST /api/skills + /content/search/save/delete
GET/POST /api/memory            GET/POST /api/profiles + /switch/create/delete
POST /api/workspace/list/read/write/delete/mkdir/rename
GET/POST /api/workspaces + /activate/create/delete
GET  /api/plugins               GET  /api/git/status
GET  /api/insights              GET  /api/logs
GET  /api/health                GET  /api/health/agent
GET  /api/version               GET  /api/gateway/status
GET  /api/mcp/servers           GET  /api/provider/quota
POST /api/providers/key         POST /api/shutdown
GET/POST /api/onboarding        GET/POST /api/terminal/output
GET/POST /api/kanban/           GET  /api/commands
```

## Developer Notes

- Backend: `python server.py` (port 8787)
- Frontend: `npm run dev` (port 5173, proxies /api → 8787)
- Theme/skin/font sync to backend via `/api/settings`
- Sessions in-memory until first message (backend design)
- i18n in localStorage, CSRF token support
- Build: ~410KB JS (105KB gzip) + ~108KB CSS (20KB gzip)
- 0 TypeScript errors, 72 modules
