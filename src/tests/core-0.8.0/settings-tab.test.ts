/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { SettingsTab } from '../../renderer/components/SettingsTab';
import type { SettingsSection } from '../../renderer/components/SettingsTab';

// Mock window.api
const mockApi = {
  getSetting: jest.fn().mockResolvedValue(undefined),
  setSetting: jest.fn().mockResolvedValue(undefined),
  terminalKill: jest.fn().mockResolvedValue({ success: true }),
  browseForExecutable: jest.fn().mockResolvedValue(null),
  getPlatform: jest.fn().mockResolvedValue('win32'),
  checkWslAvailable: jest.fn().mockResolvedValue(false),
};
(window as any).api = mockApi;

describe('SettingsTab', () => {
  let container: HTMLElement;
  let tab: SettingsTab;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.clearAllMocks();
    tab = new SettingsTab();
    tab.mount(container);
  });

  afterEach(() => {
    tab.destroy();
    container.remove();
  });

  it('should create a div element', () => {
    expect(tab.getElement().tagName).toBe('DIV');
  });

  it('should default to terminal section', () => {
    expect(tab.section).toBe('terminal');
  });

  it('should render terminal settings heading', async () => {
    // Wait for async loadShellSettings
    await new Promise(r => setTimeout(r, 10));
    const h2 = tab.getElement().querySelector('h2');
    expect(h2?.textContent).toBe('Terminal Settings');
  });

  it('should render shell selection options', async () => {
    await new Promise(r => setTimeout(r, 10));
    const content = tab.getElement().querySelector('div');
    const text = content?.textContent || '';
    expect(text).toContain('Git Bash');
    expect(text).toContain('Command Prompt');
    expect(text).toContain('PowerShell');
    expect(text).toContain('WSL Bash');
  });

  it('should render editor settings with VI Mode toggle', () => {
    tab.section = 'editor';
    const h2 = tab.getElement().querySelector('h2');
    expect(h2?.textContent).toBe('Editor Settings');
    const text = tab.getElement().textContent || '';
    expect(text).toContain('VI Mode');
    expect(text).toContain('Enable VI mode emulation in the editor');
    const checkbox = tab.getElement().querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);
  });

  it('disables Preserve Novi Keybindings and labels it "(disabled)" while VI Mode is off', () => {
    tab.section = 'editor';
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Preserve Novi Keybindings (disabled)');

    const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    const preserveBox = checkboxes[1]; // VI Mode, Preserve Novi Keybindings, ...
    expect(preserveBox.disabled).toBe(true);
  });

  it('enables Preserve Novi Keybindings and persists/broadcasts it once VI Mode is turned on', async () => {
    tab.section = 'editor';
    const vimEventSpy = jest.fn();
    const preserveEventSpy = jest.fn();
    window.addEventListener('novi-vimode-changed', vimEventSpy);
    window.addEventListener('novi-preservenovikeybindingsinvim-changed', preserveEventSpy);
    try {
      const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      const vimBox = checkboxes[0];
      vimBox.checked = true;
      vimBox.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApi.setSetting).toHaveBeenCalledWith('vimode', true);
      expect(vimEventSpy).toHaveBeenCalledTimes(1);

      const text = tab.getElement().textContent || '';
      expect(text).not.toContain('Preserve Novi Keybindings (disabled)');

      const checkboxesAfter = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      const preserveBox = checkboxesAfter[1];
      expect(preserveBox.disabled).toBe(false);

      preserveBox.checked = true;
      preserveBox.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApi.setSetting).toHaveBeenCalledWith('preserveNoviKeybindingsInVim', true);
      expect(preserveEventSpy).toHaveBeenCalledTimes(1);
      expect((preserveEventSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ enabled: true });
    } finally {
      window.removeEventListener('novi-vimode-changed', vimEventSpy);
      window.removeEventListener('novi-preservenovikeybindingsinvim-changed', preserveEventSpy);
    }
  });

  it('should render Word Wrap, Column Break (with Hard Break), and Show Ruler, all off by default', () => {
    tab.section = 'editor';
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Word Wrap');
    expect(text).toContain('Column Break');
    expect(text).toContain('Hard Break');
    expect(text).toContain('Show Ruler');
    expect(text).toContain('ignored while Word Wrap is on');

    const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    // VI Mode, Preserve Novi Keybindings, Word Wrap, Column Break, Hard Break, Show Ruler, Insert Spaces
    expect(checkboxes.length).toBe(7);
    // Insert Spaces (index 6) defaults to checked; everything else here defaults to off.
    for (let i = 0; i < checkboxes.length; i++) expect(checkboxes[i].checked).toBe(i === 6);
  });

  it('disables Hard Break and labels it "(disabled)" once Word Wrap is turned on', async () => {
    tab.section = 'editor';
    const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    const wordWrapBox = checkboxes[2]; // VI Mode, Preserve Novi Keybindings, Word Wrap, ...
    wordWrapBox.checked = true;
    wordWrapBox.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 10)); // onChange awaits setSetting before re-rendering

    const text = tab.getElement().textContent || '';
    expect(text).toContain('Hard Break (disabled)');

    const checkboxesAfter = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    const hardBreakBox = checkboxesAfter[4]; // VI Mode, Preserve Novi Keybindings, Word Wrap, Column Break, Hard Break, ...
    expect(hardBreakBox.disabled).toBe(true);

    // Disabled rows never attach a change listener — dispatching one directly should no-op.
    mockApi.setSetting.mockClear();
    hardBreakBox.dispatchEvent(new Event('change'));
    expect(mockApi.setSetting).not.toHaveBeenCalledWith('columnbreakhard', expect.anything());
  });

  it('keeps Hard Break enabled and unlabeled while Word Wrap is off', () => {
    tab.section = 'editor';
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Hard Break');
    expect(text).not.toContain('Hard Break (disabled)');

    const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    expect(checkboxes[4].disabled).toBe(false);
  });

  it('should default the Column Break value text field to 90', () => {
    tab.section = 'editor';
    const numberInput = tab.getElement().querySelector('input[type="text"]') as HTMLInputElement;
    expect(numberInput).not.toBeNull();
    expect(numberInput.value).toBe('90');
    expect((tab.getElement().textContent || '')).toContain('Show a vertical guide line at column 90');
  });

  it('should persist and broadcast Word Wrap toggling', async () => {
    tab.section = 'editor';
    const eventSpy = jest.fn();
    window.addEventListener('novi-wordwrap-changed', eventSpy);
    try {
      const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      const wordWrapBox = checkboxes[2]; // VI Mode, Preserve Novi Keybindings, Word Wrap, ...
      wordWrapBox.checked = true;
      wordWrapBox.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 10)); // onChange is async (awaits setSetting) before dispatching

      expect(mockApi.setSetting).toHaveBeenCalledWith('wordwrap', true);
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ enabled: true });
    } finally {
      window.removeEventListener('novi-wordwrap-changed', eventSpy);
    }
  });

  it('should persist and broadcast Column Break enabling', async () => {
    tab.section = 'editor';
    const eventSpy = jest.fn();
    window.addEventListener('novi-columnbreak-changed', eventSpy);
    try {
      const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      const columnBreakBox = checkboxes[3]; // VI Mode, Preserve Novi Keybindings, Word Wrap, Column Break, ...
      columnBreakBox.checked = true;
      columnBreakBox.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApi.setSetting).toHaveBeenCalledWith('columnbreak', true);
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ enabled: true, value: 90, hard: false });
    } finally {
      window.removeEventListener('novi-columnbreak-changed', eventSpy);
    }
  });

  it('should clamp and persist a new Column Break value on blur', async () => {
    tab.section = 'editor';
    const eventSpy = jest.fn();
    window.addEventListener('novi-columnbreak-changed', eventSpy);
    try {
      const numberInput = tab.getElement().querySelector('input[type="text"]') as HTMLInputElement;
      numberInput.value = '9999';
      numberInput.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 10));

      expect(numberInput.value).toBe('500'); // clamped to the max
      expect(mockApi.setSetting).toHaveBeenCalledWith('columnbreakvalue', 500);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('novi-columnbreak-changed', eventSpy);
    }
  });

  it('should persist and broadcast Show Ruler toggling', async () => {
    tab.section = 'editor';
    const eventSpy = jest.fn();
    window.addEventListener('novi-showruler-changed', eventSpy);
    try {
      const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      const showRulerBox = checkboxes[5]; // VI Mode, Preserve Novi Keybindings, Word Wrap, Column Break, Hard Break, Show Ruler
      showRulerBox.checked = true;
      showRulerBox.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApi.setSetting).toHaveBeenCalledWith('showruler', true);
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ enabled: true, column: 90 });
    } finally {
      window.removeEventListener('novi-showruler-changed', eventSpy);
    }
  });

  it('should render Insert Spaces (checked) and Tab Size (4) by default', () => {
    tab.section = 'editor';
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Insert Spaces');
    expect(text).toContain('Tab Size');

    // VI Mode, Preserve Novi Keybindings, Word Wrap, Column Break, Hard Break, Show Ruler, Insert Spaces
    const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    expect(checkboxes[6].checked).toBe(true);

    const numberInputs = Array.from(tab.getElement().querySelectorAll('input[type="text"]')) as HTMLInputElement[];
    // Order: Column Break's Column, then Tab Size.
    expect(numberInputs[1].value).toBe('4');
  });

  it('should persist and broadcast Insert Spaces toggling and Tab Size changes together', async () => {
    tab.section = 'editor';
    const eventSpy = jest.fn();
    window.addEventListener('novi-editorindentation-changed', eventSpy);
    try {
      const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      const insertSpacesBox = checkboxes[6]; // VI Mode, Preserve Novi Keybindings, Word Wrap, Column Break, Hard Break, Show Ruler, Insert Spaces
      insertSpacesBox.checked = false;
      insertSpacesBox.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApi.setSetting).toHaveBeenCalledWith('editorInsertSpaces', false);
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ insertSpaces: false, tabSize: 4 });

      const numberInputs = Array.from(tab.getElement().querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      const tabSizeInput = numberInputs[1];
      tabSizeInput.value = '2';
      tabSizeInput.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApi.setSetting).toHaveBeenCalledWith('editorTabSize', 2);
      expect(eventSpy).toHaveBeenCalledTimes(2);
      expect((eventSpy.mock.calls[1][0] as CustomEvent).detail).toEqual({ insertSpaces: false, tabSize: 2 });
    } finally {
      window.removeEventListener('novi-editorindentation-changed', eventSpy);
    }
  });

  it('clamps Tab Size to [1, 8]', async () => {
    tab.section = 'editor';
    const numberInputs = Array.from(tab.getElement().querySelectorAll('input[type="text"]')) as HTMLInputElement[];
    const tabSizeInput = numberInputs[1];
    tabSizeInput.value = '99';
    tabSizeInput.dispatchEvent(new Event('blur'));
    await new Promise((r) => setTimeout(r, 10));

    expect(tabSizeInput.value).toBe('8');
    expect(mockApi.setSetting).toHaveBeenCalledWith('editorTabSize', 8);
  });

  it('should render Editor default font size (14) and font family (DejaVu Sans Mono) by default', () => {
    tab.section = 'editor';
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Default Font Size');
    expect(text).toContain('Font Family');

    const numberInputs = Array.from(tab.getElement().querySelectorAll('input[type="text"]')) as HTMLInputElement[];
    // Order: Column Break's Column, then Tab Size (Indentation), then Default Font Size.
    expect(numberInputs[2].value).toBe('14');

    const select = tab.getElement().querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('DejaVu Sans Mono');
  });

  it('should persist and broadcast Editor default font size changes, clamped to [10, 24]', async () => {
    tab.section = 'editor';
    const eventSpy = jest.fn();
    window.addEventListener('novi-fontsize-changed', eventSpy);
    try {
      const numberInputs = Array.from(tab.getElement().querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      const fontSizeInput = numberInputs[2];
      fontSizeInput.value = '999';
      fontSizeInput.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 10));

      expect(fontSizeInput.value).toBe('24'); // clamped to the max
      expect(mockApi.setSetting).toHaveBeenCalledWith('fontSize', 24);
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ fontSize: 24 });
    } finally {
      window.removeEventListener('novi-fontsize-changed', eventSpy);
    }
  });

  it('should persist and broadcast Editor font family changes', async () => {
    tab.section = 'editor';
    const eventSpy = jest.fn();
    window.addEventListener('novi-editorfontfamily-changed', eventSpy);
    try {
      const select = tab.getElement().querySelector('select') as HTMLSelectElement;
      select.value = 'Consolas';
      select.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 10));

      expect(mockApi.setSetting).toHaveBeenCalledWith('editorFontFamily', 'Consolas');
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ fontFamily: 'Consolas' });
    } finally {
      window.removeEventListener('novi-editorfontfamily-changed', eventSpy);
    }
  });

  it('should render Terminal default font size and font family, and persist/broadcast changes', async () => {
    tab.section = 'terminal';
    await new Promise((r) => setTimeout(r, 10));
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Default Font Size');
    expect(text).toContain('Font Family');

    const fontSizeEventSpy = jest.fn();
    const fontFamilyEventSpy = jest.fn();
    window.addEventListener('novi-terminalfontsize-changed', fontSizeEventSpy);
    window.addEventListener('novi-terminalfontfamily-changed', fontFamilyEventSpy);
    try {
      // Git Bash's path field is also an input[type="text"] and renders
      // first; Font Size then Scrollback follow, after the shell settings.
      const textInputs = Array.from(tab.getElement().querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      const numberInput = textInputs[1];
      expect(numberInput.value).toBe('14');
      numberInput.value = '5';
      numberInput.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 10));
      expect(numberInput.value).toBe('10'); // clamped to the min
      expect(mockApi.setSetting).toHaveBeenCalledWith('terminalFontSize', 10);
      expect(fontSizeEventSpy).toHaveBeenCalledTimes(1);

      const select = tab.getElement().querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('DejaVu Sans Mono');
      select.value = 'Fira Code';
      select.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 10));
      expect(mockApi.setSetting).toHaveBeenCalledWith('terminalFontFamily', 'Fira Code');
      expect(fontFamilyEventSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('novi-terminalfontsize-changed', fontSizeEventSpy);
      window.removeEventListener('novi-terminalfontfamily-changed', fontFamilyEventSpy);
    }
  });

  it('should render Terminal Scrollback defaulting to 25000', async () => {
    tab.section = 'terminal';
    await new Promise((r) => setTimeout(r, 10));
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Scrollback');

    const textInputs = Array.from(tab.getElement().querySelectorAll('input[type="text"]')) as HTMLInputElement[];
    // Git Bash path, Default Font Size, then Scrollback.
    const scrollbackInput = textInputs[2];
    expect(scrollbackInput.value).toBe('25000');
  });

  it('should persist and broadcast Terminal Scrollback changes, clamped to [10000, 200000]', async () => {
    tab.section = 'terminal';
    await new Promise((r) => setTimeout(r, 10));
    const eventSpy = jest.fn();
    window.addEventListener('novi-terminalscrollback-changed', eventSpy);
    try {
      const textInputs = Array.from(tab.getElement().querySelectorAll('input[type="text"]')) as HTMLInputElement[];
      const scrollbackInput = textInputs[2];

      scrollbackInput.value = '5000';
      scrollbackInput.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 10));
      expect(scrollbackInput.value).toBe('10000'); // clamped to the min
      expect(mockApi.setSetting).toHaveBeenCalledWith('terminalScrollback', 10000);
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({ scrollback: 10000 });

      scrollbackInput.value = '999999';
      scrollbackInput.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 10));
      expect(scrollbackInput.value).toBe('200000'); // clamped to the max
      expect(mockApi.setSetting).toHaveBeenCalledWith('terminalScrollback', 200000);
      expect(eventSpy).toHaveBeenCalledTimes(2);
    } finally {
      window.removeEventListener('novi-terminalscrollback-changed', eventSpy);
    }
  });

  it('should render novi settings with all three toggles', () => {
    tab.section = 'novi';
    const h2 = tab.getElement().querySelector('h2');
    expect(h2?.textContent).toBe('Novi Settings');
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Single File Tree');
    expect(text).toContain('file tree follows the active terminal');
    expect(text).toContain('Restore Previous Session');
    expect(text).toContain('restores them on next launch');
    expect(text).toContain('Built-in Git Support');
    expect(text).toContain('Git panel');
    const checkboxes = tab.getElement().querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(3);
  });

  it('should switch sections correctly', () => {
    tab.section = 'editor';
    expect(tab.section).toBe('editor');
    tab.section = 'novi';
    expect(tab.section).toBe('novi');
    tab.section = 'terminal';
    expect(tab.section).toBe('terminal');
  });

  it('should not re-render when setting same section', () => {
    const el = tab.getElement().querySelector('h2');
    tab.section = 'terminal';
    const el2 = tab.getElement().querySelector('h2');
    expect(el).toBe(el2);
  });

  it('should cycle through all sections', async () => {
    // The very first iteration below re-assigns 'terminal' onto a tab that
    // already defaults to 'terminal' — a no-op for the `section` setter (it
    // only re-renders on an actual change), so it depends on the
    // constructor's own async loadSettings().then(() => this.render()) —
    // fired at construction time, unlike every other test here — having
    // already resolved. Give it a tick first rather than relying on
    // however many microtask hops loadSettings() happens to need.
    await new Promise((r) => setTimeout(r, 10));
    const sections: SettingsSection[] = ['terminal', 'editor', 'novi'];
    for (const section of sections) {
      tab.section = section;
      expect(tab.section).toBe(section);
      const h2 = tab.getElement().querySelector('h2');
      expect(h2?.textContent).toContain('Settings');
    }
  });
});
