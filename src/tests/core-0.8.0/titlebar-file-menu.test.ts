/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for TitleBar's File menu enable/disable rules.
 *
 * Close File only ever acts on a 'file' tab (App.onCloseFile is a silent
 * no-op for any other tab type) — grayed out on a terminal tab (and any
 * other non-file tab). New File / Open File apply regardless of the active
 * tab and stay enabled everywhere.
 */

import { TitleBar } from '../../renderer/components/TitleBar';

function isDisabled(el: HTMLElement): boolean {
  return el.style.opacity === '0.5';
}

describe('TitleBar File menu enable/disable', () => {
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

  function openFileMenu(activeTabType: string | null): Map<string, HTMLElement> {
    titleBar = new TitleBar({ activeTabType });
    titleBar.mount(container);

    const fileBtn = Array.from(container.querySelectorAll('.menu-button'))
      .find((b) => b.textContent === 'File') as HTMLElement;
    fileBtn.click();

    const dropdown = document.querySelector('.menu-dropdown') as HTMLElement;
    const items = new Map<string, HTMLElement>();
    dropdown.querySelectorAll(':scope > div').forEach((row) => {
      const label = row.querySelector('span')?.textContent;
      if (label) items.set(label, row as HTMLElement);
    });
    return items;
  }

  it('grays out Close File on a terminal tab but keeps New/Open File enabled', () => {
    const items = openFileMenu('terminal');
    expect(isDisabled(items.get('Close File')!)).toBe(true);
    expect(isDisabled(items.get('New File')!)).toBe(false);
    expect(isDisabled(items.get('Open File…')!)).toBe(false);
  });

  it('enables Close File on a file tab', () => {
    const items = openFileMenu('file');
    expect(isDisabled(items.get('Close File')!)).toBe(false);
  });

  it('grays out Close File when no tab is active', () => {
    const items = openFileMenu(null);
    expect(isDisabled(items.get('Close File')!)).toBe(true);
    expect(isDisabled(items.get('New File')!)).toBe(false);
    expect(isDisabled(items.get('Open File…')!)).toBe(false);
  });
});
