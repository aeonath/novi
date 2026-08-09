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

  it('should render Word Wrap, Column Break (with Hard Break), and Show Ruler, all off by default', () => {
    tab.section = 'editor';
    const text = tab.getElement().textContent || '';
    expect(text).toContain('Word Wrap');
    expect(text).toContain('Column Break');
    expect(text).toContain('Hard Break');
    expect(text).toContain('Show Ruler');
    expect(text).toContain('ignored while Word Wrap is on');

    const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    // VI Mode, Word Wrap, Column Break, Hard Break, Show Ruler
    expect(checkboxes.length).toBe(5);
    for (const cb of checkboxes) expect(cb.checked).toBe(false);
  });

  it('disables Hard Break and labels it "(disabled)" once Word Wrap is turned on', async () => {
    tab.section = 'editor';
    const checkboxes = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    const wordWrapBox = checkboxes[1]; // VI Mode, Word Wrap, ...
    wordWrapBox.checked = true;
    wordWrapBox.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 10)); // onChange awaits setSetting before re-rendering

    const text = tab.getElement().textContent || '';
    expect(text).toContain('Hard Break (disabled)');

    const checkboxesAfter = Array.from(tab.getElement().querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    const hardBreakBox = checkboxesAfter[3]; // VI Mode, Word Wrap, Column Break, Hard Break, ...
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
    expect(checkboxes[3].disabled).toBe(false);
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
      const wordWrapBox = checkboxes[1]; // VI Mode, Word Wrap, ...
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
      const columnBreakBox = checkboxes[2]; // VI Mode, Word Wrap, Column Break, ...
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
      const showRulerBox = checkboxes[4]; // VI Mode, Word Wrap, Column Break, Hard Break, Show Ruler
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

  it('should cycle through all sections', () => {
    const sections: SettingsSection[] = ['terminal', 'editor', 'novi'];
    for (const section of sections) {
      tab.section = section;
      expect(tab.section).toBe(section);
      const h2 = tab.getElement().querySelector('h2');
      expect(h2?.textContent).toContain('Settings');
    }
  });
});
