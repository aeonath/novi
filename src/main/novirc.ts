/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * novirc — Reads ~/.novirc for user overrides.
 * Settings in .novirc take precedence over settings.json.
 * The user's settings.json is never written to from .novirc values.
 *
 * Format: KEY=VALUE (one per line), # comments, blank lines ignored.
 * Supported keys: shellType, shellPath, vimode, singlefiletree,
 *   keeptabs, gitenabled, fontSize, terminalFontSize, theme
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { logInfo } from './logger';

export type NovircSettings = Record<string, unknown>;

function getNoviRcPath(): string {
  return join(homedir(), '.novirc');
}

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  return trimmed;
}

export function loadNoviRc(): NovircSettings {
  const rcPath = getNoviRcPath();
  if (!existsSync(rcPath)) return {};

  try {
    const content = readFileSync(rcPath, 'utf-8');
    const result: NovircSettings = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1);
      result[key] = parseValue(value);
    }
    if (Object.keys(result).length > 0) {
      logInfo(`[novirc] Loaded ${Object.keys(result).length} setting(s) from ${rcPath}`);
    }
    return result;
  } catch {
    return {};
  }
}

export function getNoviRcSetting<T = unknown>(key: string): T | undefined {
  const rc = loadNoviRc();
  if (key in rc) return rc[key] as T;
  return undefined;
}
