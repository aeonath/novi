/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export type Settings = Record<string, unknown>;

const settingsPath = join(app.getPath('userData'), 'settings.json');

export function loadSettings(): Settings {
  try {
    if (!existsSync(settingsPath)) {
      return {};
    }
    const raw = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(raw) as Settings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: Settings): void {
  const dir = dirname(settingsPath);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // Silently ignore write errors for now
  }
}

export function getSetting<T = unknown>(key: string, defaults?: T): T | undefined {
  const s = loadSettings();
  // Check if key exists in settings object
  if (!(key in s)) {
    return defaults;
  }
  // Explicitly handle null values - return null if stored, otherwise use default
  const value = s[key];
  if (value === null) {
    return null as T;
  }
  return (value as T) ?? defaults;
}

export function setSetting(key: string, value: unknown): void {
  const s = loadSettings();
  s[key] = value;
  saveSettings(s);
}

export function getSettingsFilePath(): string {
  return settingsPath;
}
