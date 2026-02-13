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
 * Parse a trimmed terminal line for the "novi" command.
 * Used to intercept "novi myfile.py", "novi -s", "novi -c", and "novi" (no args).
 */
export function parseNoviCommand(trimmed: string): NoviCommandResult {
  if (trimmed !== 'novi' && !trimmed.startsWith('novi ')) {
    return { handled: false };
  }
  if (trimmed === 'novi') {
    return { handled: true, kind: 'none' };
  }
  if (trimmed === 'novi -s') {
    return { handled: true, kind: 'settings' };
  }
  if (trimmed === 'novi -c') {
    return { handled: true, kind: 'shell' };
  }
  const arg = trimmed.slice(4).trim();
  if (arg && arg !== '-s' && arg !== '-c') {
    return { handled: true, kind: 'open', path: arg };
  }
  return { handled: true, kind: 'none' };
}
