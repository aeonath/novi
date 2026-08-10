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

  it('renders the heading and Novi/Terminal+Editor/Editor sub-tabs', () => {
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Keyboard Shortcuts');
    expect(text).toContain('Novi');
    expect(text).toContain('Terminal + Editor');
    expect(text).toContain('Editor');
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

  it('unchecking Use Defaults reveals a recorder box per shortcut and persists the setting', async () => {
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await flush();

    expect(mockApi.setSetting).toHaveBeenCalledWith(
      'keyboardShortcuts',
      expect.objectContaining({ novi: expect.objectContaining({ useDefaults: false }) })
    );

    const recorderBoxes = Array.from(tab.getElement().querySelectorAll('div')).filter(
      d => d.title === 'Click, then press a key combination'
    );
    expect(recorderBoxes.length).toBeGreaterThan(0);
  });

  it('recording a free key combination for New File saves the override', async () => {
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

  it('switching to the Terminal + Editor sub-tab shows its own Use Defaults toggle and its shared shortcuts', () => {
    const pills = Array.from(tab.getElement().querySelectorAll('div')).filter(d => d.textContent === 'Terminal + Editor');
    expect(pills.length).toBeGreaterThan(0);
    pills[0].click();
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Terminal + Editor');
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    // Copy/Paste/Select All/etc. are shared between the terminal and the
    // editor, with one config entry each — confirm they actually render.
    expect(text).toContain('Copy');
    expect(text).toContain('Select All');
    expect(text).toContain('Ctrl+A');
    // Save/Close File/Fold/Rename Symbol etc. have no meaning in a terminal
    // (and Ctrl+S/Ctrl+Z collide with real terminal XOFF/SIGTSTP semantics)
    // so they must NOT appear here — they live under the Editor sub-tab only.
    expect(text).not.toContain('Save');
    expect(text).not.toContain('Fold');
    expect(text).not.toContain('Rename Symbol');
  });

  it('switching to the Editor sub-tab shows editor-only commands (Save, Close File, Monaco built-ins) but not terminal ones', () => {
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
    // Shared Terminal + Editor shortcuts (e.g. Cut/Copy/Paste) belong on their
    // own sub-tab, not here.
    expect(text).not.toContain('Paste');
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

  it('recording a Terminal + Editor shortcut (Select All) persists under the editorTerminal category', async () => {
    const pills = Array.from(tab.getElement().querySelectorAll('div')).filter(d => d.textContent === 'Terminal + Editor');
    pills[0].click();

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
});
