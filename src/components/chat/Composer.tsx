import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSessionStore } from '../../store/sessionStore';
import { useStreamingStore } from '../../store/streamingStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { usePanelStore, type PanelId } from '../../store/panelStore';
import { startChat, sendMessage, cancelStream, getProfiles, switchProfile } from '../../api/endpoints';
import { connectSSE, closeSSE } from '../../api/sse';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import type { Profile } from '../../types';
import ComposerTerminal from './ComposerTerminal';

/* Static fallback models (matching original static/index.html hardcoded defaults) */
const FALLBACK_MODELS = [
  { provider: 'OpenAI', label: 'OpenAI', models: [
    { name: 'openai/gpt-5.4-mini', display_name: 'GPT-5.4 Mini', provider: 'OpenAI' },
    { name: 'openai/gpt-4o', display_name: 'GPT-4o', provider: 'OpenAI' },
    { name: 'openai/o3', display_name: 'o3', provider: 'OpenAI' },
    { name: 'openai/o4-mini', display_name: 'o4-mini', provider: 'OpenAI' },
  ]},
  { provider: 'Anthropic', label: 'Anthropic', models: [
    { name: 'anthropic/claude-sonnet-4.6', display_name: 'Claude Sonnet 4.6', provider: 'Anthropic' },
    { name: 'anthropic/claude-sonnet-4-5', display_name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
    { name: 'anthropic/claude-haiku-3-5', display_name: 'Claude Haiku 3.5', provider: 'Anthropic' },
  ]},
  { provider: 'Other', label: 'Other', models: [
    { name: 'google/gemini-3.1-pro-preview', display_name: 'Gemini 3.1 Pro Preview', provider: 'Google' },
  ]},
];

export default function Composer() {
  const activeSid = useSessionStore(s => s.activeSessionId);
  const busy = useSessionStore(s => s.busy);
  const activeStreamId = useSessionStore(s => s.activeStreamId);
  const pendingFiles = useSessionStore(s => s.pendingFiles);
  const addMessage = useSessionStore(s => s.addMessage);
  const appendToken = useSessionStore(s => s.appendToken);
  const setBusy = useSessionStore(s => s.setBusy);
  const setActiveStreamId = useSessionStore(s => s.setActiveStreamId);
  const updateToolCall = useSessionStore(s => s.updateToolCall);
  const setPendingFiles = useSessionStore(s => s.setPendingFiles);
  const clearPendingFiles = useSessionStore(s => s.clearPendingFiles);
  const consumeSuggestion = useSessionStore(s => s.consumeSuggestion);

  const startStream = useStreamingStore(s => s.startStream);
  const endStream = useStreamingStore(s => s.endStream);

  const model = useSettingsStore(s => s.model);
  const sendKey = useSettingsStore(s => s.send_key);
  const availableModels = useSettingsStore(s => s.availableModels);
  const contextTokens = useStreamingStore(s => s.contextTokens);
  const contextMax = useStreamingStore(s => s.contextMax);

  const toggleWorkspace = useWorkspaceStore(s => s.toggle);
  // ── Workspace label: mirrors original syncWorkspaceDisplays() / getWorkspaceFriendlyName() ──
  const [workspaceLabel, setWorkspaceLabel] = useState('workspace');
  useEffect(() => {
    const update = () => {
      const active = useSessionStore.getState().sessions.find(
        x => x.session_id === useSessionStore.getState().activeSessionId
      );
      const defaultWs = useSettingsStore.getState().default_workspace || '';
      const wsPath = active?.workspace || defaultWs;
      if (!wsPath) { setWorkspaceLabel('no workspace'); return; }
      // Look up friendly name from workspaces list (mirrors getWorkspaceFriendlyName)
      import('../../api/client').then(({ apiGet }) => {
        apiGet<{ workspaces: { name: string; path: string }[] }>('/api/workspaces').then(data => {
          const list = data?.workspaces || [];
          const match = list.find((w: any) => w.path === wsPath);
          if (match?.name) { setWorkspaceLabel(match.name); return; }
          // Fallback: last path segment
          const ws = wsPath.replace(/\\/g, '/');
          const parts = ws.split('/').filter(Boolean);
          setWorkspaceLabel(parts.length > 0 ? parts[parts.length - 1] : wsPath);
        }).catch(() => {
          const ws = wsPath.replace(/\\/g, '/');
          const parts = ws.split('/').filter(Boolean);
          setWorkspaceLabel(parts.length > 0 ? parts[parts.length - 1] : wsPath);
        });
      });
    };
    update(); // initial
    const id = setInterval(update, 5000); // periodic refresh
    return () => clearInterval(id);
  }, []);

  const saveSettings = useSettingsStore(s => s.saveSettings);
  const createSession = useSessionStore(s => s.createSession);
  const renameSession = useSessionStore(s => s.renameSession);
  const switchPanel = usePanelStore(s => s.switchTo);
  const { setTheme, setSkin, setFontSize } = useTheme();
  const { t } = useI18n();

  const [showReasoning, setShowReasoning] = useState(false);
  const [showToolsets, setShowToolsets] = useState(false);
  const [toolsetsInput, setToolsetsInput] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [yoloMode, setYoloMode] = useState(false);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const wsDropdownRef = useRef<HTMLDivElement>(null);
  const [workspaceList, setWorkspaceList] = useState<any[]>([]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [customModel, setCustomModel] = useState('');
  const modelChipRef = useRef<HTMLButtonElement>(null);
  const profileChipRef = useRef<HTMLButtonElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [input, setInput] = useState('');

  // Built-in slash commands (matches original / commands)
  const [skillCommands, setSkillCommands] = useState<{ name: string; desc: string; isSkill?: boolean }[]>([]);

  useEffect(() => {
    // Load skills for slash command autocomplete
    import('../../api/endpoints').then(({ getSkills }) => {
      getSkills().then(data => {
        const skills = (data as any).skills || [];
        setSkillCommands(skills.map((s: any) => ({
          name: '/' + s.name + 'Skill',
          desc: s.description || s.name,
          isSkill: true,
        })));
      }).catch(() => {});
    });
    // Load workspaces for workspace switcher dropdown
    import('../../api/client').then(({ apiGet }) => {
      apiGet<any>('/api/workspaces').then(data => {
        setWorkspaceList(data?.workspaces || []);
      }).catch(() => {});
    });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showWorkspaceDropdown && !showReasoning && !showToolsets) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showWorkspaceDropdown && !target.closest('#composerWorkspaceChip') && !target.closest('#composerWsDropdown')) {
        setShowWorkspaceDropdown(false);
      }
      if (showReasoning && !target.closest('#composerReasoningChip') && !target.closest('#composerReasoningDropdown')) {
        setShowReasoning(false);
      }
      if (showToolsets && !target.closest('#composerToolsetsChip') && !target.closest('#composerToolsetsDropdown')) {
        setShowToolsets(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showWorkspaceDropdown, showReasoning, showToolsets]);

  const builtinCommands = [
    { name: '/help', desc: 'Show available slash commands', action: () => { setInput('/help — Commands: /model /theme /new /clear /stop /retry /undo /voice /yolo /workspace /title /reasoning /compress /status /usage /background /btw /branch /compact /personality /goal /interrupt /steer /queue /skills /dark /light /system /skin /font /language /export /import'); } },
    { name: '/clear', desc: 'Clear conversation messages', action: () => { if (activeSid) { import('../../api/endpoints').then(({ clearConversation }) => { clearConversation(activeSid); }); } } },
    { name: '/compress', desc: 'Manually compress conversation context (usage: /compress [focus topic])', action: () => { import('../../api/endpoints').then(({ getCompressStatus }) => { if (activeSid) getCompressStatus(activeSid); }); } },
    { name: '/compact', desc: 'Alias for /compress', action: () => { import('../../api/endpoints').then(({ getCompressStatus }) => { if (activeSid) getCompressStatus(activeSid); }); } },
    { name: '/model', desc: 'Switch AI model (usage: /model model_name)', action: (arg: string) => { if (arg) saveSettings({ model: arg }); } },
    { name: '/workspace', desc: 'Switch workspace (usage: /workspace name)', action: (arg: string) => { if (arg) { useWorkspaceStore.getState().navigate(arg); } } },
    { name: '/terminal', desc: 'Toggle composer terminal', action: () => { /* terminal toggle */ } },
    { name: '/new', desc: 'Create new conversation', action: () => { createSession(); } },
    { name: '/usage', desc: 'Show token usage for current session', action: () => { alert(`Tokens: ${contextTokens.toLocaleString()} / ${contextMax.toLocaleString()} (${Math.round((contextTokens / contextMax) * 100)}%)`); } },
    { name: '/theme', desc: 'Switch theme (usage: /theme name)', action: (arg: string) => { if (arg === 'dark' || arg === 'light' || arg === 'system') setTheme(arg); } },
    { name: '/dark', desc: 'Switch to dark theme', action: () => { setTheme('dark'); } },
    { name: '/light', desc: 'Switch to light theme', action: () => { setTheme('light'); } },
    { name: '/system', desc: 'Use system theme', action: () => { setTheme('system'); } },
    { name: '/skin', desc: 'Switch accent skin', action: (arg: string) => { if (arg) setSkin(arg); } },
    { name: '/font', desc: 'Set font size (small/default/large/xlarge)', action: (arg: string) => { if (arg) setFontSize(arg); } },
    { name: '/language', desc: 'Switch UI language', action: (arg: string) => { if (arg) saveSettings({ language: arg }); } },
    { name: '/personality', desc: 'Switch agent personality (usage: /personality name)', action: (arg: string) => { if (arg) saveSettings({ bot_name: arg }); } },
    { name: '/skills', desc: 'Search and toggle skills (usage: /skills query)', action: (arg: string) => { if (arg) switchPanel('skills' as PanelId); } },
    { name: '/stop', desc: 'Stop current generation', action: () => { if (activeSid && activeStreamId) cancelStream(activeSid, activeStreamId); } },
    { name: '/goal', desc: 'Set, pause, resume, or clear agent goal (usage: /goal [status|pause|resume|clear|text])', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/goal', { session_id: activeSid, goal: arg }); }); } } },
    { name: '/queue', desc: 'Queue a message for next turn (usage: /queue message)', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/chat/send', { session_id: activeSid, message: arg, queue: true }); }); } } },
    { name: '/interrupt', desc: 'Interrupt and send new message', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/chat/steer', { session_id: activeSid, message: arg, mode: 'interrupt' }); }); } } },
    { name: '/steer', desc: 'Steer agent mid-task', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/chat/steer', { session_id: activeSid, message: arg, mode: 'steer' }); }); } } },
    { name: '/title', desc: 'Rename current session (usage: /title [title])', action: (arg: string) => { if (arg && activeSid) renameSession(activeSid, arg); } },
    { name: '/retry', desc: 'Retry last assistant message', action: () => { if (activeSid) import('../../api/endpoints').then(({ retryMessage }) => { retryMessage(activeSid, -1); }); } },
    { name: '/undo', desc: 'Undo last exchange', action: () => { if (activeSid) import('../../api/endpoints').then(({ editAndRegenerate }) => { editAndRegenerate(activeSid, -1, ''); }); } },
    { name: '/btw', desc: 'Start a by-the-way task (usage: /btw question)', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/btw', { session_id: activeSid, question: arg }); }); } } },
    { name: '/background', desc: 'Run prompt in background (usage: /background prompt)', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/background', { session_id: activeSid, prompt: arg }); }); } } },
    { name: '/status', desc: 'Show session status', action: () => { if (activeSid) import('../../api/endpoints').then(({ getSession }) => { getSession(activeSid); }); } },
    { name: '/voice', desc: 'Toggle voice dictation', action: () => { setVoiceActive(!voiceActive); } },
    { name: '/reasoning', desc: 'Set reasoning effort (usage: /reasoning show|hide|none|minimal|low|medium|high|xhigh|max)', action: () => { setShowReasoning(true); } },
    { name: '/yolo', desc: 'Toggle YOLO mode', action: () => { setYoloMode(!yoloMode); } },
    { name: '/branch', desc: 'Create a git worktree branch (usage: /branch [name])', action: () => {} },
    { name: '/rollback', desc: 'Rollback to previous session state', action: () => {} },
    { name: '/agents', desc: 'List available agent processes', action: () => {} },
    { name: '/whoami', desc: 'Show current user/session info', action: () => {} },
    { name: '/profile', desc: 'Switch active agent profile', action: () => {} },
    { name: '/sessions', desc: 'List recent sessions', action: () => {} },
    { name: '/fast', desc: 'Toggle fast mode', action: () => {} },
    { name: '/insights', desc: 'Open insights panel', action: () => { switchPanel('insights' as PanelId); } },
    { name: '/export', desc: 'Export session as JSON', action: () => { if (activeSid) { import('../../api/endpoints').then(({ exportSession }) => { exportSession(activeSid, 'json'); }); } } },
    { name: '/import', desc: 'Import session from JSON', action: () => { fileInputRef.current?.click(); } },
  ];

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setShowCommands(value.startsWith('/') && !value.includes(' '));
  }, []);

  // Execute a command
  const executeCommand = useCallback((text: string) => {
    const parts = text.split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');
    const cmd = [...builtinCommands, ...skillCommands].find(c => c.name === cmdName);
    if (cmd) {
      setInput('');
      setShowCommands(false);
      cmd.action(arg);
      return true;
    }
    return false;
  }, [builtinCommands, skillCommands]);

  const applyCommand = useCallback((cmdName: string) => {
    setInput(cmdName + ' ');
    setShowCommands(false);
  }, []);

  const allCommands = [...builtinCommands, ...skillCommands];
  const matchingCommands = showCommands
    ? allCommands.filter(c => {
        const q = input.toLowerCase();
        return c.name.toLowerCase().startsWith(q) ||
          // For skills: match without 'Skill' suffix too
          ((c as any).isSkill && c.name.toLowerCase().replace(/skill$/, '').startsWith(q));
      })
    : [];
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const activeProfile = useSessionStore(s => s.activeProfile);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Load profiles for picker
  useEffect(() => {
    getProfiles().then(data => setProfiles(data.profiles || [])).catch(() => {});
  }, []);

  const handleProfileSwitch = useCallback(async (name: string) => {
    try { await switchProfile(name); }
    catch { /* ignore */ }
    setShowProfilePicker(false);
  }, []);

  // Drag-and-drop file support
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (e.dataTransfer?.types.includes('Files')) setIsDragOver(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragOver(false);
      }
    };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      if (!e.dataTransfer) return;
      const files: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i]);
      }
      if (files.length > 0) {
        setPendingFiles([...pendingFiles, ...files]);
      }
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [pendingFiles, setPendingFiles]);

  useEffect(() => {
    if (!busy && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [busy, activeSid]);

  // Consume suggested input from suggestion pills
  const suggestedInput = useSessionStore(s => s.suggestedInput);
  useEffect(() => {
    if (suggestedInput) {
      setInput(suggestedInput);
      textareaRef.current?.focus();
      consumeSuggestion(); // clear after consuming
    }
  }, [suggestedInput, consumeSuggestion]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!modelDropdownOpen && !showProfilePicker) return;
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (modelDropdownOpen && !target.closest('#composerModelDropdown') && !target.closest('#composerModelChip')) {
        setModelDropdownOpen(false);
      }
      if (showProfilePicker && !target.closest('#profileChipWrap') && !target.closest('[id^=\"composerModelDropdown\"]')) {
        // Check if click was on a portal dropdown
        const isProfileDropdown = target.closest('.model-dropdown') && !target.closest('#composerModelDropdown');
        if (!isProfileDropdown) setShowProfilePicker(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [modelDropdownOpen, showProfilePicker]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    if (text.startsWith('/') && executeCommand(text)) return;
    if (busy) return;

    let sid = activeSid;
    if (!sid) {
      // Auto-create session if none active
      const c = await createSession();
      sid = c;
    }

    setInput('');
    setBusy(true);

    try {
      addMessage({ role: 'user', content: text });
      const filePaths = pendingFiles.map(f => f.name);
      clearPendingFiles();
      startStream('');

      const res = await startChat(sid, model, undefined, text);
      const streamId = res.stream_id;
      setActiveStreamId(streamId);
      startStream(streamId);

      connectSSE(activeSid, streamId, (event, data) => {
        try {
          if (event === 'token') {
            appendToken(data);
          } else if (event === 'tool_call') {
            const tc = JSON.parse(data);
            updateToolCall(tc);
          } else if (event === 'done') {
            setBusy(false);
            endStream();
            closeSSE(activeSid);
          } else if (event === 'error' || event === 'connection_error') {
            addMessage({ role: 'system', content: `Error: ${data || 'Connection lost'}` });
            setBusy(false);
            endStream();
            closeSSE(activeSid);
          } else if (event === 'thinking') {
            appendToken(data);
          } else if (event === 'clarify') {
            try {
              const d = typeof data === 'string' ? JSON.parse(data) : data;
              useStreamingStore.getState().showClarify(d.question || '', d.choices || []);
            } catch {}
          } else if (event === 'compression') {
            useStreamingStore.getState().setCompression(true, typeof data === 'string' ? data : 'Compressing...');
          } else if (event === 'status') {
            try {
              const d = typeof data === 'string' ? JSON.parse(data) : data;
              if (d.context_tokens && d.context_max) {
                useStreamingStore.getState().setContext(d.context_tokens, d.context_max);
              }
              if (d.compression === 'done') {
                useStreamingStore.getState().setCompression(false);
              }
            } catch {}
          }
        } catch { /* ignore parse errors */ }
      });
    } catch (err) {
      addMessage({ role: 'system', content: `Failed to send: ${err}` });
      setBusy(false);
      endStream();
    }
  }, [input, activeSid, busy, activeStreamId, model, pendingFiles, addMessage, appendToken, setBusy, setActiveStreamId, updateToolCall, setPendingFiles, clearPendingFiles, startStream, endStream]);

  const handleCancel = useCallback(async () => {
    if (!activeSid || !activeStreamId) return;
    try {
      await cancelStream(activeSid, activeStreamId);
      closeSSE(activeSid);
      setBusy(false);
      endStream();
    } catch { /* ignore */ }
  }, [activeSid, activeStreamId, setBusy, endStream]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (sendKey === 'enter' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (sendKey === 'ctrl_enter' && e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  }, [sendKey, handleSend]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    const itemArray = Array.from(items);
    for (const item of itemArray) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      setPendingFiles([...pendingFiles, ...files]);
    }
  }, [pendingFiles, setPendingFiles]);

  const removeFile = useCallback((idx: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== idx));
  }, [pendingFiles, setPendingFiles]);

  return (
    <div className={`composer-wrap${isDragOver ? ' drag-over' : ''}`}>
      <div className="composer-box">
        {/* Drop hint overlay */}
        <div className="drop-hint">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Drop files to upload to workspace
        </div>

        {/* Attach tray */}
        <div className={`attach-tray${pendingFiles.length > 0 ? ' has-files' : ''}`}>
          {pendingFiles.map((file, i) => (
            <span key={i} className="attach-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              <span className="attach-chip-name">{file.name}</span>
              <button onClick={() => removeFile(i)} aria-label="Remove file">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          ))}
        </div>

        {/* Slash command autocomplete — inside .composer-box, before textarea, matches original #cmdDropdown */}
        {showCommands && matchingCommands.length > 0 && (
          <div className="cmd-dropdown open" id="cmdDropdown">
            {matchingCommands.map((cmd, i) => (
              <div key={cmd.name} className={`cmd-item${i === 0 ? ' selected' : ''}`} data-idx={i}
                onClick={() => { applyCommand(cmd.name); }}>
                <div className="cmd-item-name">
                  {cmd.name}
                  {(cmd as any).isSkill && <span className="cmd-item-badge">skill</span>}
                </div>
                <div className="cmd-item-desc">{cmd.desc}</div>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          id="msg"
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={t("message_placeholder")}
          rows={1}
          disabled={busy}
        />

        <div className="composer-footer">
          <div className="composer-left">
            <ComposerTerminal />
            <input
              ref={fileInputRef}
              type="file"
              id="fileInput"
              className="file-input-visually-hidden"
              multiple
              accept="image/*,text/*,application/pdf,application/json,.md,.py,.js,.ts,.yaml,.yml,.toml,.csv,.sh,.txt,.log,.env,.zip,.tar,.gz"
              onChange={e => {
                if (e.target.files) {
                  setPendingFiles([...pendingFiles, ...Array.from(e.target.files)]);
                }
              }}
            />
            <button type="button" className="icon-btn has-tooltip" id="btnAttach" onClick={() => fileInputRef.current?.click()} data-tooltip="Attach files" title="Attach files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button type="button" className="icon-btn mic-btn has-tooltip" id="btnMic" data-tooltip="Dictate"
              onClick={() => { setMicActive(!micActive); if (!micActive) { setTimeout(() => setMicActive(false), 5000); } }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="1" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
            <button type="button" className="icon-btn voice-mode-btn has-tooltip" id="btnVoiceMode" data-tooltip="Voice mode"
              style={{ display: 'none' }} onClick={() => setVoiceActive(!voiceActive)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10v4"/><path d="M6 6v12"/><path d="M10 3v18"/><path d="M14 8v8"/><path d="M18 5v14"/><path d="M22 10v4"/></svg>
            </button>

            <div className="composer-divider" aria-hidden="true"></div>

            <button className="yolo-pill" style={{ display: 'none' }} onClick={() => setYoloMode(!yoloMode)} title="YOLO mode">
              <span className="yolo-pill-icon">{String.fromCharCode(9889)}</span>
              <span className="yolo-pill-label">YOLO</span>
            </button>

            {/* Profile chip */}
            <div className="composer-profile-wrap" id="profileChipWrap" style={{ position: 'relative' }}>
              <button className={`composer-profile-chip profile-chip${activeProfile && activeProfile !== 'default' ? ' active' : ''}`} id="profileChip" type="button" title="Switch profile"
                ref={profileChipRef}
                onClick={() => setShowProfilePicker(!showProfilePicker)}>
                <span className="composer-profile-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <span className="composer-profile-label" id="profileChipLabel">{activeProfile || 'default'}</span>
                <span className="composer-profile-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              {showProfilePicker && profileChipRef.current && createPortal(
                <div id="profileDropdown" className="profile-dropdown open" style={{
                  position: 'fixed',
                  left: profileChipRef.current.getBoundingClientRect().left,
                  bottom: window.innerHeight - profileChipRef.current.getBoundingClientRect().top + 4,
                  zIndex: 99999,
                }}>
                  {profiles.map(p => {
                    const isActive = p.name === activeProfile;
                    const meta: string[] = [];
                    if ((p as any).model) meta.push((p as any).model.split('/').pop());
                    if ((p as any).skill_count) meta.push(`${(p as any).skill_count} skills`);
                    return (
                      <div key={p.name}
                        className={`profile-opt${isActive ? ' active' : ''}`}
                        onClick={() => { handleProfileSwitch(p.name); setShowProfilePicker(false); }}>
                        <div className="profile-opt-name">
                          <span className={`profile-opt-badge ${(p as any).gateway_running ? 'running' : 'stopped'}`} />
                          {p.name}
                          {(p as any).is_default ? <span style={{ opacity: .5, fontWeight: 400 }}> (default)</span> : null}
                          {isActive && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--link)" strokeWidth="3" style={{ verticalAlign: -1 }}><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                        {meta.length > 0 && <div className="profile-opt-meta">{meta.join(' · ')}</div>}
                      </div>
                    );
                  })}
                  <div className="ws-divider" />
                  <div className="profile-opt ws-manage" onClick={() => { switchPanel('profiles' as PanelId); setShowProfilePicker(false); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>Manage profiles</span>
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Workspace chip — order matches original: ws-wrap → MobileConfigBtn → model-wrap → providerQuotaChip → ReasoningWrap → ToolsetsWrap */}
            <div className="composer-ws-wrap">
              <div className="composer-workspace-group ws-chip" id="composerWorkspaceGroup" role="group" aria-label="Workspace controls">
                <button className="composer-workspace-files-btn" id="btnWorkspacePanelToggle" type="button" onClick={() => toggleWorkspace()} title="Toggle workspace files panel" aria-label="Toggle workspace files panel">
                  <span className="composer-workspace-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </span>
                </button>
                <button className="composer-workspace-chip" id="composerWorkspaceChip" type="button"
                  onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                  title={useSettingsStore.getState().default_workspace || 'Switch workspace'}
                  disabled={!activeSid}>
                  <span className="composer-workspace-label" id="composerWorkspaceLabel">{workspaceLabel}</span>
                  <span className="composer-workspace-chevron" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </button>
              </div>
              {showWorkspaceDropdown && (() => {
                const chip = document.getElementById('composerWorkspaceChip');
                const rect = chip?.getBoundingClientRect();
                const sorted = [...(workspaceList || [])].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
                return createPortal(
                <div ref={wsDropdownRef} className="ws-dropdown ws-dropdown-footer open" id="composerWsDropdown" style={{
                  position: 'fixed',
                  left: rect ? Math.max(0, rect.left - 60) : 0,
                  bottom: rect ? window.innerHeight - rect.top + 4 : 0,
                  zIndex: 99999, minWidth: 320,
                }}>
                  {/* Search row */}
                  <div className="ws-search-row">
                    <input className="ws-search-input" type="text" placeholder="Search workspaces…" spellCheck={false} autoComplete="off"
                      onChange={e => {
                        const term = e.target.value.toLowerCase();
                        const container = document.querySelector('#composerWsDropdown .ws-list-container');
                        if (container) {
                          let visible = 0;
                          container.querySelectorAll('.ws-opt').forEach((opt: any) => {
                            const name = (opt.dataset.name || '').toLowerCase();
                            const path = (opt.dataset.path || '').toLowerCase();
                            const show = !term || name.includes(term) || path.includes(term);
                            (opt as HTMLElement).style.display = show ? '' : 'none';
                            if (show) visible++;
                          });
                          const noRes = document.querySelector('#composerWsDropdown .ws-no-results') as HTMLElement;
                          if (noRes) noRes.style.display = visible ? 'none' : '';
                        }
                      }} />
                    <button className="ws-search-clear" title="Clear search" onClick={(e) => {
                      const inp = (e.target as HTMLElement).parentElement?.querySelector('.ws-search-input') as HTMLInputElement;
                      if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); }
                    }}>✕</button>
                  </div>
                  {/* Workspace list */}
                  <div className="ws-list-container">
                    {sorted.map((ws: any) => (
                      <div key={ws.path} className="ws-opt" data-name={ws.name} data-path={ws.path}
                        onClick={() => {
                          import('../../api/endpoints').then(({ listDir }) => {
                            listDir(ws.path);
                            useWorkspaceStore.getState().navigate(ws.path);
                          });
                          setShowWorkspaceDropdown(false);
                        }}>
                        <span className="ws-opt-name">{ws.name}</span>
                        <span className="ws-opt-path">{ws.path}</span>
                      </div>
                    ))}
                    <div className="ws-no-results" style={{ display: 'none' }}>No workspaces found</div>
                  </div>
                  <div className="ws-divider" />
                  {/* New worktree conversation */}
                  <div className="ws-opt ws-opt-action" onClick={() => { setShowWorkspaceDropdown(false); }}>
                    <span className="ws-opt-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                    </span>
                    <span>
                      <span className="ws-opt-name">New worktree conversation</span>
                      <span className="ws-opt-meta">Isolated git worktree with its own session</span>
                    </span>
                  </div>
                  <div className="ws-divider" />
                  {/* Choose path */}
                  <div className="ws-opt ws-opt-action" onClick={() => { setShowWorkspaceDropdown(false); }}>
                    <span className="ws-opt-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </span>
                    <span>
                      <span className="ws-opt-name">Choose path…</span>
                      <span className="ws-opt-meta">Open any folder on this machine</span>
                    </span>
                  </div>
                  <div className="ws-divider" />
                  {/* Manage */}
                  <div className="ws-opt ws-opt-action" onClick={() => { switchPanel('workspaces' as PanelId); setShowWorkspaceDropdown(false); }}>
                    <span className="ws-opt-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    </span>
                    <span>
                      <span className="ws-opt-name">Manage workspaces</span>
                      <span className="ws-opt-meta">Add, rename, or remove workspace directories</span>
                    </span>
                  </div>
                </div>,
                document.body
                );
              })()}
            </div>

            {/* Mobile config button */}
            <button className="icon-btn composer-mobile-config-btn has-tooltip" id="composerMobileConfigBtn" type="button" onClick={() => setMobileConfigOpen(!mobileConfigOpen)} title="Workspace, model, reasoning, and context settings" aria-label="Workspace, model, reasoning, and context settings" aria-haspopup="true" aria-expanded={mobileConfigOpen}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>

            {/* Model chip */}
            <div className="composer-model-wrap" style={{ position: 'relative' }}>
              <button className={`composer-model-chip${modelDropdownOpen ? ' active' : ''}`} id="composerModelChip" type="button"
                ref={modelChipRef}
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)} title={model || 'Auto'}>
                <span className="composer-model-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
                </span>
                <span className="composer-model-label" id="composerModelLabel">{
                  (() => {
                    const m = model || '';
                    if (m.includes('/')) {
                      const [prov, ...rest] = m.split('/');
                      const provName = prov.charAt(0).toUpperCase() + prov.slice(1);
                      return provName + ': ' + rest.join('/');
                    }
                    return m || 'Auto';
                  })()
                }</span>
                <span className="composer-model-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              {modelDropdownOpen && modelChipRef.current && createPortal(
                <div className="model-dropdown open" id="composerModelDropdown" style={{
                  position: 'fixed',
                  left: modelChipRef.current.getBoundingClientRect().left,
                  bottom: window.innerHeight - modelChipRef.current.getBoundingClientRect().top + 4,
                  zIndex: 99999,
                }}>
                  <div className="model-scope-note">Applies to this conversation from your next message.</div>
                  <div className="model-search-row">
                    <input className="model-search-input" type="text" placeholder="Search models..."
                      spellCheck={false} autoComplete="off" value={modelSearch}
                      onChange={e => setModelSearch(e.target.value)} />
                    <button className="model-search-clear" title="Clear search" onClick={() => setModelSearch('')}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="model-group model-custom-sep">Custom model ID</div>
                  <div className="model-custom-row">
                    <input className="model-custom-input" type="text" placeholder="e.g. openai/gpt-5.4"
                      spellCheck={false} autoComplete="off" value={customModel}
                      onChange={e => setCustomModel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && customModel.trim()) { saveSettings({ model: customModel.trim() }); setModelDropdownOpen(false); setCustomModel(''); } }} />
                    <button className="model-custom-btn" title="Use this model" onClick={() => { if (customModel.trim()) { saveSettings({ model: customModel.trim() }); setModelDropdownOpen(false); setCustomModel(''); } }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>
                  {(availableModels.length > 0 ? availableModels : FALLBACK_MODELS).map(group => {
                    const filtered = group.models.filter((m: any) => {
                      if (!modelSearch) return true;
                      const q = modelSearch.toLowerCase();
                      const label = m.display_name || m.label || m.name || '';
                      const id = m.name || m.id || '';
                      return label.toLowerCase().includes(q) || id.toLowerCase().includes(q);
                    });
                    if (!filtered.length) return null;
                    return (
                      <div key={group.provider}>
                        <div className="model-group">{group.label || group.provider}</div>
                        {filtered.map((m: any) => {
                          const modelId = m.name || m.id;
                          const modelLabel = m.display_name || m.label || modelId;
                          return (
                            <div key={modelId}
                              className={`model-opt${model === modelId ? ' active' : ''}`}
                              onClick={() => { saveSettings({ model: modelId }); setModelDropdownOpen(false); }}>
                              <div className="model-opt-top">
                                <span className="model-opt-name">{modelLabel}</span>
                                <span className="model-opt-provider">{group.label || group.provider}</span>
                              </div>
                              <span className="model-opt-id">{modelId}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>,
                document.body
              )}
              {/* Hidden native select for model state syncing */}
              <select
                id="modelSelect"
                className="composer-model-select"
                title="Conversation model"
                aria-hidden="true"
                tabIndex={-1}
                value={model || ''}
                onChange={e => { saveSettings({ model: e.target.value }); }}
              >
                {(availableModels.length > 0 ? availableModels : FALLBACK_MODELS).map(group => (
                  <optgroup key={group.provider} label={group.label || group.provider}>
                    {group.models.map((m: any) => (
                      <option key={m.name || m.id} value={m.name || m.id}>{m.display_name || m.label || m.name || m.id}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Provider quota chip */}
            <button className="provider-quota-chip" id="providerQuotaChip" title="API quota available" style={{ display: 'none' }}>
              <span className="provider-quota-chip-dot" />
              <span className="provider-quota-chip-label" id="providerQuotaChipLabel">Quota OK</span>
            </button>

            {/* Reasoning chip */}
            <div className="composer-reasoning-wrap" id="composerReasoningWrap" style={{ position: 'relative' }}>
              <button className={`composer-reasoning-chip${showReasoning ? ' active' : ''}`} id="composerReasoningChip" type="button" onClick={() => setShowReasoning(!showReasoning)} title="Reasoning effort level">
                <span className="composer-reasoning-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
                </span>
                <span className="composer-reasoning-label" id="composerReasoningLabel">high</span>
                <span className="composer-reasoning-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              {showReasoning && (() => {
                const chip = document.getElementById('composerReasoningChip');
                const rect = chip?.getBoundingClientRect();
                return createPortal(
                <div className="composer-reasoning-dropdown open" id="composerReasoningDropdown" style={{
                  position: 'fixed',
                  left: rect ? rect.left : 0,
                  bottom: rect ? window.innerHeight - rect.top + 4 : 0,
                  zIndex: 99999,
                }}>
                  {['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].map(effort => (
                    <div key={effort} className="reasoning-option" data-effort={effort}
                      onClick={() => { saveSettings({ reasoning_effort: effort } as any); setShowReasoning(false); }}>
                      {effort === 'xhigh' ? 'Extra High' : effort.charAt(0).toUpperCase() + effort.slice(1)}
                    </div>
                  ))}
                </div>,
                document.body
                );
              })()}
            </div>

            {/* Toolsets chip */}
            <div className="composer-toolsets-wrap" id="composerToolsetsWrap" style={{ display: 'inline-block' }}>
              <button className={`composer-toolsets-chip${showToolsets ? ' active' : ''}`} id="composerToolsetsChip" type="button" onClick={() => setShowToolsets(!showToolsets)} title="Session toolsets">
                <span className="composer-toolsets-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </span>
                <span className="composer-toolsets-label" id="composerToolsetsLabel">Global</span>
                <span className="composer-toolsets-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              {showToolsets && (() => {
                const chip = document.getElementById('composerToolsetsChip');
                const rect = chip?.getBoundingClientRect();
                return createPortal(
                <div className="composer-toolsets-dropdown open" id="composerToolsetsDropdown" style={{
                  position: 'fixed',
                  left: rect ? Math.max(0, rect.right - 260) : 0,
                  bottom: rect ? window.innerHeight - rect.top + 4 : 0,
                  zIndex: 99999, minWidth: 260,
                }}>
                  <div className="toolsets-dropdown-desc" id="toolsetsDropdownDesc"></div>
                  <div className="toolsets-dropdown-state" id="toolsetsDropdownState"></div>
                  <div className="toolsets-dropdown-input-row">
                    <input type="text" id="toolsetsInput" className="toolsets-input" placeholder="" autoComplete="off"
                      value={toolsetsInput} onChange={e => setToolsetsInput(e.target.value)} />
                  </div>
                  <div className="toolsets-dropdown-actions">
                    <button type="button" className="toolsets-action-btn toolsets-apply-btn" id="toolsetsApplyBtn"
                      onClick={() => { setShowToolsets(false); setToolsetsInput(''); }}>Apply</button>
                    <button type="button" className="toolsets-action-btn toolsets-clear-btn" id="toolsetsClearBtn"
                      onClick={() => { setShowToolsets(false); setToolsetsInput(''); }}>Clear (global)</button>
                  </div>
                </div>,
                document.body
                );
              })()}
            </div>
          </div>

          <div className="composer-right">
            <span className="composer-status">{busy ? 'Streaming...' : ''}</span>
            {contextTokens > 0 && (
              <div className="ctx-indicator-wrap">
                <div className="context-usage" title={`${contextTokens.toLocaleString()} / ${contextMax.toLocaleString()} tokens`}>
                  <div className="context-usage-bar">
                    <div className="context-usage-fill" style={{ width: `${Math.min(100, (contextTokens / contextMax) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}
            {busy ? (
              <button className="send-btn cancel has-tooltip has-tooltip--left" id="btnSend" onClick={handleCancel} data-tooltip="Stop" title="Stop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              </button>
            ) : (
              <button className="send-btn has-tooltip has-tooltip--left" id="btnSend" onClick={handleSend} disabled={!input.trim()} data-tooltip="Send message" title="Send message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Mic status indicator */}
        {micActive && (
          <div className="mic-status" style={{ fontSize: 11, color: 'var(--error)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="mic-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--error)', flexShrink: 0 }} />
            Listening...
          </div>
        )}

        {/* Voice mode bar */}
        {voiceActive && (
          <div className="voice-mode-bar" style={{ fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <span className="voice-mode-indicator listening" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>Voice mode active</span>
            <button onClick={() => setVoiceActive(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
        )}

        {/* Mobile config panel */}
        {mobileConfigOpen && (
          <div className="composer-mobile-config-panel open" style={{
            display: 'flex', position: 'absolute', left: 8, right: 8, bottom: 'calc(100% + 6px)',
            zIndex: 180, padding: 8, gap: 8, flexWrap: 'wrap',
            background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12,
            boxShadow: '0 -6px 28px rgba(0,0,0,.35)',
          }}>
            <div className="composer-mobile-config-action" style={{ padding: '8px 10px', borderRadius: 10 }}>
              <div className="composer-mobile-config-copy">
                <div className="composer-mobile-config-kicker" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Workspace</div>
                <div className="composer-mobile-config-value" style={{ fontSize: 12, color: 'var(--text)' }}>{workspaceLabel}</div>
              </div>
            </div>
            <div className="composer-mobile-config-action" style={{ padding: '8px 10px', borderRadius: 10 }}>
              <div className="composer-mobile-config-copy">
                <div className="composer-mobile-config-kicker" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Model</div>
                <div className="composer-mobile-config-value" style={{ fontSize: 12, color: 'var(--text)' }}>{model || 'None'}</div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}

function ModelPickerItem({ model: m, onClose }: { model: { name: string; provider: string; display_name: string }; onClose: () => void }) {
  const settingsModel = useSettingsStore(s => s.model);
  const saveSettings = useSettingsStore(s => s.saveSettings);
  return (
    <button
      className={`model-picker-item ${settingsModel === m.name ? 'active' : ''}`}
      onClick={() => { saveSettings({ model: m.name }); onClose(); }}
    >
      <span>{m.display_name || m.name}</span>
      <span className="model-provider">{m.provider}</span>
    </button>
  );
}
