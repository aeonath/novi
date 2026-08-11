/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for MonacoEditor's tabs-vs-spaces indentation setting.
 * Exercises setIndentation() directly against a fake EditorService — same
 * "inject a fake collaborator, skip initEditor()" pattern used in
 * monaco-editor-column-break.test.ts.
 */

import { MonacoEditor } from '../../renderer/components/MonacoEditor';

describe('MonacoEditor indentation', () => {
  it('defaults to insert-spaces with a tab size of 4', () => {
    const editor = new MonacoEditor();
    expect((editor as any)._insertSpaces).toBe(true);
    expect((editor as any)._tabSize).toBe(4);
  });

  it('setIndentation() updates the instance fields and forwards to EditorService.setIndentationOptions()', () => {
    const editor = new MonacoEditor();
    const fakeEditorService = { setIndentationOptions: jest.fn() };
    (editor as any).editorService = fakeEditorService;

    editor.setIndentation(false, 2);

    expect((editor as any)._insertSpaces).toBe(false);
    expect((editor as any)._tabSize).toBe(2);
    expect(fakeEditorService.setIndentationOptions).toHaveBeenCalledWith(2, false);
  });

  it('setIndentation() does not throw when no editor service exists yet', () => {
    const editor = new MonacoEditor();
    expect(() => editor.setIndentation(true, 8)).not.toThrow();
  });
});
