/**
 * SettingsPanel - Settings UI (React)
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface Setting {
  key: string;
  label: string;
  type: 'toggle' | 'number' | 'text' | 'select';
  value: any;
  options?: string[];
}

export const SettingsPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<Setting[]>([]);

  const loadSettings = useCallback(async () => {
    if (!window.api?.getSetting) return;

    try {
      const theme = await window.api.getSetting<string>('theme', 'dark');
      const fontSize = await window.api.getSetting<number>('fontSize', 14);
      const wordWrap = await window.api.getSetting<boolean>('wordWrap', false);
      const autoSave = await window.api.getSetting<boolean>('autoSave', true);

      setSettings([
        { key: 'theme', label: 'Theme', type: 'select', value: theme, options: ['light', 'dark'] },
        { key: 'fontSize', label: 'Font Size', type: 'number', value: fontSize },
        { key: 'wordWrap', label: 'Word Wrap', type: 'toggle', value: wordWrap },
        { key: 'autoSave', label: 'Auto Save', type: 'toggle', value: autoSave },
      ]);
    } catch (error) {
      console.error('[SettingsPanel] Failed to load settings:', error);
    }
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    if (!window.api?.setSetting) return;

    try {
      await window.api.setSetting(key, value);
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value } : s))
      );
    } catch (error) {
      console.error(`[SettingsPanel] Failed to update ${key}:`, error);
    }
  }, []);

  const show = useCallback(async () => {
    await loadSettings();
    setIsVisible(true);
  }, [loadSettings]);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Expose methods
  useEffect(() => {
    (window as any).__settingsPanelAPI = { show, hide };
    return () => {
      delete (window as any).__settingsPanelAPI;
    };
  }, [show, hide]);

  if (!isVisible) return null;

  return (
    <div style={styles.overlay} onClick={hide}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.closeButton} onClick={hide}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {settings.map((setting) => (
            <div key={setting.key} style={styles.settingRow}>
              <label style={styles.label}>{setting.label}</label>
              {setting.type === 'toggle' && (
                <input
                  type="checkbox"
                  checked={setting.value}
                  onChange={(e) => updateSetting(setting.key, e.target.checked)}
                  style={styles.checkbox}
                />
              )}
              {setting.type === 'number' && (
                <input
                  type="number"
                  value={setting.value}
                  onChange={(e) => updateSetting(setting.key, parseInt(e.target.value, 10))}
                  style={styles.input}
                />
              )}
              {setting.type === 'select' && (
                <select
                  value={setting.value}
                  onChange={(e) => updateSetting(setting.key, e.target.value)}
                  style={styles.select}
                >
                  {setting.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  panel: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #3e3e42',
    borderRadius: '8px',
    width: '500px',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #3e3e42',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#cccccc',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#cccccc',
    fontSize: '24px',
    cursor: 'pointer',
    padding: 0,
    width: '30px',
    height: '30px',
  },
  content: {
    padding: '20px',
    overflowY: 'auto' as const,
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  label: {
    color: '#cccccc',
    fontSize: '14px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  input: {
    backgroundColor: '#2d2d30',
    border: '1px solid #3e3e42',
    color: '#cccccc',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '14px',
    width: '100px',
  },
  select: {
    backgroundColor: '#2d2d30',
    border: '1px solid #3e3e42',
    color: '#cccccc',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

