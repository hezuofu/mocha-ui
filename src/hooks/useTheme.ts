import { useCallback, useSyncExternalStore } from 'react';
import { useSettingsStore } from '../store/settingsStore';

type Theme = 'dark' | 'light';
type Skin = string;

const THEME_KEY = 'hermes-theme';
const SKIN_KEY = 'hermes-skin';
const FONT_KEY = 'hermes-font-size';

function getSnapshot(): { theme: Theme; skin: Skin; fontSize: string } {
  const stored = localStorage.getItem(THEME_KEY) || 'dark';
  const storedSkin = localStorage.getItem(SKIN_KEY) || 'default';
  const storedFont = localStorage.getItem(FONT_KEY) || 'default';

  let theme: Theme = 'dark';
  if (stored === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else if (stored === 'light') {
    theme = 'light';
  }

  return { theme, skin: storedSkin, fontSize: storedFont };
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function useTheme() {
  const { skin: storedSkin, fontSize } = getSnapshot();

  const settingsTheme = useSettingsStore(s => s.theme);
  const settingsSkin = useSettingsStore(s => s.skin);
  const settingsFontSize = useSettingsStore(s => s.font_size);
  const saveSettings = useSettingsStore(s => s.saveSettings);

  const resolvedTheme: Theme =
    settingsTheme === 'system'
      ? useSyncExternalStore(subscribe, () => getSnapshot().theme)
      : settingsTheme === 'light'
        ? 'light'
        : 'dark';

  const resolvedSkin = settingsSkin || storedSkin || 'default';
  const resolvedFontSize = settingsFontSize || fontSize || 'default';

  const setTheme = useCallback(
    (t: 'system' | 'dark' | 'light') => {
      localStorage.setItem(THEME_KEY, t);
      saveSettings({ theme: t });
    },
    [saveSettings],
  );

  const setSkin = useCallback(
    (s: string) => {
      localStorage.setItem(SKIN_KEY, s);
      saveSettings({ skin: s });
    },
    [saveSettings],
  );

  const setFontSize = useCallback(
    (fs: string) => {
      localStorage.setItem(FONT_KEY, fs);
      saveSettings({ font_size: fs as 'default' | 'small' | 'large' | 'xlarge' });
    },
    [saveSettings],
  );

  return {
    theme: resolvedTheme,
    skin: resolvedSkin,
    fontSize: resolvedFontSize,
    setTheme,
    setSkin,
    setFontSize,
  };
}
