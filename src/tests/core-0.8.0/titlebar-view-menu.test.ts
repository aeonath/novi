/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for TitleBar's View menu enable/disable rules.
 *
 * Toggle Word Wrap / Toggle Line Numbers are Monaco (editor-tab) concepts —
 * grayed out on a terminal tab. Increase/Decrease/Reset Font Size work on
 * both a terminal tab (terminal font size) and a file tab (editor font
 * size). Show Hidden Files acts on the file tree, which is hidden whenever
 * the Settings tab is active or the Git panel has replaced it in the
 * sidebar — grayed out in both cases.
 */

import { TitleBar } from '../../renderer/components/TitleBar';

function isDisabled(el: HTMLElement): boolean {
  return el.style.opacity === '0.5';
}

describe('TitleBar View menu enable/disable', () => {
  let titleBar: TitleBar;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    titleBar?.destroy();
    container.remove();
    document.querySelectorAll('.menu-dropdown').forEach((el) => el.remove());
  });

  function openViewMenu(activeTabType: string | null, showGitPanel = false): Map<string, HTMLElement> {
    titleBar = new TitleBar({ activeTabType, showGitPanel });
    titleBar.mount(container);

    const viewBtn = Array.from(container.querySelectorAll('.menu-button'))
      .find((b) => b.textContent === 'View') as HTMLElement;
    viewBtn.click();

    const dropdown = document.querySelector('.menu-dropdown') as HTMLElement;
    const items = new Map<string, HTMLElement>();
    dropdown.querySelectorAll(':scope > div').forEach((row) => {
      const label = row.querySelector('span')?.textContent;
      if (label) items.set(label, row as HTMLElement);
    });
    return items;
  }

  it('grays out Toggle Word Wrap and Toggle Line Numbers on a terminal tab', () => {
    const items = openViewMenu('terminal');
    expect(isDisabled(items.get('Toggle Word Wrap')!)).toBe(true);
    expect(isDisabled(items.get('Toggle Line Numbers')!)).toBe(true);
  });

  it('keeps Increase/Decrease/Reset Font Size enabled on a terminal tab', () => {
    const items = openViewMenu('terminal');
    expect(isDisabled(items.get('Increase Font Size')!)).toBe(false);
    expect(isDisabled(items.get('Decrease Font Size')!)).toBe(false);
    expect(isDisabled(items.get('Reset Font Size')!)).toBe(false);
  });

  it('enables Toggle Word Wrap and Toggle Line Numbers on a file tab', () => {
    const items = openViewMenu('file');
    expect(isDisabled(items.get('Toggle Word Wrap')!)).toBe(false);
    expect(isDisabled(items.get('Toggle Line Numbers')!)).toBe(false);
  });

  it('keeps Increase/Decrease/Reset Font Size enabled on a file tab', () => {
    const items = openViewMenu('file');
    expect(isDisabled(items.get('Increase Font Size')!)).toBe(false);
    expect(isDisabled(items.get('Decrease Font Size')!)).toBe(false);
    expect(isDisabled(items.get('Reset Font Size')!)).toBe(false);
  });

  it('enables Show Hidden Files on a normal file-tree view', () => {
    const items = openViewMenu('terminal', false);
    expect(isDisabled(items.get('Show Hidden Files')!)).toBe(false);
  });

  it('grays out Show Hidden Files when the Git panel is showing', () => {
    const items = openViewMenu('terminal', true);
    expect(isDisabled(items.get('Show Hidden Files')!)).toBe(true);
  });

  it('grays out Show Hidden Files on the Settings tab', () => {
    const items = openViewMenu('settings', false);
    expect(isDisabled(items.get('Show Hidden Files')!)).toBe(true);
  });

  it('does not gray out font size commands when the Git panel is showing', () => {
    const items = openViewMenu('terminal', true);
    expect(isDisabled(items.get('Increase Font Size')!)).toBe(false);
  });
});
