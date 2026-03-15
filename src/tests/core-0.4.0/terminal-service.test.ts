/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * TerminalService Unit Tests
 * Tests for terminal session management service with PTY support
 */

import { terminalService } from '../../main/services/terminal-service';
import { existsSync } from 'node:fs';

// Mock node-pty
jest.mock('@lydell/node-pty', () => ({
  spawn: jest.fn(),
}));

// Mock fs
jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}));

// Mock logger
jest.mock('../../main/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe('TerminalService', () => {
  let mockPty: any;
  const pty = require('@lydell/node-pty');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset terminal service state
    terminalService.cleanup();
    terminalService.setShell('gitbash');

    // Setup mock PTY
    mockPty = {
      onData: jest.fn(),
      onExit: jest.fn(),
      write: jest.fn(),
      resize: jest.fn(),
      kill: jest.fn(),
      pid: 12345,
    };

    pty.spawn.mockReturnValue(mockPty);
  });

  afterEach(() => {
    terminalService.cleanup();
  });

  describe('getShellPath', () => {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      it('should return Git bash path if found on Windows', () => {
        (existsSync as jest.Mock).mockImplementation((path: string) => {
          return path === 'C:\\Program Files\\Git\\bin\\bash.exe';
        });

        terminalService.createSession();
        expect(pty.spawn).toHaveBeenCalledWith(
          'C:\\Program Files\\Git\\bin\\bash.exe',
          ['--login', '-i'],
          expect.objectContaining({ name: 'xterm-256color' })
        );
      });

      it('should fallback to PowerShell if Git bash not found on Windows', () => {
        (existsSync as jest.Mock).mockReturnValue(false);

        terminalService.createSession();
        expect(pty.spawn).toHaveBeenCalledWith(
          'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
          ['-NoLogo'],
          expect.objectContaining({ name: 'xterm-256color' })
        );
      });

      it('should use WSL bash when shell type is wsl', () => {
        terminalService.setShell('wsl');

        terminalService.createSession();
        expect(pty.spawn).toHaveBeenCalledWith(
          'C:\\Windows\\System32\\bash.exe',
          [],
          expect.objectContaining({ name: 'xterm-256color' })
        );
      });
    } else {
      it('should use $SHELL on Linux/macOS', () => {
        const originalShell = process.env.SHELL;
        process.env.SHELL = '/bin/bash';
        (existsSync as jest.Mock).mockImplementation((path: string) => {
          return path === '/bin/bash';
        });

        terminalService.createSession();
        expect(pty.spawn).toHaveBeenCalledWith(
          '/bin/bash',
          ['--login', '-i'],
          expect.objectContaining({ name: 'xterm-256color' })
        );

        process.env.SHELL = originalShell;
      });

      it('should fallback to /bin/bash if $SHELL is unset on Linux', () => {
        const originalShell = process.env.SHELL;
        delete process.env.SHELL;
        (existsSync as jest.Mock).mockImplementation((path: string) => {
          return path === '/bin/bash';
        });

        terminalService.createSession();
        expect(pty.spawn).toHaveBeenCalledWith(
          '/bin/bash',
          ['--login', '-i'],
          expect.objectContaining({ name: 'xterm-256color' })
        );

        process.env.SHELL = originalShell;
      });

      it('should fallback to /bin/sh if no bash found on Linux', () => {
        const originalShell = process.env.SHELL;
        delete process.env.SHELL;
        (existsSync as jest.Mock).mockReturnValue(false);

        terminalService.createSession();
        expect(pty.spawn).toHaveBeenCalledWith(
          '/bin/sh',
          ['--login', '-i'],
          expect.objectContaining({ name: 'xterm-256color' })
        );

        process.env.SHELL = originalShell;
      });
    }
  });

  describe('createSession', () => {
    it('should create a new terminal session with PTY', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();

      expect(id).toMatch(/^terminal-\d+$/);
      expect(pty.spawn).toHaveBeenCalled();
      expect(terminalService.getSession(id)).toBeDefined();
    });

    it('should create session with custom cwd', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const cwd = '/test/directory';
      terminalService.createSession(cwd);

      expect(pty.spawn).toHaveBeenCalledWith(
        expect.any(String),
        ['--login', '-i'],
        expect.objectContaining({
          cwd: cwd,
        })
      );
    });

    it('should create session with custom dimensions', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession(undefined, 120, 40);
      const session = terminalService.getSession(id);

      expect(session).toBeDefined();
      expect(session?.cols).toBe(120);
      expect(session?.rows).toBe(40);
    });

    it('should set up PTY event handlers', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      terminalService.createSession();

      expect(mockPty.onExit).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle PTY exit', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const exitHandler = mockPty.onExit.mock.calls[0][0];

      expect(exitHandler).toBeDefined();
      exitHandler({ exitCode: 0, signal: null });
      
      expect(terminalService.getSession(id)).toBeUndefined();
    });
  });

  describe('writeToTerminal', () => {
    it('should write data to PTY', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const success = terminalService.writeToTerminal(id, 'test data');

      expect(success).toBe(true);
      expect(mockPty.write).toHaveBeenCalledWith('test data');
    });

    it('should return false if terminal not found', () => {
      const success = terminalService.writeToTerminal('non-existent', 'data');

      expect(success).toBe(false);
      expect(mockPty.write).not.toHaveBeenCalled();
    });
  });

  describe('resizeTerminal', () => {
    it('should resize PTY and update dimensions', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession(undefined, 80, 24);
      const success = terminalService.resizeTerminal(id, 120, 40);
      const session = terminalService.getSession(id);

      expect(success).toBe(true);
      expect(mockPty.resize).toHaveBeenCalledWith(120, 40);
      expect(session?.cols).toBe(120);
      expect(session?.rows).toBe(40);
    });

    it('should return false if terminal not found', () => {
      const success = terminalService.resizeTerminal('non-existent', 120, 40);

      expect(success).toBe(false);
      expect(mockPty.resize).not.toHaveBeenCalled();
    });
  });

  describe('killSession', () => {
    it('should kill PTY and remove session', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const success = terminalService.killSession(id);

      expect(success).toBe(true);
      expect(mockPty.kill).toHaveBeenCalled();
      expect(terminalService.getSession(id)).toBeUndefined();
    });

    it('should return false if terminal not found', () => {
      const success = terminalService.killSession('non-existent');

      expect(success).toBe(false);
      expect(mockPty.kill).not.toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return session if exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const session = terminalService.getSession(id);

      expect(session).toBeDefined();
      expect(session?.id).toBe(id);
    });

    it('should return undefined if session not found', () => {
      const session = terminalService.getSession('non-existent');

      expect(session).toBeUndefined();
    });
  });

  describe('getAllSessions', () => {
    it('should return all active sessions', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id1 = terminalService.createSession();
      const id2 = terminalService.createSession();
      const sessions = terminalService.getAllSessions();

      expect(sessions.length).toBe(2);
      expect(sessions.map(s => s.id)).toContain(id1);
      expect(sessions.map(s => s.id)).toContain(id2);
    });

    it('should return empty array if no sessions', () => {
      const sessions = terminalService.getAllSessions();

      expect(sessions).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should kill all PTY sessions and clear them', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      terminalService.createSession();
      terminalService.createSession();

      terminalService.cleanup();

      expect(mockPty.kill).toHaveBeenCalled();
      expect(terminalService.getAllSessions()).toEqual([]);
    });
  });
});

