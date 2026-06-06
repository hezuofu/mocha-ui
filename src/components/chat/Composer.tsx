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
  const currentWorkspace = useWorkspaceStore(s => s.currentPath);

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
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [customModel, setCustomModel] = useState('');
  const modelChipRef = useRef<HTMLButtonElement>(null);
  const profileChipRef = useRef<HTMLButtonElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [input, setInput] = useState('');

  // Built-in slash commands
  // Full command definitions with handlers
  const commands = [
    { name: '/help', desc: 'Show available commands', action: () => { setInput('/help — Commands: /model /theme /new /clear /stop /retry /undo /voice /yolo /workspace /title /reasoning /compress /status /usage /background /btw /branch /compact /personality /goal /interrupt /steer /queue /skills /dark /light /system /skin /font /language /export /import'); } },
    { name: '/model', desc: 'Switch AI model', action: (arg: string) => { if (arg) saveSettings({ model: arg }); } },
    { name: '/theme', desc: 'Switch theme (dark/light/system)', action: (arg: string) => { if (arg === 'dark' || arg === 'light' || arg === 'system') setTheme(arg); } },
    { name: '/dark', desc: 'Switch to dark theme', action: () => { setTheme('dark'); } },
    { name: '/light', desc: 'Switch to light theme', action: () => { setTheme('light'); } },
    { name: '/system', desc: 'Use system theme', action: () => { setTheme('system'); } },
    { name: '/skin', desc: 'Switch accent skin', action: (arg: string) => { if (arg) setSkin(arg); } },
    { name: '/font', desc: 'Set font size (small/default/large/xlarge)', action: (arg: string) => { if (arg) setFontSize(arg); } },
    { name: '/new', desc: 'Create new conversation', action: () => { createSession(); } },
    { name: '/clear', desc: 'Clear composer input', action: () => { setInput(''); } },
    { name: '/stop', desc: 'Stop current generation', action: () => { if (activeSid && activeStreamId) cancelStream(activeSid, activeStreamId); } },
    { name: '/retry', desc: 'Retry last assistant message', action: () => { import('../../api/endpoints').then(({ retryMessage }) => { if (activeSid) retryMessage(activeSid, -1); }); } },
    { name: '/undo', desc: 'Undo last exchange', action: () => { import('../../api/endpoints').then(({ editAndRegenerate }) => { if (activeSid) editAndRegenerate(activeSid, -1, ''); }); } },
    { name: '/voice', desc: 'Toggle voice input', action: () => { setVoiceActive(!voiceActive); } },
    { name: '/yolo', desc: 'Toggle YOLO mode (auto-approve all)', action: () => { setYoloMode(!yoloMode); } },
    { name: '/workspace', desc: 'Switch workspace path', action: (arg: string) => { if (arg) { import('../../api/endpoints').then(({ listDir }) => { listDir(arg); useWorkspaceStore.getState().navigate(arg); }); } } },
    { name: '/title', desc: 'Rename current session', action: (arg: string) => { if (arg && activeSid) renameSession(activeSid, arg); } },
    { name: '/reasoning', desc: 'Set reasoning effort (none/minimal/low/medium/high/xhigh/max)', action: () => { setShowReasoning(true); } },
    { name: '/compress', desc: 'Compress conversation context', action: () => { import('../../api/endpoints').then(({ getCompressStatus }) => { if (activeSid) getCompressStatus(activeSid); }); } },
    { name: '/compact', desc: 'Alias for /compress', action: () => { import('../../api/endpoints').then(({ getCompressStatus }) => { if (activeSid) getCompressStatus(activeSid); }); } },
    { name: '/status', desc: 'Show session status', action: () => { if (activeSid) import('../../api/endpoints').then(({ getSession }) => { getSession(activeSid); }); } },
    { name: '/usage', desc: 'Show token usage', action: () => { alert(`Tokens: ${contextTokens.toLocaleString()} / ${contextMax.toLocaleString()} (${Math.round((contextTokens / contextMax) * 100)}%)`); } },
    { name: '/background', desc: 'Run prompt in background', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/background', { session_id: activeSid, prompt: arg }); }); } } },
    { name: '/btw', desc: 'Start a by-the-way task', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/btw', { session_id: activeSid, question: arg }); }); } } },
    { name: '/branch', desc: 'Create a branch from current session', action: (arg: string) => { if (activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/session/branch', { session_id: activeSid, title: arg || undefined }); }); } } },
    { name: '/personality', desc: 'Set agent personality', action: (arg: string) => { if (activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/personality/set', { session_id: activeSid, name: arg || '' }); }); } } },
    { name: '/goal', desc: 'Set agent goal', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/goal', { session_id: activeSid, goal: arg }); }); } } },
    { name: '/interrupt', desc: 'Interrupt and send new message', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/chat/steer', { session_id: activeSid, message: arg, mode: 'interrupt' }); }); } } },
    { name: '/steer', desc: 'Steer agent mid-task', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/chat/steer', { session_id: activeSid, message: arg, mode: 'steer' }); }); } } },
    { name: '/queue', desc: 'Queue a message for next turn', action: (arg: string) => { if (arg && activeSid) { import('../../api/client').then(({ apiPost }) => { apiPost('/api/chat/send', { session_id: activeSid, message: arg, stream_id: activeStreamId || 'queue', queue: true }); }); } } },
    { name: '/skills', desc: 'Search and toggle skills', action: (arg: string) => { if (arg) { switchPanel('skills' as PanelId); import('../../api/endpoints').then(({ searchSkills }) => { searchSkills(arg); }); } } },
    { name: '/language', desc: 'Switch UI language', action: (arg: string) => { if (arg) { const { setLocale } = require("../../i18n").useI18n; try { const ctx = document.createElement("div"); ctx.remove(); useI18n().setLocale(arg); } catch {}; saveSettings({ language: arg }) }; } },
    { name: '/export', desc: 'Export session as JSON', action: () => { if (activeSid) { import('../../api/endpoints').then(({ exportSession }) => { exportSession(activeSid, 'json').then(r => { const b = new Blob([r.data], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'session.json'; a.click(); }); }); } } },
    { name: '/import', desc: 'Import session from JSON', action: () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = async () => { const f = inp.files?.[0]; if (f) { const t = await f.text(); import('../../api/endpoints').then(({ importSession }) => { importSession(t).then(() => window.location.reload()); }); } }; inp.click(); } },
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
    const cmd = commands.find(c => c.name === cmdName);
    if (cmd) {
      setInput('');
      setShowCommands(false);
      cmd.action(arg);
      return true;
    }
    return false;
  }, [commands]);

  const applyCommand = useCallback((cmdName: string) => {
    setInput(cmdName + ' ');
    setShowCommands(false);
  }, []);

  const matchingCommands = showCommands
    ? commands.filter(c => c.name.startsWith(input.toLowerCase()))
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
  useEffect(() => {
    const suggestion = consumeSuggestion();
    if (suggestion) {
      setInput(suggestion);
      textareaRef.current?.focus();
    }
  }, [consumeSuggestion]);

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
      const c = await createSession(currentWorkspace || undefined);
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

            {/* Workspace chip */}
            <div className="composer-ws-wrap">
              <div className="composer-workspace-group ws-chip" id="composerWorkspaceGroup" role="group" aria-label="Workspace controls">
                <button className="composer-workspace-files-btn" id="btnWorkspacePanelToggle" type="button" onClick={() => toggleWorkspace()} title="Toggle workspace files panel" aria-label="Toggle workspace files panel">
                  <span className="composer-workspace-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </span>
                </button>
                <button className="composer-workspace-chip" id="composerWorkspaceChip" type="button" onClick={() => toggleWorkspace()} title="Toggle workspace panel">
                  <span className="composer-workspace-label" id="composerWorkspaceLabel">{currentWorkspace === '.' ? 'workspace' : currentWorkspace}</span>
                  <span className="composer-workspace-chevron" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </button>
              </div>
            </div>

            {/* Reasoning chip */}
            <div className="composer-reasoning-wrap">
              <button className={`composer-reasoning-chip${showReasoning ? ' active' : ''}`} type="button" onClick={() => setShowReasoning(!showReasoning)} title="Reasoning effort">
                <span className="composer-model-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>
                </span>
                <span className="composer-model-label">{t('think')}</span>
                <span className="composer-model-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
            </div>

            {/* Toolsets chip */}
            <div className="composer-toolsets-wrap" style={{ display: 'block' }}>
              <button className={`composer-toolsets-chip${showToolsets ? ' active' : ''}`} type="button" onClick={() => setShowToolsets(!showToolsets)} title="Session toolsets">
                <span className="composer-model-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </span>
                <span className="composer-model-label">{t('tools')}</span>
                <span className="composer-model-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
            </div>

            {/* Model chip */}
            <div className="composer-model-wrap" style={{ position: 'relative' }}>
              <button className={`composer-model-chip${modelDropdownOpen ? ' active' : ''}`} id="composerModelChip" type="button"
                ref={modelChipRef}
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)} title="Conversation model">
                <span className="composer-model-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
                </span>
                <span className="composer-model-label" id="composerModelLabel">{model || 'GPT-5.4 Mini'}</span>
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
            <span className="provider-quota-chip" title="API quota available" style={{ display: 'none' }}>
              <span className="provider-quota-chip-dot" />
              <span className="composer-model-label">Quota OK</span>
            </span>

            {/* Mobile config button */}
            <button type="button" className="icon-btn composer-mobile-config-btn has-tooltip"
              onClick={() => setMobileConfigOpen(!mobileConfigOpen)} data-tooltip="Configure"
              style={{ display: 'inline-flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
            </button>
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
                <div className="composer-mobile-config-value" style={{ fontSize: 12, color: 'var(--text)' }}>{currentWorkspace === '.' ? 'default' : currentWorkspace}</div>
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

        {/* Slash command autocomplete */}
        {showCommands && matchingCommands.length > 0 && (
          <div className="model-picker" style={{ left: 16, right: 'auto', minWidth: 260, maxHeight: 300 }}>
            {matchingCommands.map(cmd => (
              <button key={cmd.name} className="model-picker-item" onClick={() => applyCommand(cmd.name)}
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{cmd.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{cmd.desc}</span>
              </button>
            ))}
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
