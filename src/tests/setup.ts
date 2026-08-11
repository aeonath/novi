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

// Stub the canvas 2D context. jsdom doesn't implement it (that needs the
// native `canvas` package) and logs a noisy "Not implemented" error via its
// virtual console every time something calls getContext() — @xterm/xterm
// and @xterm/addon-webgl both probe for a 2D canvas context at module-load
// time (for color/gradient utilities) purely inside a try/if(ctx) that
// already handles a null result gracefully. No test in this suite exercises
// real canvas pixel operations under Jest (see image-crop.test.ts etc. —
// those are documented as renderer-only, manually verified), so returning
// null here is behaviorally identical to jsdom's real (broken) getContext,
// just without the console spam.
HTMLCanvasElement.prototype.getContext = jest.fn(() => null) as typeof HTMLCanvasElement.prototype.getContext;
