import { useState, useRef, useCallback, useEffect } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useStreamingStore } from '../../store/streamingStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { startChat, sendMessage, cancelStream, getProfiles, switchProfile } from '../../api/endpoints';
import { connectSSE, closeSSE } from '../../api/sse';
import type { Profile } from '../../types';
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

  const [showReasoning, setShowReasoning] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [input, setInput] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Message Hermes…"
          rows={1}
          disabled={busy}
        />

        <div className="composer-footer">
          <div className="composer-left">
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
              <button className="composer-reasoning-chip" type="button" onClick={() => setShowReasoning(!showReasoning)} title="Reasoning effort">
                <span className="composer-model-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>
                </span>
                <span className="composer-model-label">Think</span>
                <span className="composer-model-chevron" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
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
