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
