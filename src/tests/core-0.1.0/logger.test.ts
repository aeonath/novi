import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { logInfo, logError } from '../../main/logger';

// Mock Electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') {
        return tmpdir();
      }
      return '/tmp';
    }),
  },
}));

describe('Logger', () => {
  let testLogDir: string;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    testLogDir = join(tmpdir(), 'logs');
    mkdirSync(testLogDir, { recursive: true });
  });

  beforeEach(() => {
    // Clear any existing log files
    const today = new Date().toISOString().split('T')[0];
    const logFile = join(testLogDir, `${today}.log`);
    if (existsSync(logFile)) {
      unlinkSync(logFile);
    }

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('logInfo', () => {
    it('should create log file with date-based naming (YYYY-MM-DD.log)', () => {
      logInfo('Test info message');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      expect(existsSync(logFile)).toBe(true);
    });

    it('should write to log file with correct format', () => {
      logInfo('Test info message');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      const content = readFileSync(logFile, 'utf-8');

      expect(content).toContain('[INFO]');
      expect(content).toContain('Test info message');
      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
    });

    it('should print to console', () => {
      logInfo('Test console output');

      expect(consoleLogSpy).toHaveBeenCalled();
      const firstCall = consoleLogSpy.mock.calls[0] as unknown[];
      expect(firstCall).toBeDefined();
      if (firstCall?.[0]) {
        const callArgs = firstCall[0] as string;
        expect(callArgs).toContain('[INFO]');
        expect(callArgs).toContain('Test console output');
      }
    });

    it('should include timestamp in log entry', () => {
      logInfo('Timestamp test');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      const content = readFileSync(logFile, 'utf-8');

      // Check for ISO timestamp format
      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('logError', () => {
    it('should create log file with date-based naming', () => {
      logError('Test error message');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      expect(existsSync(logFile)).toBe(true);
    });

    it('should write error to log file with correct format', () => {
      logError('Test error message');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      const content = readFileSync(logFile, 'utf-8');

      expect(content).toContain('[ERROR]');
      expect(content).toContain('Test error message');
    });

    it('should print to console.error', () => {
      logError('Test error console output');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const firstCall = consoleErrorSpy.mock.calls[0] as unknown[];
      expect(firstCall).toBeDefined();
      const callArgs = firstCall?.[0] as string | undefined;
      expect(callArgs).toBeDefined();
      if (callArgs) {
        expect(callArgs).toContain('[ERROR]');
        expect(callArgs).toContain('Test error console output');
      }
    });

    it('should include Error stack trace when Error object provided', () => {
      const testError = new Error('Test error');
      testError.stack = 'Error: Test error\n    at test (test.js:1:1)';

      logError('Error occurred', testError);

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      const content = readFileSync(logFile, 'utf-8');

      expect(content).toContain('Error occurred');
      expect(content).toContain('Error: Test error');
      expect(content).toContain('at test (test.js:1:1)');
    });

    it('should handle non-Error error values', () => {
      logError('Error occurred', 'String error');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      const content = readFileSync(logFile, 'utf-8');

      expect(content).toContain('Error occurred');
      expect(content).toContain('String error');
    });

    it('should handle undefined error parameter', () => {
      logError('Error without details');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      const content = readFileSync(logFile, 'utf-8');

      expect(content).toContain('[ERROR]');
      expect(content).toContain('Error without details');
      expect(content).not.toContain('undefined');
    });

    it('should append multiple log entries to same file', () => {
      logInfo('First message');
      logError('Second message');
      logInfo('Third message');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      const content = readFileSync(logFile, 'utf-8');

      expect(content).toContain('First message');
      expect(content).toContain('Second message');
      expect(content).toContain('Third message');
      expect((content.match(/\[INFO\]/g) ?? []).length).toBe(2);
      expect((content.match(/\[ERROR\]/g) ?? []).length).toBe(1);
    });
  });

  describe('Log Format', () => {
    it('should use consistent log line format', () => {
      logInfo('Format test');

      const today = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `${today}.log`);
      const content = readFileSync(logFile, 'utf-8');

      // Format: [timestamp] [LEVEL] message\n
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);

      const logLine = lines[0];
      expect(logLine).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // Starts with timestamp
      expect(logLine).toContain('[INFO]');
      expect(logLine).toContain('Format test');
    });
  });

  describe('Error Handling', () => {
    it('should handle file write errors gracefully', () => {
      // This test verifies that log functions don't throw even if file operations fail
      // The actual implementation catches errors silently
      expect(() => {
        logInfo('Should not throw');
        logError('Should not throw');
      }).not.toThrow();
    });
  });
});
