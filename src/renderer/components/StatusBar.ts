/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * StatusBar - Bottom status bar (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  priority?: number;
}

type StatusBarSection = 'left' | 'center' | 'right';

export class StatusBar extends Component {
  private items = new Map<string, { item: StatusBarItem; section: StatusBarSection }>();
  private leftSection: HTMLElement;
  private centerSection: HTMLElement;
  private rightSection: HTMLElement;
  private pathSpan: HTMLElement;
  private homeBtn: HTMLElement;

  private _fileTreePath: string | null = null;
  private _onHomeClick: (() => void) | null = null;

  constructor() {
    super('div');
    setStyles(this.el, {
      display: 'flex',
      height: '24px',
      backgroundColor: '#1e3a5f',
      color: '#ffffff',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontSize: '12px',
      userSelect: 'none',
      borderTop: '1px solid #005a9e',
    });

    this.pathSpan = el('span');
    setStyles(this.pathSpan, {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '40vw',
      opacity: '0.9',
    });
    this.pathSpan.style.display = 'none';

    this.leftSection = el('div', {}, this.pathSpan);
    setStyles(this.leftSection, { display: 'flex', alignItems: 'center', gap: '12px', flex: '1' });

    this.centerSection = el('div');
    setStyles(this.centerSection, { display: 'flex', alignItems: 'center', gap: '12px', flex: '1', justifyContent: 'center' });

    this.rightSection = el('div');
    setStyles(this.rightSection, { display: 'flex', alignItems: 'center', gap: '8px', flex: '1', justifyContent: 'flex-end' });

    this.homeBtn = el('button', { type: 'button', 'aria-label': 'Home' }, '\u2302');
    setStyles(this.homeBtn, {
      padding: '2px 8px',
      fontSize: '14px',
      lineHeight: '1',
      background: 'transparent',
      border: 'none',
      color: '#ffffff',
      cursor: 'pointer',
      borderRadius: '2px',
    });
    this.homeBtn.title = 'Go to Home terminal';
    this.homeBtn.addEventListener('click', () => this._onHomeClick?.());
    this.homeBtn.style.display = 'none';

    this.rightSection.appendChild(this.homeBtn);
    this.el.append(this.leftSection, this.centerSection, this.rightSection);

    // Default status
    this.items.set('main-status', { item: { id: 'main-status', text: 'Ready', priority: 100 }, section: 'center' });
    this.render();

    // Expose API on window for backward compat
    (window as any).__statusBarAPI = {
      setStatus: (text: string, tooltip?: string) => this.setStatus(text, tooltip),
      addItem: (item: StatusBarItem, section?: StatusBarSection) => this.addItem(item, section),
      removeItem: (id: string) => this.removeItem(id),
    };
  }

  set fileTreePath(path: string | null) {
    this._fileTreePath = path;
    if (path) {
      this.pathSpan.textContent = path;
      this.pathSpan.title = path;
      this.pathSpan.style.display = '';
    } else {
      this.pathSpan.style.display = 'none';
    }
  }

  set onHomeClick(fn: (() => void) | null) {
    this._onHomeClick = fn;
    this.homeBtn.style.display = fn ? '' : 'none';
  }

  setStatus(text: string, tooltip?: string): void {
    this.items.set('main-status', {
      item: { id: 'main-status', text, tooltip, priority: 100 },
      section: 'center',
    });
    this.render();
  }

  addItem(item: StatusBarItem, section: StatusBarSection = 'right'): void {
    this.items.set(item.id, { item, section });
    this.render();
  }

  removeItem(id: string): void {
    this.items.delete(id);
    this.render();
  }

  private render(): void {
    const bySection: Record<StatusBarSection, StatusBarItem[]> = { left: [], center: [], right: [] };
    this.items.forEach(({ item, section }) => bySection[section].push(item));

    for (const key of Object.keys(bySection) as StatusBarSection[]) {
      bySection[key].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }

    // Rebuild left (keep pathSpan)
    clearChildren(this.leftSection);
    this.leftSection.appendChild(this.pathSpan);
    for (const item of bySection.left) {
      this.leftSection.appendChild(this.createItemEl(item));
    }

    // Rebuild center
    clearChildren(this.centerSection);
    for (const item of bySection.center) {
      this.centerSection.appendChild(this.createItemEl(item));
    }

    // Rebuild right (keep homeBtn)
    clearChildren(this.rightSection);
    for (const item of bySection.right) {
      this.rightSection.appendChild(this.createItemEl(item));
    }
    this.rightSection.appendChild(this.homeBtn);
  }

  private createItemEl(item: StatusBarItem): HTMLElement {
    const div = el('div', {}, item.text);
    setStyles(div, {
      padding: '2px 6px',
      cursor: 'default',
      whiteSpace: 'nowrap',
      transition: 'background-color 0.15s ease',
    });
    if (item.tooltip) div.title = item.tooltip;
    div.addEventListener('mouseenter', () => { div.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; });
    div.addEventListener('mouseleave', () => { div.style.backgroundColor = 'transparent'; });
    return div;
  }

  protected onDestroy(): void {
    delete (window as any).__statusBarAPI;
  }
}
