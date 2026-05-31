import { useSettingsStore } from '../../store/settingsStore';
import type { Settings } from '../../types';

export default function SettingsPanel() {
  const settings = useSettingsStore();
  const saveSettings = useSettingsStore(s => s.saveSettings);

  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h4>Chat</h4>
        <div className="settings-field">
          <label>Bot Name</label>
          <input
            type="text"
            value={settings.bot_name || ''}
            onChange={e => saveSettings({ bot_name: e.target.value })}
          />
        </div>
        <div className="settings-field">
          <label>Send Key</label>
          <select
            value={settings.send_key || 'enter'}
            onChange={e => saveSettings({ send_key: e.target.value as 'enter' | 'ctrl_enter' })}
          >
            <option value="enter">Enter</option>
            <option value="ctrl_enter">Ctrl + Enter</option>
          </select>
        </div>
        <div className="settings-field">
          <label>Busy Input Mode</label>
          <select
            value={settings.busy_input_mode || 'queue'}
            onChange={e => saveSettings({ busy_input_mode: e.target.value as Settings['busy_input_mode'] })}
          >
            <option value="queue">Queue</option>
            <option value="interrupt">Interrupt</option>
            <option value="steer">Steer</option>
          </select>
        </div>
        <div className="settings-field checkbox">
          <label>
            <input
              type="checkbox"
              checked={settings.token_display || false}
              onChange={e => saveSettings({ token_display: e.target.checked })}
            />
            Show token count
          </label>
        </div>
        <div className="settings-field checkbox">
          <label>
            <input
              type="checkbox"
              checked={settings.show_cli_sessions !== false}
              onChange={e => saveSettings({ show_cli_sessions: e.target.checked })}
            />
            Show CLI sessions
          </label>
        </div>
      </section>
    </div>
  );
}
