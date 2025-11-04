/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * TerminalService Unit Tests
 * Tests for terminal session management service
 */

import { terminalService } from '../../main/services/terminal-service';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'node:fs';

// Mock child_process
jest.mock('child_process', () => ({
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
  let mockProcess: Partial<ChildProcess>;
  let mockStdout: any;
  let mockStderr: any;
  let mockStdin: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset terminal service state
    terminalService.cleanup();

    // Setup mock process
    mockStdout = {
      on: jest.fn(),
    };
    mockStderr = {
      on: jest.fn(),
    };
    mockStdin = {
      write: jest.fn(),
    };

    mockProcess = {
      stdout: mockStdout as any,
      stderr: mockStderr as any,
      stdin: mockStdin as any,
      on: jest.fn(),
      kill: jest.fn(),
    };

    (spawn as jest.Mock).mockReturnValue(mockProcess);
  });

  afterEach(() => {
    terminalService.cleanup();
  });

  describe('getBashPath', () => {
    it('should return Git bash path if found', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === 'C:\\Program Files\\Git\\bin\\bash.exe';
      });

      terminalService.createSession();
      expect(spawn).toHaveBeenCalledWith(
        'C:\\Program Files\\Git\\bin\\bash.exe',
        ['--norc'], // Non-interactive mode to avoid job control errors
        expect.any(Object)
      );
    });

    it('should fallback to system bash if Git bash not found', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === 'C:\\Windows\\System32\\bash.exe';
      });

      terminalService.createSession();
      expect(spawn).toHaveBeenCalledWith(
        'C:\\Windows\\System32\\bash.exe',
        ['--norc'], // Non-interactive mode to avoid job control errors
        expect.any(Object)
      );
    });

    it('should fallback to cmd.exe if no bash found', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      terminalService.createSession();
      expect(spawn).toHaveBeenCalledWith(
        'C:\\Windows\\System32\\cmd.exe',
        [],
        expect.any(Object)
      );
    });
  });

  describe('createSession', () => {
    it('should create a new terminal session', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();

      expect(id).toMatch(/^terminal-\d+$/);
      expect(spawn).toHaveBeenCalled();
      expect(terminalService.getSession(id)).toBeDefined();
    });

    it('should create session with custom cwd', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const cwd = '/test/directory';
      terminalService.createSession(cwd);

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        ['--norc'], // Bash receives --norc to avoid extra messages
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

    it('should set up process event handlers', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      terminalService.createSession();

      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle process exit', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const exitHandler = (mockProcess.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'exit'
      )?.[1];

      expect(exitHandler).toBeDefined();
      exitHandler?.(0, null);
      
      expect(terminalService.getSession(id)).toBeUndefined();
    });

    it('should handle process error', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const errorHandler = (mockProcess.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();
      errorHandler?.(new Error('Process error'));
      
      expect(terminalService.getSession(id)).toBeUndefined();
    });
  });

  describe('writeToTerminal', () => {
    it('should write data to terminal stdin', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const success = terminalService.writeToTerminal(id, 'test data');

      expect(success).toBe(true);
      expect(mockStdin.write).toHaveBeenCalledWith('test data');
    });

    it('should return false if terminal not found', () => {
      const success = terminalService.writeToTerminal('non-existent', 'data');

      expect(success).toBe(false);
      expect(mockStdin.write).not.toHaveBeenCalled();
    });

    it('should return false if stdin unavailable', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const session = terminalService.getSession(id);
      if (session) {
        session.process.stdin = null;
      }

      const success = terminalService.writeToTerminal(id, 'data');

      expect(success).toBe(false);
    });
  });

  describe('resizeTerminal', () => {
    it('should update terminal dimensions', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession(undefined, 80, 24);
      const success = terminalService.resizeTerminal(id, 120, 40);
      const session = terminalService.getSession(id);

      expect(success).toBe(true);
      expect(session?.cols).toBe(120);
      expect(session?.rows).toBe(40);
    });

    it('should return false if terminal not found', () => {
      const success = terminalService.resizeTerminal('non-existent', 120, 40);

      expect(success).toBe(false);
    });
  });

  describe('killSession', () => {
    it('should kill terminal process and remove session', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const id = terminalService.createSession();
      const success = terminalService.killSession(id);

      expect(success).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalled();
      expect(terminalService.getSession(id)).toBeUndefined();
    });

    it('should return false if terminal not found', () => {
      const success = terminalService.killSession('non-existent');

      expect(success).toBe(false);
      expect(mockProcess.kill).not.toHaveBeenCalled();
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
    it('should kill all sessions and clear them', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      terminalService.createSession();
      terminalService.createSession();

      terminalService.cleanup();

      expect(mockProcess.kill).toHaveBeenCalled();
      expect(terminalService.getAllSessions()).toEqual([]);
    });
  });
});

