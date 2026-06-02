import { useSettingsStore } from '../../store/settingsStore';
import type { Settings } from '../../types';
import { useState, useEffect } from 'react';
import { apiGet } from '../../api/client';

interface ModelGroup { provider?: string; provider_id?: string; models?: { id: string; label?: string }[] }

const AUX_TASKS = [
  { key: 'vision', label: 'Vision', desc: 'image/screenshot analysis' },
  { key: 'compression', label: 'Compression', desc: 'context summarization' },
  { key: 'web_extract', label: 'Web extract', desc: 'web page summarization' },
  { key: 'session_search', label: 'Session search', desc: 'past-conversation recall' },
  { key: 'approval', label: 'Approval', desc: 'smart command approval' },
  { key: 'mcp', label: 'MCP', desc: 'MCP tool reasoning' },
  { key: 'title_generation', label: 'Title generation', desc: 'session titles' },
  { key: 'skills_hub', label: 'Skills hub', desc: 'skills search/install' },
];

export default function PreferencesPanel() {
  const s = useSettingsStore();
  const save = useSettingsStore(st => st.saveSettings);
  const [models, setModels] = useState<{ id: string; label: string }[][]>([[], []]);

  useEffect(() => {
    apiGet<{ groups?: ModelGroup[] }>('/api/models').then(data => {
      const providers: string[] = [];
      const modelOpts: { id: string; label: string }[] = [];
      const groups = data?.groups || [];
      for (const g of groups) {
        if (g.provider_id) providers.push(g.provider_id);
        for (const m of (g.models || [])) {
          if (m.id) modelOpts.push({ id: m.id, label: m.label || m.id });
        }
      }
      setModels([providers.map(p => ({ id: p, label: p })), modelOpts]);
    }).catch(() => {});
  }, []);

  const [providerOpts, modelOpts] = models;

  const renderModelSelect = (value: string | undefined, onChange: (v: string) => void, id: string) => (
    <select id={id} value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '6px 8px', background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
      <option value="">auto (use provider default)</option>
      {modelOpts.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
    </select>
  );

  const renderProviderSelect = (value: string | undefined, onChange: (v: string) => void, id: string) => (
    <select id={id} value={value || 'auto'} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '6px 8px', background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
      <option value="auto">auto (use main model)</option>
      {providerOpts.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
    </select>
  );

  const auxSettings = (s as unknown as Record<string, unknown>).aux_models as Record<string, { provider?: string; model?: string }> || {};

  return (
    <>
      <div className="settings-section-head">
        <div>
          <div className="settings-section-title">Preferences</div>
          <div className="settings-section-meta">Defaults and UI behavior for Hermes Web UI.</div>
        </div>
      </div>

      {/* ── Default Model ── */}
      <div className="settings-field">
        <label htmlFor="settingsModel">Default Model</label>
        <select id="settingsModel" value={s.default_model || ''}
          onChange={e => save({ default_model: e.target.value })}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6 }}>
          <option value="">Inherit from provider / active profile</option>
          {modelOpts.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Used for new conversations. Existing conversations keep their selected model.</div>
      </div>

      {/* ── Auxiliary Models ── */}
      <div className="settings-field">
        <label>Auxiliary Models</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Side-task routing for vision, compression, title generation, etc. "Auto" uses your main chat model.</div>
        <div id="auxModelsContainer">
          {AUX_TASKS.map(task => {
            const cfg = auxSettings[task.key] || {};
            return (
              <div key={task.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
                  {task.label}
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>{task.desc}</div>
                </div>
                {renderProviderSelect(cfg.provider, v => {
                  const updated = { ...auxSettings, [task.key]: { ...cfg, provider: v === 'auto' ? '' : v } };
                  save({ ...s, aux_models: updated } as Partial<Settings>);
                }, `aux-prov-${task.key}`)}
                {renderModelSelect(cfg.model, v => {
                  const updated = { ...auxSettings, [task.key]: { ...cfg, model: v } };
                  save({ ...s, aux_models: updated } as Partial<Settings>);
                }, `aux-model-${task.key}`)}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hide new-chat suggestions ── */}
      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, hide_empty_state_suggestions: !(s as any).hide_empty_state_suggestions } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).hide_empty_state_suggestions} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Hide new-chat suggestions</span>
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Removes the grid of example prompts shown on the empty chat screen.</div>
      </div>

      {/* ── Send Key ── */}
      <div className="settings-field">
        <label htmlFor="settingsSendKey">Send Key</label>
        <select id="settingsSendKey" value={s.send_key || 'enter'}
          onChange={e => save({ send_key: e.target.value as 'enter' | 'ctrl_enter' })}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }}>
          <option value="enter">Enter</option>
          <option value="ctrl_enter">Ctrl + Enter</option>
        </select>
      </div>

      {/* ── Language ── */}
      <div className="settings-field">
        <label htmlFor="settingsLanguage">Language</label>
        <select id="settingsLanguage" value={s.language || 'en'}
          onChange={e => save({ language: e.target.value } as Partial<Settings>)}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }}>
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>

      {/* ── RTL ── */}
      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, rtl: !(s as any).rtl } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).rtl} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Right-to-left chat layout</span>
        </label>
      </div>

      {/* ── Sound & Voice ── */}
      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, sound_enabled: !(s as any).sound_enabled } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).sound_enabled} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Notification sound</span>
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Play a brief chime when a server push notification is received.</div>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, tts_enabled: !(s as any).tts_enabled } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).tts_enabled} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Text-to-Speech for responses</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, auto_read_aloud: !(s as any).auto_read_aloud } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).auto_read_aloud} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Auto-read responses aloud</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, hands_free_voice: !(s as any).hands_free_voice } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).hands_free_voice} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Hands-free voice mode button</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, voice_raw_audio: !(s as any).voice_raw_audio } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).voice_raw_audio} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Send raw audio instead of transcribing</span>
        </label>
      </div>

      <div className="settings-field">
        <label>Voice</label>
        <select value={(s as any).voice || ''} onChange={e => save({ ...s, voice: e.target.value } as Partial<Settings>)}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }}>
          <option value="">Default</option>
        </select>
      </div>

      <div className="settings-field">
        <label htmlFor="settingsSpeechRate">Speech rate</label>
        <input type="range" id="settingsSpeechRate" min="0.5" max="2" step="0.1" value={(s as any).speech_rate || 1}
          onChange={e => save({ ...s, speech_rate: parseFloat(e.target.value) } as Partial<Settings>)}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{(s as any).speech_rate || 1}x</span>
      </div>

      <div className="settings-field">
        <label htmlFor="settingsSpeechPitch">Speech pitch</label>
        <input type="range" id="settingsSpeechPitch" min="0.5" max="2" step="0.1" value={(s as any).speech_pitch || 1}
          onChange={e => save({ ...s, speech_pitch: parseFloat(e.target.value) } as Partial<Settings>)}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{(s as any).speech_pitch || 1}x</span>
      </div>

      {/* ── Browser notifications ── */}
      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, notifications_enabled: !(s as any).notifications_enabled } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).notifications_enabled} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Browser notifications</span>
        </label>
      </div>

      {/* ── Display ── */}
      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ token_display: !s.token_display })}>
          <input type="checkbox" checked={s.token_display || false} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Show token usage</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, show_quota_chip: !(s as any).show_quota_chip } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).show_quota_chip} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Show provider quota chip in composer</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, show_tps: !(s as any).show_tps } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).show_tps} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Show token speed (TPS)</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, fade_text_effect: !(s as any).fade_text_effect } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).fade_text_effect} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Fade text effect</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, simplified_tool_calling: !(s as any).simplified_tool_calling } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).simplified_tool_calling} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Compact tool activity</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, api_redact_enabled: !(s as any).api_redact_enabled } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).api_redact_enabled} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Redact sensitive data in API responses</span>
        </label>
      </div>

      <div className="settings-field">
        <label htmlFor="settingsSidebarDensity">Sidebar density</label>
        <select id="settingsSidebarDensity" value={(s as any).sidebar_density || 'compact'}
          onChange={e => save({ ...s, sidebar_density: e.target.value } as Partial<Settings>)}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }}>
          <option value="compact">Compact</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>

      <div className="settings-field">
        <label htmlFor="settingsPinnedLimit">Pinned conversations limit</label>
        <input type="number" id="settingsPinnedLimit" min={0} max={20} value={(s as any).pinned_sessions_limit || 3}
          onChange={e => save({ ...s, pinned_sessions_limit: Number(e.target.value) } as Partial<Settings>)}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }} />
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" id="settingsAutoTitleRefresh" checked={String((s as any).auto_title_refresh_every || '0') !== '0'} onChange={e => save({ ...s, auto_title_refresh_every: e.target.checked ? '10' : '0' } as Partial<Settings>)}
            style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Adaptive title refresh</span>
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Auto-generate session titles from conversation content (every 10 messages).</div>
      </div>

      {/* ── Busy Input Mode ── */}
      <div className="settings-field">
        <label htmlFor="settingsBusyMode">Busy input mode</label>
        <select id="settingsBusyMode" value={s.busy_input_mode || 'queue'}
          onChange={e => save({ busy_input_mode: e.target.value as Settings['busy_input_mode'] })}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }}>
          <option value="queue">Queue</option>
          <option value="interrupt">Interrupt</option>
          <option value="steer">Steer</option>
        </select>
      </div>

      {/* ── Sessions ── */}
      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ show_cli_sessions: s.show_cli_sessions === false ? true : false })}>
          <input type="checkbox" checked={s.show_cli_sessions !== false} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Show non-WebUI sessions</span>
        </label>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, show_previous_messaging_sessions: !(s as any).show_previous_messaging_sessions } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).show_previous_messaging_sessions} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Show previous messaging sessions</span>
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Show older Discord, Telegram, Slack, and Weixin sessions that were replaced by reset or compression.</div>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, sync_to_insights: !(s as any).sync_to_insights } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).sync_to_insights} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Sync to insights</span>
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Mirrors WebUI token usage to state.db so hermes /insights includes browser session data. Off by default.</div>
      </div>

      {/* ── Updates ── */}
      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, check_for_updates: !(s as any).check_for_updates } as Partial<Settings>)}>
          <input type="checkbox" checked={(s as any).check_for_updates !== false} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Check for updates</span>
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Show a banner when newer versions of the WebUI or Agent are available. Runs a background git fetch periodically.</div>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, ignore_agent_updates: !(s as any).ignore_agent_updates } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).ignore_agent_updates} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Ignore Agent updates</span>
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Keep WebUI update checks on, but hide Agent update notices and skip Agent update fetches.</div>
      </div>

      <div className="settings-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => save({ ...s, whats_new_summary_enabled: !(s as any).whats_new_summary_enabled } as Partial<Settings>)}>
          <input type="checkbox" checked={!!(s as any).whats_new_summary_enabled} readOnly style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
          <span>Summarize What's New with AI</span>
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Changes the What's New action from opening the raw diff first to generating a short, human-readable summary.</div>
      </div>

      {/* ── Bot Name ── */}
      <div className="settings-field">
        <label htmlFor="settingsBotName">Default assistant name</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Used for the default profile only. Other profiles use their own profile names.</div>
        <input type="text" id="settingsBotName" placeholder="Hermes" maxLength={64} value={s.bot_name || ''}
          onChange={e => save({ bot_name: e.target.value })}
          style={{ width: '100%', padding: 8, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13 }} />
      </div>

      {/* ── Save ── */}
      <button className="sm-btn" onClick={() => { /* auto-save */ }}
        style={{ marginTop: 12, width: '100%', padding: '9px 16px', fontWeight: 600, fontSize: 13, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)', borderRadius: 8 }}>
        Save Settings
      </button>
      <div className="settings-autosave-status" id="settingsPreferencesAutosaveStatus" aria-live="polite"></div>
    </>
  );
}
