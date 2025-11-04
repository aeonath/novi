/**
 * Manual mock for monaco-editor
 * Used in unit tests to avoid loading the full Monaco library
 */

export const mockEditor = {
  getValue: jest.fn(() => 'test content'),
  setValue: jest.fn(),
  updateOptions: jest.fn(),
  dispose: jest.fn(),
  focus: jest.fn(),
  layout: jest.fn(),
  getModel: jest.fn(() => ({
    uri: { toString: () => 'file:///test.ts' },
  })),
};

export const editor = {
  create: jest.fn(() => mockEditor),
  setTheme: jest.fn(),
  setModelLanguage: jest.fn(),
};

// Default export for easier mocking
export default {
  editor,
};

