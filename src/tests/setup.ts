/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

// Jest setup file - mocks Electron app module for testing
import { tmpdir } from 'node:os';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string): string => {
      if (name === 'userData') {
        // Use a temporary directory for tests
        return tmpdir();
      }
      return '/tmp';
    }),
  },
}));

// Suppress console output during tests
// Keep console.error so we can see actual test failures
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error and debug for troubleshooting
  // error: console.error,
  // debug: console.debug,
};

// Mock Monaco Editor global for tests that need it
(global as any).monaco = require('./__mocks__/monaco-editor').default;
