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
  onDidChangeModelContent: jest.fn((_callback) => {
    // Return a disposable
    return {
      dispose: jest.fn(),
    };
  }),
};

export const editor = {
  create: jest.fn(() => mockEditor),
  setTheme: jest.fn(),
  setModelLanguage: jest.fn(),
  addKeybindingRules: jest.fn(() => ({ dispose: jest.fn() })),
};

// Real runtime numeric values (from monaco-editor's compiled source, not
// guessed) — needed so code doing bitwise bindingNumber composition
// (e.g. MonacoEditor.ts's Keyboard Shortcuts wiring) behaves the same way
// under test as it does against the real package.
export const KeyMod = {
  CtrlCmd: 2048,
  Shift: 1024,
  Alt: 512,
  WinCtrl: 256,
};

export const KeyCode = {
  Enter: 3,
  Escape: 9,
  Digit0: 21,
  KeyA: 31,
  KeyC: 33,
  KeyN: 44,
  KeyO: 45,
  KeyS: 49,
  KeyZ: 56,
  F1: 59,
  F3: 61,
};

// Default export for easier mocking
export default {
  editor,
  KeyMod,
  KeyCode,
};

