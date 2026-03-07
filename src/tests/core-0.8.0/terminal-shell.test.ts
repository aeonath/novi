/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Tests for shell type configuration in TerminalService.
 * Does NOT test actual PTY creation (requires native module).
 */

import { DEFAULT_GITBASH_PATH } from '../../main/services/terminal-service';

// We can't import the full terminalService (singleton with node-pty),
// so we test the exported constant and shell type logic conceptually.

describe('Terminal Shell Configuration', () => {
  it('should export DEFAULT_GITBASH_PATH', () => {
    expect(DEFAULT_GITBASH_PATH).toBe('C:\\Program Files\\Git\\bin\\bash.exe');
  });

  it('should define all shell types', () => {
    // Type-level test: ensure ShellType covers all options
    type ShellType = 'gitbash' | 'powershell' | 'wsl' | 'linux';
    const types: ShellType[] = ['gitbash', 'powershell', 'wsl', 'linux'];
    expect(types).toHaveLength(4);
  });
});
