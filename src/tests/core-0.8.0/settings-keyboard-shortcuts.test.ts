/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { SettingsTab } from '../../renderer/components/SettingsTab';

const mockApi = {
  getSetting: jest.fn().mockResolvedValue(undefined),
  setSetting: jest.fn().mockResolvedValue(undefined),
  getPlatform: jest.fn().mockResolvedValue('win32'),
  checkWslAvailable: jest.fn().mockResolvedValue(false),
};
(window as any).api = mockApi;

function flush(): Promise<void> {
  return new Promise(r => setTimeout(r, 10));
}

function dispatchKey(init: Partial<KeyboardEventInit> & { key: string }): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
}

function findRowByLabel(root: HTMLElement, label: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll('div')).find(d => d.textContent?.startsWith(label)) as HTMLElement | undefined;
}

describe('SettingsTab: Keyboard Shortcuts section', () => {
  let container: HTMLElement;
  let tab: SettingsTab;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockApi.getSetting.mockResolvedValue(undefined);
    mockApi.setSetting.mockResolvedValue(undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    tab = new SettingsTab();
    tab.mount(container);
    await flush();
    tab.section = 'keyboard-shortcuts';
  });

  afterEach(() => {
    tab.destroy();
    container.remove();
  });

  it('renders the heading and just two sub-tabs — Novi is merged into Terminal + Editor, not its own tab', () => {
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Keyboard Shortcuts');
    expect(text).toContain('Terminal + Editor');
    expect(text).toContain('Editor');

    const pillTexts = Array.from(tab.getElement().querySelectorAll('div'))
      .map(d => d.textContent)
      .filter(t => t === 'Novi' || t === 'Terminal + Editor' || t === 'Editor');
    expect(pillTexts).not.toContain('Novi');
    // Exactly one "Terminal + Editor" pill and one "Editor" pill, no third.
    expect(pillTexts.filter(t => t === 'Terminal + Editor').length).toBe(1);
    expect(pillTexts.filter(t => t === 'Editor').length).toBe(1);
  });

  it('defaults to the merged Terminal + Editor tab, showing both Novi and Terminal+Editor shortcuts together', () => {
    const text = tab.getElement().textContent || '';
    // Novi (app-level) shortcuts...
    expect(text).toContain('New File');
    expect(text).toContain('Ctrl+N');
    expect(text).toContain('New Terminal');
    // ...alongside Terminal + Editor shortcuts, on the same tab, with no click needed.
    expect(text).toContain('Copy');
    expect(text).toContain('Select All');
    // Editor-only commands still don't belong here.
    expect(text).not.toContain('Fold');
    expect(text).not.toContain('Rename Symbol');
  });

  it('defaults to Use Defaults checked, showing read-only accelerator badges', () => {
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    // Read-only mode: no recorder boxes (they carry this title), just badges.
    const recorderBoxes = Array.from(tab.getElement().querySelectorAll('div')).filter(
      d => d.title === 'Click, then press a key combination'
    );
    expect(recorderBoxes.length).toBe(0);
    expect(tab.getElement().textContent).toContain('Ctrl+N'); // New File's default, shown as a badge
  });

  it('unchecking the merged Use Defaults toggle turns off both novi and editorTerminal, and reveals a recorder box per shortcut', async () => {
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await flush();

    expect(mockApi.setSetting).toHaveBeenCalledWith(
      'keyboardShortcuts',
      expect.objectContaining({
        novi: expect.objectContaining({ useDefaults: false }),
        editorTerminal: expect.objectContaining({ useDefaults: false }),
      })
    );

    const recorderBoxes = Array.from(tab.getElement().querySelectorAll('div')).filter(
      d => d.title === 'Click, then press a key combination'
    );
    // Both a Novi row (New File) and a Terminal+Editor row (Copy) should now
    // be editable on the same merged tab.
    expect(recorderBoxes.length).toBeGreaterThan(1);
  });

  it('recording a free key combination for New File (a Novi shortcut) saves the override under the novi category', async () => {
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await flush();

    const newFileRow = findRowByLabel(tab.getElement(), 'New File')!;
    const recorderBox = newFileRow.querySelector('[title="Click, then press a key combination"]') as HTMLElement;
    recorderBox.click();
    dispatchKey({ key: 'N', ctrlKey: true, shiftKey: true });
    await flush();

    expect(mockApi.setSetting).toHaveBeenLastCalledWith(
      'keyboardShortcuts',
      expect.objectContaining({
        novi: expect.objectContaining({ overrides: expect.objectContaining({ 'new-file': 'CmdOrCtrl+Shift+N' }) }),
      })
    );
  });

  it('recording a free key combination for Select All (a Terminal+Editor shortcut) saves the override under the editorTerminal category, on the same merged tab', async () => {
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await flush();

    const selectAllRow = findRowByLabel(tab.getElement(), 'Select All')!;
    const recorderBox = selectAllRow.querySelector('[title="Click, then press a key combination"]') as HTMLElement;
    recorderBox.click();
    dispatchKey({ key: 'L', ctrlKey: true, altKey: true });
    await flush();

    expect(mockApi.setSetting).toHaveBeenLastCalledWith(
      'keyboardShortcuts',
      expect.objectContaining({
        editorTerminal: expect.objectContaining({ overrides: expect.objectContaining({ 'select-all': 'CmdOrCtrl+Alt+L' }) }),
      })
    );
  });

  it('recording a combination already used by another command shows a conflict and does not save it', async () => {
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await flush();
    mockApi.setSetting.mockClear();

    const newFileRow = findRowByLabel(tab.getElement(), 'New File')!;
    const recorderBox = newFileRow.querySelector('[title="Click, then press a key combination"]') as HTMLElement;
    recorderBox.click();
    // Open File's default is CmdOrCtrl+O — a real conflict.
    dispatchKey({ key: 'O', ctrlKey: true });
    await flush();

    expect(tab.getElement().textContent).toContain('Already in use by "Open File"');
    expect(mockApi.setSetting).not.toHaveBeenCalled();
  });

  it('Reset to default removes the override and restores the default display', async () => {
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await flush();

    let newFileRow = findRowByLabel(tab.getElement(), 'New File')!;
    let recorderBox = newFileRow.querySelector('[title="Click, then press a key combination"]') as HTMLElement;
    recorderBox.click();
    dispatchKey({ key: 'N', ctrlKey: true, shiftKey: true });
    await flush();

    newFileRow = findRowByLabel(tab.getElement(), 'New File')!;
    const resetLink = Array.from(newFileRow.querySelectorAll('div')).find(d => d.textContent === 'Reset to default')!;
    expect(resetLink).toBeDefined();
    resetLink.click();
    await flush();

    expect(mockApi.setSetting).toHaveBeenLastCalledWith(
      'keyboardShortcuts',
      expect.objectContaining({
        novi: expect.objectContaining({ overrides: expect.not.objectContaining({ 'new-file': expect.anything() }) }),
      })
    );
    newFileRow = findRowByLabel(tab.getElement(), 'New File')!;
    recorderBox = newFileRow.querySelector('[title="Click, then press a key combination"]') as HTMLElement;
    expect(recorderBox.textContent).toBe('Ctrl+N');
  });

  it('switching to the Editor sub-tab shows editor-only commands (Save, Close File, Monaco built-ins) but not terminal or Novi ones', () => {
    const pills = Array.from(tab.getElement().querySelectorAll('div')).filter(d => d.textContent === 'Editor');
    expect(pills.length).toBeGreaterThan(0);
    pills[0].click();
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Save');
    expect(text).toContain('Close File');
    // Phase 3: Monaco's own built-in commands render here, and the list is
    // long enough to show the filter box.
    expect(text).toContain('Fold');
    expect(text).toContain('Rename Symbol');
    // Shared Terminal + Editor shortcuts (e.g. Cut/Copy/Paste) and Novi
    // shortcuts (e.g. New File) belong on the merged tab, not here.
    expect(text).not.toContain('Paste');
    expect(text).not.toContain('New File');
    const filterInput = tab.getElement().querySelector('input[placeholder="Filter shortcuts…"]');
    expect(filterInput).not.toBeNull();
  });

  it('recording an Editor shortcut (Save) persists under the editor category', async () => {
    const pills = Array.from(tab.getElement().querySelectorAll('div')).filter(d => d.textContent === 'Editor');
    pills[0].click();

    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await flush();

    const saveRow = findRowByLabel(tab.getElement(), 'Save')!;
    const recorderBox = saveRow.querySelector('[title="Click, then press a key combination"]') as HTMLElement;
    recorderBox.click();
    dispatchKey({ key: 'L', ctrlKey: true, altKey: true });
    await flush();

    expect(mockApi.setSetting).toHaveBeenLastCalledWith(
      'keyboardShortcuts',
      expect.objectContaining({
        editor: expect.objectContaining({ overrides: expect.objectContaining({ save: 'CmdOrCtrl+Alt+L' }) }),
      })
    );
  });

  it('switching from Editor back to the merged tab shows Novi and Terminal+Editor shortcuts again', () => {
    const editorPills = Array.from(tab.getElement().querySelectorAll('div')).filter(d => d.textContent === 'Editor');
    editorPills[0].click();
    expect(tab.getElement().textContent).not.toContain('New File');

    const mergedPills = Array.from(tab.getElement().querySelectorAll('div')).filter(d => d.textContent === 'Terminal + Editor');
    mergedPills[0].click();
    const text = tab.getElement().textContent || '';
    expect(text).toContain('New File');
    expect(text).toContain('Copy');
  });
});
