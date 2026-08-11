/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for MonacoEditor's vim :w / :q / :q! / :wq ex command logic
 * (saveActiveVimFile / closeActiveVimFile). These are plain exported
 * functions taking mock tabBar/monacoEditor/saveFile dependencies directly
 * — the same "exported for direct unit testing" pattern used by
 * Terminal.ts's isClaimedByAppShortcut/shouldXtermHandleKey — rather than
 * mounting a real Monaco editor + dynamically importing monaco-vim.
 */

import {
  saveActiveVimFile, closeActiveVimFile,
  type VimTabBarLike, type VimMonacoEditorLike,
} from '../../renderer/components/MonacoEditor';

function makeTabBar(overrides: Partial<VimTabBarLike> = {}): VimTabBarLike & {
  getActiveTab: jest.Mock; updateTabDirty: jest.Mock; removeTab: jest.Mock;
} {
  return {
    getActiveTab: jest.fn(() => ({ id: 'tab-1', type: 'file' })),
    updateTabDirty: jest.fn(),
    removeTab: jest.fn(),
    ...overrides,
  } as any;
}

function makeEditorAPI(overrides: Partial<VimMonacoEditorLike> = {}): VimMonacoEditorLike & {
  getFilePath: jest.Mock; getValue: jest.Mock; markAsSaved: jest.Mock; isDirty: jest.Mock;
} {
  return {
    getFilePath: jest.fn(() => '/path/to/file.ts'),
    getValue: jest.fn(() => 'file contents'),
    markAsSaved: jest.fn(),
    isDirty: jest.fn(() => false),
    ...overrides,
  } as any;
}

describe('saveActiveVimFile (:w)', () => {
  it('returns "failed" when the editor API has no getFilePath', async () => {
    const result = await saveActiveVimFile({} as VimMonacoEditorLike, makeTabBar(), jest.fn());
    expect(result).toBe('failed');
  });

  it('returns "failed" when there is no saveFile function at all', async () => {
    const result = await saveActiveVimFile(makeEditorAPI(), makeTabBar(), undefined);
    expect(result).toBe('failed');
  });

  it('returns "no-path" for an untitled tab (no file path) without calling saveFile', async () => {
    const saveFile = jest.fn();
    const editorAPI = makeEditorAPI({ getFilePath: jest.fn(() => null) } as any);
    const result = await saveActiveVimFile(editorAPI, makeTabBar(), saveFile);
    expect(result).toBe('no-path');
    expect(saveFile).not.toHaveBeenCalled();
  });

  it('saves, marks saved, clears the active file tab\'s dirty flag, and returns "saved"', async () => {
    const saveFile = jest.fn().mockResolvedValue(undefined);
    const editorAPI = makeEditorAPI();
    const tabBar = makeTabBar();

    const result = await saveActiveVimFile(editorAPI, tabBar, saveFile);

    expect(result).toBe('saved');
    expect(saveFile).toHaveBeenCalledWith('/path/to/file.ts', 'file contents');
    expect(editorAPI.markAsSaved).toHaveBeenCalledTimes(1);
    expect(tabBar.updateTabDirty).toHaveBeenCalledWith('tab-1', false);
  });

  it('does not touch tab dirty state when the active tab is not a file tab', async () => {
    const saveFile = jest.fn().mockResolvedValue(undefined);
    const tabBar = makeTabBar({ getActiveTab: jest.fn(() => ({ id: 'term-1', type: 'terminal' })) } as any);

    const result = await saveActiveVimFile(makeEditorAPI(), tabBar, saveFile);

    expect(result).toBe('saved');
    expect(tabBar.updateTabDirty).not.toHaveBeenCalled();
  });

  it('returns "failed" when saveFile rejects', async () => {
    const saveFile = jest.fn().mockRejectedValue(new Error('disk full'));
    const result = await saveActiveVimFile(makeEditorAPI(), makeTabBar(), saveFile);
    expect(result).toBe('failed');
  });
});

describe('closeActiveVimFile (:q / :q!)', () => {
  it('does nothing when there is no active tab', () => {
    const tabBar = makeTabBar({ getActiveTab: jest.fn(() => null) } as any);
    const notify = jest.fn();
    closeActiveVimFile(tabBar, makeEditorAPI(), notify, false);
    expect(tabBar.removeTab).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('does nothing when the active tab is not a file tab', () => {
    const tabBar = makeTabBar({ getActiveTab: jest.fn(() => ({ id: 'term-1', type: 'terminal' })) } as any);
    const notify = jest.fn();
    closeActiveVimFile(tabBar, makeEditorAPI(), notify, false);
    expect(tabBar.removeTab).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it(':q refuses and notifies (real vim\'s E37) when there are unsaved changes, without closing', () => {
    const tabBar = makeTabBar();
    const editorAPI = makeEditorAPI({ isDirty: jest.fn(() => true) } as any);
    const notify = jest.fn();

    closeActiveVimFile(tabBar, editorAPI, notify, false);

    expect(notify).toHaveBeenCalledWith('E37: No write since last change (add ! to override)');
    expect(tabBar.removeTab).not.toHaveBeenCalled();
    expect(tabBar.updateTabDirty).not.toHaveBeenCalled();
  });

  it(':q closes immediately when there are no unsaved changes', () => {
    const tabBar = makeTabBar();
    const editorAPI = makeEditorAPI({ isDirty: jest.fn(() => false) } as any);
    const notify = jest.fn();

    closeActiveVimFile(tabBar, editorAPI, notify, false);

    expect(notify).not.toHaveBeenCalled();
    expect(tabBar.removeTab).toHaveBeenCalledWith('tab-1');
  });

  it(':q! discards unsaved changes — marks the tab clean (so TabBar\'s close-confirmation dialog is skipped) then closes', () => {
    const tabBar = makeTabBar();
    const editorAPI = makeEditorAPI({ isDirty: jest.fn(() => true) } as any);
    const notify = jest.fn();

    closeActiveVimFile(tabBar, editorAPI, notify, true);

    expect(notify).not.toHaveBeenCalled();
    expect(tabBar.updateTabDirty).toHaveBeenCalledWith('tab-1', false);
    expect(tabBar.removeTab).toHaveBeenCalledWith('tab-1');
  });
});
