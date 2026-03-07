/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadNoviRc } from './novirc';

export type Settings = Record<string, unknown>;

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): Settings {
  try {
    const p = getSettingsPath();
    if (!existsSync(p)) {
      return {};
    }
    const raw = readFileSync(p, 'utf-8');
    return JSON.parse(raw) as Settings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: Settings): void {
  const p = getSettingsPath();
  const dir = dirname(p);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // Silently ignore write errors for now
  }
}

export function getSetting<T = unknown>(key: string, defaults?: T): T | undefined {
  // .novirc overrides take precedence over settings.json
  const rc = loadNoviRc();
  if (key in rc) {
    const rcValue = rc[key];
    if (rcValue === null) return null as T;
    return (rcValue as T) ?? defaults;
  }

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
  return getSettingsPath();
}
