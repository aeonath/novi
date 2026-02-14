/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Ensures a "novi" stub script exists so the shell can run `novi` (exit 0) and we don't show "command not found".
 * Returns the directory path to prepend to PATH for terminal sessions.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { logInfo } from './logger';

const STUB_DIR = 'novi-bin';
const STUB_NAME = 'novi';
const STUB_CONTENT = '#!/bin/sh\nexit 0\n'; // LF line endings for Git Bash
const STUB_BAT = 'novi.bat';
const STUB_BAT_CONTENT = '@echo off\r\nexit /b 0\r\n';

/**
 * Ensure novi stub exists under userDataPath/novi-bin/novi (and novi.bat for cmd). Returns the novi-bin absolute path.
 */
export function ensureNoviStubDir(userDataPath: string): string {
  const dir = join(userDataPath, STUB_DIR);
  const scriptPath = join(dir, STUB_NAME);
  const batPath = join(dir, STUB_BAT);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    logInfo(`[NoviStub] Created directory: ${dir}`);
  }

  if (!existsSync(scriptPath)) {
    writeFileSync(scriptPath, STUB_CONTENT, { mode: 0o755 });
    logInfo(`[NoviStub] Created stub: ${scriptPath}`);
  }

  if (!existsSync(batPath)) {
    writeFileSync(batPath, STUB_BAT_CONTENT);
    logInfo(`[NoviStub] Created stub: ${batPath}`);
  }

  return dir;
}
