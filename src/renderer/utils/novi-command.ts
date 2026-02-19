/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Result of parsing a terminal line for the "novi" command (Task 8).
 */
export type NoviCommandResult =
  | { handled: false }
  | { handled: true; kind: 'none' }
  | { handled: true; kind: 'settings' }
  | { handled: true; kind: 'shell' }
  | { handled: true; kind: 'open'; path: string };

/**
 * Parse a terminal line for the "novi" command.
 * Allows leading/trailing whitespace (e.g. "   novi   filename.md" or "$        novi        file.md").
 */
export function parseNoviCommand(trimmed: string): NoviCommandResult {
  const s = trimmed.trim();
  if (s !== 'novi' && !s.startsWith('novi ')) {
    return { handled: false };
  }
  if (s === 'novi') {
    return { handled: true, kind: 'none' };
  }
  if (s === 'novi -s') {
    return { handled: true, kind: 'settings' };
  }
  if (s === 'novi -c') {
    return { handled: true, kind: 'shell' };
  }
  const arg = s.slice(4).trim();
  if (arg && arg !== '-s' && arg !== '-c') {
    return { handled: true, kind: 'open', path: arg };
  }
  return { handled: true, kind: 'none' };
}
