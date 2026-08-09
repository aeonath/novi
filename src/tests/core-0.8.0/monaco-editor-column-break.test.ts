/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for MonacoEditor's Column Break / Show Ruler / Hard Break logic.
 *
 * Exercises the real (unmocked) MonacoEditor class methods directly against
 * a fake `editor` object, the same pattern used in
 * terminal-dispose-guard.test.ts — the constructor never calls initEditor()
 * (only onMount() does), so this avoids needing the full Monaco runtime.
 * maybeHardBreak() does reference the global `monaco.Range` constructor
 * (MonacoEditor.ts declares `monaco` as an ambient global loaded via a
 * script tag in the real app, not an ES import), so a minimal stub is
 * provided for it.
 */

import { MonacoEditor } from '../../renderer/components/MonacoEditor';

beforeAll(() => {
  (global as any).monaco = {
    Range: class {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number,
      ) {}
    },
  };
});

afterAll(() => {
  delete (global as any).monaco;
});

function makeFakeEditor(lineContent: string, cursorColumn: number) {
  return {
    updateOptions: jest.fn(),
    executeEdits: jest.fn(),
    getModel: jest.fn(() => ({ getLineContent: jest.fn(() => lineContent) })),
    getPosition: jest.fn(() => ({ lineNumber: 1, column: cursorColumn })),
  };
}

describe('MonacoEditor Column Break / Show Ruler', () => {
  it('setShowRuler(true) sets rulers to the current column break value', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('', 1);
    (editor as any).editor = fakeEditor;

    editor.setColumnBreak(false, 90, false);
    fakeEditor.updateOptions.mockClear();
    editor.setShowRuler(true);

    expect(fakeEditor.updateOptions).toHaveBeenCalledWith({ rulers: [90] });
  });

  it('setShowRuler(false) clears the rulers', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('', 1);
    (editor as any).editor = fakeEditor;

    editor.setShowRuler(true);
    fakeEditor.updateOptions.mockClear();
    editor.setShowRuler(false);

    expect(fakeEditor.updateOptions).toHaveBeenCalledWith({ rulers: [] });
  });

  it('changing the Column Break value while the ruler is shown re-positions it', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('', 1);
    (editor as any).editor = fakeEditor;

    editor.setShowRuler(true);
    fakeEditor.updateOptions.mockClear();
    editor.setColumnBreak(true, 100, false);

    expect(fakeEditor.updateOptions).toHaveBeenCalledWith({ rulers: [100] });
  });
});

describe('MonacoEditor Word Wrap honors Column Break', () => {
  it('wraps at the default 90 columns when Column Break is off', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('', 1);
    (editor as any).editor = fakeEditor;

    editor.wordWrap = true;

    expect(fakeEditor.updateOptions).toHaveBeenCalledWith({ wordWrap: 'wordWrapColumn', wordWrapColumn: 90 });
  });

  it('wraps at the Column Break value once Column Break is enabled', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('', 1);
    (editor as any).editor = fakeEditor;

    editor.setColumnBreak(true, 120, false);
    editor.wordWrap = true;

    expect(fakeEditor.updateOptions).toHaveBeenCalledWith({ wordWrap: 'wordWrapColumn', wordWrapColumn: 120 });
  });

  it('re-wraps live at the new column when Column Break changes while wrap is already on', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('', 1);
    (editor as any).editor = fakeEditor;

    editor.wordWrap = true;
    editor.setColumnBreak(true, 60, false);

    expect(fakeEditor.updateOptions).toHaveBeenLastCalledWith({ wordWrapColumn: 60 });
  });

  it('ignores the Column Break value once Column Break is disabled again', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('', 1);
    (editor as any).editor = fakeEditor;

    editor.setColumnBreak(true, 120, false);
    editor.wordWrap = true;
    editor.setColumnBreak(false, 120, false);

    expect(fakeEditor.updateOptions).toHaveBeenLastCalledWith({ wordWrapColumn: 90 });
  });
});

describe('MonacoEditor Hard Break (maybeHardBreak)', () => {
  function callMaybeHardBreak(editor: MonacoEditor): void {
    (editor as any).maybeHardBreak();
  }

  it('inserts a newline at the column boundary once the line reaches it', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('x'.repeat(90), 91);
    (editor as any).editor = fakeEditor;
    editor.setColumnBreak(true, 90, true);

    callMaybeHardBreak(editor);

    expect(fakeEditor.executeEdits).toHaveBeenCalledTimes(1);
    const [, ops] = fakeEditor.executeEdits.mock.calls[0];
    expect(ops[0].text).toBe('\n');
    expect(ops[0].range).toMatchObject({ startLineNumber: 1, startColumn: 91, endLineNumber: 1, endColumn: 91 });
  });

  it('does nothing while the line is still under the column limit', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('short line', 11);
    (editor as any).editor = fakeEditor;
    editor.setColumnBreak(true, 90, true);

    callMaybeHardBreak(editor);

    expect(fakeEditor.executeEdits).not.toHaveBeenCalled();
  });

  it('does nothing when Column Break is off', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('x'.repeat(90), 91);
    (editor as any).editor = fakeEditor;
    editor.setColumnBreak(false, 90, true);

    callMaybeHardBreak(editor);

    expect(fakeEditor.executeEdits).not.toHaveBeenCalled();
  });

  it('does nothing when Hard Break is off', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('x'.repeat(90), 91);
    (editor as any).editor = fakeEditor;
    editor.setColumnBreak(true, 90, false);

    callMaybeHardBreak(editor);

    expect(fakeEditor.executeEdits).not.toHaveBeenCalled();
  });

  it('does nothing while Word Wrap is on, even with Hard Break enabled', () => {
    const editor = new MonacoEditor();
    const fakeEditor = makeFakeEditor('x'.repeat(90), 91);
    (editor as any).editor = fakeEditor;
    editor.wordWrap = true;
    editor.setColumnBreak(true, 90, true);

    callMaybeHardBreak(editor);

    expect(fakeEditor.executeEdits).not.toHaveBeenCalled();
  });
});
