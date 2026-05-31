import { useState, useRef, useCallback, useEffect } from 'react';
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
/* All icons replaced with original inline SVGs from static/index.html */

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
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
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
    { name: '/language', desc: 'Switch UI language', action: (arg: string) => { if (arg) saveSettings({ language: arg }); } },
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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeSid) return;

    // Check if it's a command
    if (text.startsWith('/') && executeCommand(text)) return;

    if (busy) return;

    setInput('');
    setBusy(true);

    try {
      let streamId = activeStreamId;
      if (!streamId) {
        const res = await startChat(activeSid, model);
        streamId = res.stream_id;
        setActiveStreamId(streamId);
      }

      addMessage({ role: 'user', content: text });
      startStream(streamId);

      const filePaths = pendingFiles.map(f => f.name);
      clearPendingFiles();

      await sendMessage(activeSid, text, streamId, filePaths.length > 0 ? filePaths : undefined);

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

  if (!activeSid) return null;

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
            <button type="button" className="icon-btn" id="btnAttach" onClick={() => fileInputRef.current?.click()} title="Attach files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>

            <div className="composer-divider" aria-hidden="true"></div>

            {/* Profile chip */}
            <div className="composer-profile-wrap" id="profileChipWrap" style={{ position: 'relative' }}>
              <button className={`composer-profile-chip profile-chip${activeProfile && activeProfile !== 'default' ? ' active' : ''}`} id="profileChip" type="button" title="Switch profile" onClick={() => setShowProfilePicker(!showProfilePicker)}>
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
              {showProfilePicker && (
                <div className="model-picker" style={{ minWidth: 180 }}>
                  {profiles.map(p => (
                    <button
                      key={p.name}
                      className={`model-picker-item ${p.name === activeProfile ? 'active' : ''}`}
                      onClick={() => handleProfileSwitch(p.name)}
                    >
                      <span>{p.name}</span>
                      {p.active && <span className="model-provider">active</span>}
                    </button>
                  ))}
                </div>
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
                <span className="composer-model-label">Think</span>
                <span className="composer-model-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              {showReasoning && (
                <div className="model-picker" style={{ minWidth: 140, left: 0 }}>
                  {['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].map(level => (
                    <button key={level} className="model-picker-item" onClick={() => setShowReasoning(false)}>
                      <span style={{ textTransform: 'capitalize' }}>{level}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toolsets chip */}
            <div className="composer-toolsets-wrap" style={{ display: 'block' }}>
              <button className={`composer-toolsets-chip${showToolsets ? ' active' : ''}`} type="button" onClick={() => setShowToolsets(!showToolsets)} title="Session toolsets">
                <span className="composer-model-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </span>
                <span className="composer-model-label">Tools</span>
                <span className="composer-model-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              {showToolsets && (
                <div className="model-picker" style={{ minWidth: 260, left: 0, padding: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Enter a comma-separated list of toolsets to enable for this session.</div>
                  <input className="memory-textarea" style={{ padding: '8px 10px', minHeight: 'auto', marginBottom: 10, width: '100%', boxSizing: 'border-box' }}
                    value={toolsetsInput} onChange={e => setToolsetsInput(e.target.value)}
                    placeholder="e.g. python, shell, file_ops" />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn-icon-sm" onClick={() => { setToolsetsInput(''); setShowToolsets(false); }} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px', fontSize: 12 }}>Clear</button>
                    <button className="btn-primary-sm" onClick={() => setShowToolsets(false)}>Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Provider quota chip */}
            <div className="composer-model-wrap">
              <span className="provider-quota-chip" title="API quota available">
                <span className="provider-quota-chip-dot" />
                <span className="composer-model-label">Quota OK</span>
              </span>
            </div>

            {/* Model chip */}
            <div className="composer-model-wrap">
              <button className="composer-model-chip" id="composerModelChip" type="button" onClick={() => setShowModelPicker(!showModelPicker)} title="Conversation model">
                <span className="composer-model-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
                </span>
                <span className="composer-model-label" id="composerModelLabel">{model}</span>
                <span className="composer-model-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
            </div>
          </div>

          <div className="composer-right">
            <span className="composer-status" style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {busy ? 'Streaming...' : ''}
            </span>
            <span className="queue-pill-outer show" style={{ display: 'none', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent-text)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              <span className="queue-pill-count">0</span>
            </span>
            <span className="bg-badge" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--accent-bg-strong)', color: 'var(--accent-text)', fontSize: 10, fontWeight: 600 }}>0</span>
            {yoloMode && (
              <span className="yolo-pill" onClick={() => setYoloMode(false)} title="Disable YOLO mode">
                <span className="yolo-pill-icon">⚡</span>
                <span className="yolo-pill-label">YOLO</span>
              </span>
            )}
            <button type="button" className={`icon-btn mic-btn${micActive ? ' recording' : ''}`}
              onClick={() => { setMicActive(!micActive); if (!micActive) { setTimeout(() => setMicActive(false), 5000); } }}
              title={micActive ? 'Stop recording' : 'Voice dictation'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
            <button type="button" className="icon-btn composer-mobile-config-btn"
              onClick={() => setMobileConfigOpen(!mobileConfigOpen)} title="Configure"
              style={{ display: 'inline-flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
            </button>
            <button type="button" className={`icon-btn voice-mode-btn${voiceActive ? ' active' : ''}`} onClick={() => setVoiceActive(!voiceActive)} title="Voice mode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10v4"/><path d="M6 6v12"/><path d="M10 3v18"/><path d="M14 8v8"/><path d="M18 5v14"/><path d="M22 10v4"/></svg>
            </button>
            {contextTokens > 0 && (
              <div className="context-usage" title={`${contextTokens.toLocaleString()} / ${contextMax.toLocaleString()} tokens`}>
                <div className="context-usage-bar">
                  <div className="context-usage-fill" style={{ width: `${Math.min(100, (contextTokens / contextMax) * 100)}%` }} />
                </div>
                <span>{Math.round((contextTokens / contextMax) * 100)}%</span>
              </div>
            )}
            {busy ? (
              <button className="send-btn cancel" id="btnSend" onClick={handleCancel} title="Stop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              </button>
            ) : (
              <button
                className="send-btn"
                id="btnSend"
                onClick={handleSend}
                disabled={!input.trim()}
                title="Send message"
              >
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

        {showModelPicker && (
          <div className="model-picker">
            {availableModels.length > 0 ? availableModels.map(group => (
              <div key={group.provider}>
                <div className="model-picker-group-label">{group.label || group.provider}</div>
                {group.models.map(m => (
                  <ModelPickerItem key={m.name} model={m} onClose={() => setShowModelPicker(false)} />
                ))}
              </div>
            )) : (
              <div className="panel-empty" style={{ padding: 12 }}>No models loaded</div>
            )}
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
