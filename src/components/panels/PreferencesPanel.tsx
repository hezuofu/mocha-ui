import { useSettingsStore } from '../../store/settingsStore';
import { useI18n } from '../../i18n';
import type { Settings } from '../../types';

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="settings-field" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
        {desc && <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginTop: 1 }}>{desc}</span>}
      </div>
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="settings-field">
      <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="settings-field">
      <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>{label}</label>
      <input type="number" value={value} min={min} max={max}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
    </div>
  );
}

export default function PreferencesPanel() {
  const s = useSettingsStore();
  const save = useSettingsStore(st => st.saveSettings);
  const { locale, setLocale } = useI18n();

  return (
    <div className="settings-content" style={{ overflow: 'auto', flex: 1 }}>
      <section className="settings-section">
        <h4>Language</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {['en', 'zh'].map(lang => (
            <button key={lang} onClick={() => setLocale(lang)}
              style={{
                padding: '10px 12px', borderRadius: 8, border: locale === lang ? '2px solid var(--accent)' : '2px solid var(--border)',
                background: locale === lang ? 'var(--accent-bg)' : 'var(--surface-subtle)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: locale === lang ? 'var(--accent-text)' : 'var(--text)',
              }}>{lang === 'en' ? 'English' : '中文'}</button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h4>Chat Behavior</h4>
        <Select label="Send Key" value={s.send_key || 'enter'}
          options={[{ value: 'enter', label: 'Enter' }, { value: 'ctrl_enter', label: 'Ctrl + Enter' }]}
          onChange={v => save({ send_key: v as 'enter' | 'ctrl_enter' })} />
        <Select label="Busy Input Mode" value={s.busy_input_mode || 'queue'}
          options={[{ value: 'queue', label: 'Queue' }, { value: 'interrupt', label: 'Interrupt' }, { value: 'steer', label: 'Steer' }]}
          onChange={v => save({ busy_input_mode: v as Settings['busy_input_mode'] })} />
        <Select label="Sidebar Density" value={(s as unknown as Record<string, unknown>).sidebar_density as string || 'compact'}
          options={[{ value: 'compact', label: 'Compact' }, { value: 'detailed', label: 'Detailed' }]}
          onChange={v => save({ ...s, sidebar_density: v } as Partial<Settings>)} />
        <NumberInput label="Pinned Sessions Limit" value={(s as unknown as Record<string, unknown>).pinned_sessions_limit as number || 3}
          min={0} max={20} onChange={v => save({ ...s, pinned_sessions_limit: v } as Partial<Settings>)} />
      </section>

      <section className="settings-section">
        <h4>Display</h4>
        <Toggle label="Show Token Usage" checked={s.token_display || false} onChange={v => save({ token_display: v })} />
        <Toggle label="Show TPS (Tokens Per Second)" desc="Display streaming speed inline" checked={(s as unknown as Record<string, unknown>).show_tps as boolean || false} onChange={v => save({ ...s, show_tps: v } as Partial<Settings>)} />
        <Toggle label="Show Quota Chip" desc="Provider API quota usage in composer" checked={(s as unknown as Record<string, unknown>).show_quota_chip as boolean || false} onChange={v => save({ ...s, show_quota_chip: v } as Partial<Settings>)} />
        <Toggle label="Fade Text Effect" desc="Smooth fade-in for streamed tokens" checked={(s as unknown as Record<string, unknown>).fade_text_effect as boolean || false} onChange={v => save({ ...s, fade_text_effect: v } as Partial<Settings>)} />
        <Toggle label="Show Thinking" desc="Display agent reasoning blocks" checked={(s as unknown as Record<string, unknown>).show_thinking as boolean !== false} onChange={v => save({ ...s, show_thinking: v } as Partial<Settings>)} />
        <Toggle label="Compact Tool Calling" desc="Simplified tool call display" checked={(s as unknown as Record<string, unknown>).simplified_tool_calling as boolean || false} onChange={v => save({ ...s, simplified_tool_calling: v } as Partial<Settings>)} />
        <Toggle label="Hide Empty State Suggestions" checked={(s as unknown as Record<string, unknown>).hide_empty_state_suggestions as boolean || false} onChange={v => save({ ...s, hide_empty_state_suggestions: v } as Partial<Settings>)} />
        <Toggle label="Session Jump Buttons" desc="Show jump-to-start/end buttons" checked={(s as unknown as Record<string, unknown>).session_jump_buttons as boolean || false} onChange={v => save({ ...s, session_jump_buttons: v } as Partial<Settings>)} />
        <Toggle label="Session Endless Scroll" desc="Auto-load older messages on scroll" checked={(s as unknown as Record<string, unknown>).session_endless_scroll as boolean || false} onChange={v => save({ ...s, session_endless_scroll: v } as Partial<Settings>)} />
        <Toggle label="RTL Layout" desc="Right-to-left chat content" checked={(s as unknown as Record<string, unknown>).rtl as boolean || false} onChange={v => save({ ...s, rtl: v } as Partial<Settings>)} />
      </section>

      <section className="settings-section">
        <h4>Sessions & Data</h4>
        <Toggle label="Show CLI Sessions" checked={s.show_cli_sessions !== false} onChange={v => save({ show_cli_sessions: v })} />
        <Toggle label="Show Previous Messaging Sessions" checked={(s as unknown as Record<string, unknown>).show_previous_messaging_sessions as boolean || false} onChange={v => save({ ...s, show_previous_messaging_sessions: v } as Partial<Settings>)} />
        <Toggle label="API Redact Enabled" desc="Redact sensitive API data in debug views" checked={(s as unknown as Record<string, unknown>).api_redact_enabled as boolean || false} onChange={v => save({ ...s, api_redact_enabled: v } as Partial<Settings>)} />
      </section>

      <section className="settings-section">
        <h4>Updates & Sync</h4>
        <Toggle label="Check for Updates" checked={(s as unknown as Record<string, unknown>).check_for_updates as boolean !== false} onChange={v => save({ ...s, check_for_updates: v } as Partial<Settings>)} />
        <Toggle label="Ignore Agent Updates" desc="Skip agent version notifications" checked={(s as unknown as Record<string, unknown>).ignore_agent_updates as boolean || false} onChange={v => save({ ...s, ignore_agent_updates: v } as Partial<Settings>)} />
        <Toggle label="What's New Summary" desc="Show changelog highlights on update" checked={(s as unknown as Record<string, unknown>).whats_new_summary_enabled as boolean || false} onChange={v => save({ ...s, whats_new_summary_enabled: v } as Partial<Settings>)} />
        <Toggle label="Sync to Insights" checked={(s as unknown as Record<string, unknown>).sync_to_insights as boolean || false} onChange={v => save({ ...s, sync_to_insights: v } as Partial<Settings>)} />
        <Toggle label="Auto Title Refresh" desc="Auto-generate session titles" checked={String((s as unknown as Record<string, unknown>).auto_title_refresh_every || '0') !== '0'} onChange={v => save({ ...s, auto_title_refresh_every: v ? '10' : '0' } as Partial<Settings>)} />
      </section>

      <section className="settings-section">
        <h4>Sound & Notifications</h4>
        <Toggle label="Sound Enabled" desc="Play notification sounds" checked={(s as unknown as Record<string, unknown>).sound_enabled as boolean || false} onChange={v => save({ ...s, sound_enabled: v } as Partial<Settings>)} />
        <Toggle label="Browser Notifications" checked={(s as unknown as Record<string, unknown>).notifications_enabled as boolean || false} onChange={v => save({ ...s, notifications_enabled: v } as Partial<Settings>)} />
      </section>
    </div>
  );
}
