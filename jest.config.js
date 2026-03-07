module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Use jsdom for DOM manipulation tests
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapper: {
    '^monaco-editor$': '<rootDir>/__mocks__/monaco-editor.ts',
    '^(.*)\\.js$': '$1',
  },
};

