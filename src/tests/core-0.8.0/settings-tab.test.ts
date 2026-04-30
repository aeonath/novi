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
