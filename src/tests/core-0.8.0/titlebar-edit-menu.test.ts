/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for TitleBar's Edit menu enable/disable rules.
 *
 * Undo/Redo/Cut don't apply to a terminal tab and should be grayed out
 * there; Copy/Paste/Select All should still work on a terminal tab. On a
 * file (editor) tab, Cut/Copy/Paste/Select All always work, but Undo and
 * Redo each independently track Monaco's real undo/redo stack — grayed out
 * until there's actually something to undo/redo.
 *
 * Note: this targets the current `TitleBar.ts` (capitalized), the
 * Component-based one App.ts actually mounts — not the legacy
 * `title-bar.ts` covered by core-0.2.0/title-bar.test.ts, which is a
 * different, unrelated implementation.
 */

import { TitleBar } from '../../renderer/components/TitleBar';

function isDisabled(el: HTMLElement): boolean {
  return el.style.opacity === '0.5';
}

describe('TitleBar Edit menu enable/disable', () => {
  let titleBar: TitleBar;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    delete (window as any).__monacoEditorAPI;
  });

  afterEach(() => {
    titleBar?.destroy();
    container.remove();
    document.querySelectorAll('.menu-dropdown').forEach((el) => el.remove());
    delete (window as any).__monacoEditorAPI;
  });

  function openEditMenu(activeTabType: string | null): Map<string, HTMLElement> {
    titleBar = new TitleBar({ activeTabType });
    titleBar.mount(container);

    const editBtn = Array.from(container.querySelectorAll('.menu-button'))
      .find((b) => b.textContent === 'Edit') as HTMLElement;
    editBtn.click();

    const dropdown = document.querySelector('.menu-dropdown') as HTMLElement;
    const items = new Map<string, HTMLElement>();
    dropdown.querySelectorAll(':scope > div').forEach((row) => {
      const label = row.querySelector('span')?.textContent;
      if (label) items.set(label, row as HTMLElement);
    });
    return items;
  }

  it('grays out Undo, Redo, and Cut on a terminal tab but keeps Copy/Paste/Select All enabled', () => {
    const items = openEditMenu('terminal');
    expect(isDisabled(items.get('Undo')!)).toBe(true);
    expect(isDisabled(items.get('Redo')!)).toBe(true);
    expect(isDisabled(items.get('Cut')!)).toBe(true);
    expect(isDisabled(items.get('Copy')!)).toBe(false);
    expect(isDisabled(items.get('Paste')!)).toBe(false);
    expect(isDisabled(items.get('Select All')!)).toBe(false);
  });

  it('enables everything on a file tab when canUndo()/canRedo() are both true', () => {
    (window as any).__monacoEditorAPI = { canUndo: () => true, canRedo: () => true };
    const items = openEditMenu('file');
    expect(isDisabled(items.get('Undo')!)).toBe(false);
    expect(isDisabled(items.get('Redo')!)).toBe(false);
    expect(isDisabled(items.get('Cut')!)).toBe(false);
    expect(isDisabled(items.get('Copy')!)).toBe(false);
    expect(isDisabled(items.get('Paste')!)).toBe(false);
    expect(isDisabled(items.get('Select All')!)).toBe(false);
  });

  it('grays out only Redo on a file tab when canUndo() is true but canRedo() is false', () => {
    (window as any).__monacoEditorAPI = { canUndo: () => true, canRedo: () => false };
    const items = openEditMenu('file');
    expect(isDisabled(items.get('Undo')!)).toBe(false);
    expect(isDisabled(items.get('Redo')!)).toBe(true);
    expect(isDisabled(items.get('Cut')!)).toBe(false);
  });

  it('grays out only Undo on a file tab when canUndo() is false but canRedo() is true (e.g. right after an undo)', () => {
    (window as any).__monacoEditorAPI = { canUndo: () => false, canRedo: () => true };
    const items = openEditMenu('file');
    expect(isDisabled(items.get('Undo')!)).toBe(true);
    expect(isDisabled(items.get('Redo')!)).toBe(false);
    expect(isDisabled(items.get('Cut')!)).toBe(false);
  });

  it('grays out both Undo and Redo on a file tab when window.__monacoEditorAPI is unavailable', () => {
    const items = openEditMenu('file');
    expect(isDisabled(items.get('Undo')!)).toBe(true);
    expect(isDisabled(items.get('Redo')!)).toBe(true);
  });

  it('grays out all edit commands when no tab is active', () => {
    const items = openEditMenu(null);
    for (const label of ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Select All']) {
      expect(isDisabled(items.get(label)!)).toBe(true);
    }
  });

  it('enables Convert Tabs to Spaces on a file tab', () => {
    const items = openEditMenu('file');
    expect(isDisabled(items.get('Convert Tabs to Spaces')!)).toBe(false);
  });

  it('grays out Convert Tabs to Spaces on a terminal tab (editor-only, like Command Palette/Close File)', () => {
    const items = openEditMenu('terminal');
    expect(isDisabled(items.get('Convert Tabs to Spaces')!)).toBe(true);
  });

  it('grays out Convert Tabs to Spaces when no tab is active', () => {
    const items = openEditMenu(null);
    expect(isDisabled(items.get('Convert Tabs to Spaces')!)).toBe(true);
  });
});
