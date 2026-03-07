/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { SettingsSidebar } from '../../renderer/components/SettingsSidebar';
import type { SettingsSection } from '../../renderer/components/SettingsTab';

describe('SettingsSidebar', () => {
  let container: HTMLElement;
  let sidebar: SettingsSidebar;
  let selectedSection: SettingsSection | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    selectedSection = null;
    sidebar = new SettingsSidebar({
      onSectionSelect: (section) => { selectedSection = section; },
    });
    sidebar.mount(container);
  });

  afterEach(() => {
    sidebar.destroy();
    container.remove();
  });

  it('should create a div element', () => {
    expect(sidebar.getElement().tagName).toBe('DIV');
  });

  it('should default to terminal section', () => {
    expect(sidebar.section).toBe('terminal');
  });

  it('should render SETTINGS header', () => {
    const header = sidebar.getElement().children[0];
    expect(header?.textContent).toBe('SETTINGS');
  });

  it('should render three section items', () => {
    const listEl = sidebar.getElement().children[1];
    expect(listEl?.children.length).toBe(3);
  });

  it('should render Terminal, Editor, Novi labels', () => {
    const listEl = sidebar.getElement().children[1];
    const labels = Array.from(listEl!.children).map(c => c.textContent);
    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Terminal'),
        expect.stringContaining('Editor'),
        expect.stringContaining('Novi'),
      ])
    );
  });

  it('should highlight terminal item by default', () => {
    const listEl = sidebar.getElement().children[1];
    const firstItem = listEl!.children[0] as HTMLElement;
    expect(firstItem.style.backgroundColor).toBe('rgb(55, 55, 61)');
    expect(firstItem.style.color).toBe('rgb(255, 255, 255)');
  });

  it('should call onSectionSelect when clicking a section', () => {
    const listEl = sidebar.getElement().children[1];
    const editorItem = listEl!.children[1] as HTMLElement;
    editorItem.click();
    expect(selectedSection).toBe('editor');
  });

  it('should update active section on click', () => {
    const listEl = sidebar.getElement().children[1];
    const noviItem = listEl!.children[2] as HTMLElement;
    noviItem.click();
    expect(sidebar.section).toBe('novi');
  });

  it('should update highlight after clicking a new section', () => {
    const listEl = sidebar.getElement().children[1];
    const editorItem = listEl!.children[1] as HTMLElement;
    editorItem.click();
    // After re-render, get fresh references
    const updatedList = sidebar.getElement().children[1];
    const updatedEditor = updatedList!.children[1] as HTMLElement;
    expect(updatedEditor.style.backgroundColor).toBe('rgb(55, 55, 61)');
    expect(updatedEditor.style.color).toBe('rgb(255, 255, 255)');
  });

  it('should programmatically set section', () => {
    sidebar.section = 'novi';
    expect(sidebar.section).toBe('novi');
    const listEl = sidebar.getElement().children[1];
    const noviItem = listEl!.children[2] as HTMLElement;
    expect(noviItem.style.backgroundColor).toBe('rgb(55, 55, 61)');
  });
});
