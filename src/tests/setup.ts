// Jest setup file - mocks Electron app module for testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') {
        // Use a temporary directory for tests
        return require('os').tmpdir();
      }
      return '/tmp';
    }),
  },
}));

