/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { readFileSync, existsSync, unlinkSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  saveCrashReport,
  getDiagnosticsInfo,
  getCrashesDirectory,
} from '../../main/crash-reporter';

// Mock Electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') {
        return tmpdir();
      }
      return '/tmp';
    }),
    getVersion: jest.fn(() => '0.0.1'),
  },
}));

describe('Crash Reporter', () => {
  let testCrashesDir: string;
  let originalConsoleError: typeof console.error;

  beforeAll(() => {
    testCrashesDir = join(tmpdir(), 'crashes');
    mkdirSync(testCrashesDir, { recursive: true });
    // Suppress console.error output during tests (expected behavior from crash reporter)
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterAll(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    // Clean up any existing crash reports
    if (existsSync(testCrashesDir)) {
      const files = readdirSync(testCrashesDir);
      files.forEach((file: string) => {
        if (file.startsWith('crash-')) {
          unlinkSync(join(testCrashesDir, file));
        }
      });
    }
  });

  describe('saveCrashReport', () => {
    it('should create crash report file for uncaughtException', () => {
      const error = new Error('Test uncaught exception');
      const reportPath = saveCrashReport('uncaughtException', error);

      expect(reportPath).toBeTruthy();
      expect(existsSync(reportPath ?? '')).toBe(true);
    });

    it('should create crash report file for unhandledRejection', () => {
      const error = new Error('Test unhandled rejection');
      const reportPath = saveCrashReport('unhandledRejection', error);

      expect(reportPath).toBeTruthy();
      expect(existsSync(reportPath ?? '')).toBe(true);
    });

    it('should create crash report file for rendererError', () => {
      const error = new Error('Test renderer error');
      const reportPath = saveCrashReport('rendererError', error, 'Custom stack trace');

      expect(reportPath).toBeTruthy();
      expect(existsSync(reportPath ?? '')).toBe(true);
    });

    it('should include error message in crash report', () => {
      const error = new Error('Test error message');
      const reportPath = saveCrashReport('uncaughtException', error);

      expect(reportPath).toBeTruthy();
      if (reportPath) {
        const content = readFileSync(reportPath, 'utf-8');
        expect(content).toContain('Test error message');
      }
    });

    it('should include stack trace in crash report', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test (test.js:1:1)';
      const reportPath = saveCrashReport('uncaughtException', error);

      expect(reportPath).toBeTruthy();
      if (reportPath) {
        const content = readFileSync(reportPath, 'utf-8');
        expect(content).toContain('Error: Test error');
        expect(content).toContain('at test (test.js:1:1)');
      }
    });

    it('should use custom stack trace when provided', () => {
      const error = new Error('Test error');
      const customStack = 'Custom stack trace line 1\nCustom stack trace line 2';
      const reportPath = saveCrashReport('rendererError', error, customStack);

      expect(reportPath).toBeTruthy();
      if (reportPath) {
        const content = readFileSync(reportPath, 'utf-8');
        expect(content).toContain('Custom stack trace line 1');
        expect(content).toContain('Custom stack trace line 2');
      }
    });

    it('should include environment information in crash report', () => {
      const error = new Error('Test error');
      const reportPath = saveCrashReport('uncaughtException', error);

      expect(reportPath).toBeTruthy();
      if (reportPath) {
        const content = readFileSync(reportPath, 'utf-8');
        expect(content).toContain('Platform:');
        expect(content).toContain('Architecture:');
        expect(content).toContain('Node.js Version:');
        expect(content).toContain('Electron Version:');
        expect(content).toContain('App Version:');
      }
    });

    it('should include timestamp in crash report', () => {
      const error = new Error('Test error');
      const reportPath = saveCrashReport('uncaughtException', error);

      expect(reportPath).toBeTruthy();
      if (reportPath) {
        const content = readFileSync(reportPath, 'utf-8');
        expect(content).toContain('Timestamp:');
        expect(content).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
      }
    });

    it('should handle non-Error error values', () => {
      const reportPath = saveCrashReport('unhandledRejection', 'String error');

      expect(reportPath).toBeTruthy();
      if (reportPath) {
        const content = readFileSync(reportPath, 'utf-8');
        expect(content).toContain('String error');
      }
    });

    it('should handle null error values', () => {
      const reportPath = saveCrashReport('unhandledRejection', null);

      expect(reportPath).toBeTruthy();
      if (reportPath) {
        const content = readFileSync(reportPath, 'utf-8');
        expect(content).toContain('Unknown error');
      }
    });

    it('should handle errors gracefully without throwing', () => {
      // The function should not throw even if there's an error
      const error = new Error('Test error');
      expect(() => {
        const reportPath = saveCrashReport('uncaughtException', error);
        expect(reportPath === null || typeof reportPath === 'string').toBe(true);
      }).not.toThrow();
    });
  });

  describe('getDiagnosticsInfo', () => {
    it('should return formatted diagnostics information', () => {
      const diagnostics = getDiagnosticsInfo();

      expect(diagnostics).toBeTruthy();
      expect(typeof diagnostics).toBe('string');
      expect(diagnostics).toContain('Nova Crash Report');
      expect(diagnostics).toContain('Diagnostics information');
    });

    it('should include environment information', () => {
      const diagnostics = getDiagnosticsInfo();

      expect(diagnostics).toContain('Platform:');
      expect(diagnostics).toContain('Architecture:');
      expect(diagnostics).toContain('Node.js Version:');
      expect(diagnostics).toContain('Electron Version:');
      expect(diagnostics).toContain('App Version:');
    });

    it('should include timestamp', () => {
      const diagnostics = getDiagnosticsInfo();

      expect(diagnostics).toContain('Timestamp:');
      expect(diagnostics).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
    });
  });

  describe('getCrashesDirectory', () => {
    it('should return crashes directory path', () => {
      const crashesDir = getCrashesDirectory();

      expect(crashesDir).toBeTruthy();
      expect(typeof crashesDir).toBe('string');
      expect(crashesDir).toContain('crashes');
    });

    it('should create crashes directory if it does not exist', () => {
      const crashesDir = getCrashesDirectory();

      expect(existsSync(crashesDir)).toBe(true);
    });
  });

  describe('Crash Report Format', () => {
    it('should use consistent crash report format', () => {
      const error = new Error('Format test');
      const reportPath = saveCrashReport('uncaughtException', error);

      expect(reportPath).toBeTruthy();
      if (reportPath) {
        const content = readFileSync(reportPath, 'utf-8');

        // Check for expected sections
        expect(content).toContain('Nova Crash Report');
        expect(content).toContain('Timestamp:');
        expect(content).toContain('Type:');
        expect(content).toContain('Error:');
        expect(content).toContain('Environment:');
      }
    });
  });
});

