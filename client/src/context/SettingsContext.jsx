import { createContext, useContext, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../lib/urgency.js';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => loadSettings());

  // Płytki/głęboki merge patcha i zapis do localStorage.
  function updateSettings(patch) {
    setSettings((prev) => {
      const next = {
        ...prev,
        ...patch,
        urgency: patch.urgency
          ? {
              ...prev.urgency,
              ...patch.urgency,
              colors: { ...prev.urgency.colors, ...(patch.urgency.colors || {}) },
            }
          : prev.urgency,
      };
      saveSettings(next);
      return next;
    });
  }

  function resetSettings() {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    saveSettings(fresh);
    setSettings(fresh);
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings poza SettingsProvider');
  return ctx;
}
