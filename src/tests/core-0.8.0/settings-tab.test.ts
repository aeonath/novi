/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { SettingsTab } from '../../renderer/components/SettingsTab';
import type { SettingsSection } from '../../renderer/components/SettingsTab';

describe('SettingsTab', () => {
  let container: HTMLElement;
  let tab: SettingsTab;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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

  it('should display "Terminal Settings" heading by default', () => {
    const h2 = tab.getElement().querySelector('h2');
    expect(h2?.textContent).toBe('Terminal Settings');
  });

  it('should display "Settings coming." placeholder', () => {
    const p = tab.getElement().querySelector('p');
    expect(p?.textContent).toBe('Settings coming.');
  });

  it('should switch to editor section', () => {
    tab.section = 'editor';
    expect(tab.section).toBe('editor');
    const h2 = tab.getElement().querySelector('h2');
    expect(h2?.textContent).toBe('Editor Settings');
  });

  it('should switch to novi section', () => {
    tab.section = 'novi';
    expect(tab.section).toBe('novi');
    const h2 = tab.getElement().querySelector('h2');
    expect(h2?.textContent).toBe('Novi Settings');
  });

  it('should not re-render when setting same section', () => {
    const el = tab.getElement().querySelector('h2');
    tab.section = 'terminal';
    const el2 = tab.getElement().querySelector('h2');
    expect(el).toBe(el2);
  });

  it('should re-render when setting different section', () => {
    const el = tab.getElement().querySelector('h2');
    tab.section = 'editor';
    const el2 = tab.getElement().querySelector('h2');
    expect(el).not.toBe(el2);
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
