/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * TabBar — Vanilla TypeScript tab management component.
 * Replaces React TabBar.tsx.
 */

import { Component } from '../core/component.js';
import { el, clearChildren } from '../core/dom.js';
import { markReady } from '../utils/ready-events.js';

export interface Tab {
  id: string;
  type: 'file' | 'terminal' | 'image' | 'novi-prompt';
  filePath: string;
  fileName: string;
  isDirty: boolean;
  content: string;
  language: string;
}

export interface TabBarConfig {
  onTabSwitch?: (tab: Tab) => void;
  onTabClose?: (tabId: string) => Promise<boolean>;
  onAllTabsClosed?: () => void;
  getPreferredNextTabId?: () => string | null;
  pinnedTabIds?: Set<string>;
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': case 'jsx': case 'ts': case 'tsx': return '\u{1F4DC}';
    case 'json': return '\u{1F4CB}';
    case 'md': return '\u{1F4DD}';
    case 'html': case 'htm': return '\u{1F310}';
    case 'css': case 'scss': case 'less': return '\u{1F3A8}';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': return '\u{1F5BC}\uFE0F';
    default: return '\u{1F4C4}';
  }
}

export class TabBar extends Component {
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;
  private config: TabBarConfig;
  private contextMenu: HTMLElement | null = null;

  constructor(config: TabBarConfig) {
    super('div', 'tab-bar-container');
    this.config = config;
    Object.assign(this.el.style, {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#252526',
      borderBottom: '1px solid #3e3e42',
      minHeight: '35px',
      overflowX: 'auto',
      overflowY: 'hidden',
      userSelect: 'none',
    });
    this.render();
  }

  protected onMount(): void {
    // Expose window API for backward compatibility
    (window as any).__tabBarAPI = {
      addTab: (tab: Tab) => this.addTab(tab),
      removeTab: (tabId: string) => this.removeTab(tabId),
      switchTab: (tabId: string) => this.switchTab(tabId),
      updateTabDirty: (tabId: string, isDirty: boolean) => this.updateTabDirty(tabId, isDirty),
      updateTabContent: (tabId: string, content: string) => this.updateTabContent(tabId, content),
      updateTabFileName: (tabId: string, fileName: string) => this.updateTabFileName(tabId, fileName),
      getActiveTab: () => this.getActiveTab(),
      getTabs: () => this.getTabs(),
      setActiveTab: (tabId: string) => this.switchTab(tabId),
      closeTab: (tabId: string) => this.removeTab(tabId),
    };
    markReady('tabbar-ready');

    // Close context menu on click outside
    this.listen(document, 'click', () => this.hideContextMenu());
    this.listen(window as any, 'novi-close-context-menus' as any, () => this.hideContextMenu());
  }

  protected onDestroy(): void {
    delete (window as any).__tabBarAPI;
    this.hideContextMenu();
  }

  updateConfig(config: Partial<TabBarConfig>): void {
    Object.assign(this.config, config);
  }

  addTab(tab: Tab): void {
    // For file, image, and novi-prompt tabs, check if tab already exists by filePath
    if (tab.type === 'file' || tab.type === 'image' || tab.type === 'novi-prompt') {
      const existing = this.tabs.find(t =>
        (t.type === 'file' || t.type === 'image' || t.type === 'novi-prompt') &&
        t.filePath === tab.filePath
      );
      if (existing) {
        this.activeTabId = existing.id;
        this.config.onTabSwitch?.(existing);
        this.render();
        return;
      }
    }
    this.tabs.push(tab);
    this.activeTabId = tab.id;
    this.config.onTabSwitch?.(tab);
    this.render();
  }

  async removeTab(tabId: string): Promise<boolean> {
    if (this.config.pinnedTabIds?.has(tabId)) return false;

    if (this.config.onTabClose) {
      const canClose = await this.config.onTabClose(tabId);
      if (!canClose) return false;
    }

    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return false;

    this.tabs = this.tabs.filter(t => t.id !== tabId);

    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        const preferredId = this.config.getPreferredNextTabId?.() ?? null;
        const nextTab = preferredId && this.tabs.some(t => t.id === preferredId)
          ? this.tabs.find(t => t.id === preferredId)!
          : this.tabs[Math.min(tabIndex, this.tabs.length - 1)];
        this.activeTabId = nextTab.id;
        this.config.onTabSwitch?.(nextTab);
      } else {
        this.activeTabId = null;
        this.config.onAllTabsClosed?.();
      }
    }

    this.render();
    return true;
  }

  switchTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.activeTabId = tabId;
      this.config.onTabSwitch?.(tab);
      this.render();
    }
  }

  updateTabDirty(tabId: string, isDirty: boolean): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.isDirty = isDirty;
      this.render();
    }
  }

  updateTabFileName(tabId: string, fileName: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.fileName = fileName;
      this.render();
    }
  }

  updateTabContent(tabId: string, content: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) tab.content = content;
  }

  getActiveTab(): Tab | null {
    return this.tabs.find(t => t.id === this.activeTabId) ?? null;
  }

  getTabs(): Tab[] {
    return [...this.tabs];
  }

  private render(): void {
    clearChildren(this.el);

    if (this.tabs.length === 0) {
      this.el.appendChild(el('div', {
        style: 'padding: 8px 16px; font-size: 12px; color: #858585; font-style: italic;',
      }, 'No files open'));
      return;
    }

    for (const tab of this.tabs) {
      this.el.appendChild(this.createTabElement(tab));
    }
  }

  private createTabElement(tab: Tab): HTMLElement {
    const isActive = tab.id === this.activeTabId;
    const isPinned = this.config.pinnedTabIds?.has(tab.id) ?? false;

    const tabEl = el('div', {
      style: [
        'display: flex', 'align-items: center', 'padding: 8px 12px',
        'font-size: 13px', 'cursor: pointer', 'border-right: 1px solid #3e3e42',
        'transition: background-color 0.15s ease', 'min-width: 100px', 'max-width: 200px',
        `background-color: ${isActive ? '#3e3e40' : '#2d2d30'}`,
        `color: ${isActive ? '#ffffff' : '#cccccc'}`,
      ].join(';'),
    });

    // Label
    const label = el('span', {
      style: [
        'flex: 1', 'overflow: hidden', 'text-overflow: ellipsis', 'white-space: nowrap',
        isActive && tab.type === 'terminal' ? 'color: #4ec9b0' : '',
      ].join(';'),
    });
    const labelText = tab.type === 'file' ? `${getFileIcon(tab.fileName)} ${tab.fileName}` : tab.fileName;
    label.textContent = labelText;
    if (tab.type === 'file' && tab.isDirty) {
      const dirty = el('span', { style: 'color: #e0e0e0; font-weight: bold; font-size: 14px;' }, ' \u25CF');
      label.appendChild(dirty);
    }
    tabEl.appendChild(label);

    // Close button
    if (!isPinned) {
      const closeBtn = el('button', {
        style: [
          'margin-left: 8px', 'border: none', 'background: transparent',
          'color: #cccccc', 'font-size: 16px', 'line-height: 13px',
          'cursor: pointer', 'padding: 0', 'opacity: 1',
          'transition: opacity 0.15s ease', 'vertical-align: middle',
          'position: relative', 'top: 2px',
        ].join(';'),
      }, '\u00D7');
      closeBtn.setAttribute('aria-label', 'Close tab');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        void this.removeTab(tab.id);
      });
      tabEl.appendChild(closeBtn);
    }

    // Hover
    tabEl.addEventListener('mouseenter', () => {
      if (!isActive) tabEl.style.backgroundColor = '#323233';
    });
    tabEl.addEventListener('mouseleave', () => {
      tabEl.style.backgroundColor = isActive ? '#3e3e40' : '#2d2d30';
    });

    // Click
    tabEl.addEventListener('click', () => this.switchTab(tab.id));

    // Context menu
    tabEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('novi-close-context-menus'));
      this.showContextMenu(e.clientX, e.clientY, tab);
    });

    return tabEl;
  }

  private showContextMenu(x: number, y: number, tab: Tab): void {
    this.hideContextMenu();
    if (tab.type !== 'novi-prompt') return;
    const menu = el('div', {
      style: [
        'position: fixed', `left: ${x}px`, `top: ${y}px`,
        'background-color: #252526', 'border: 1px solid #3e3e42',
        'border-radius: 4px', 'box-shadow: 0 2px 8px rgba(0,0,0,0.3)',
        'z-index: 10000', 'min-width: 150px', 'padding: 4px 0',
      ].join(';'),
    });
    menu.addEventListener('click', (e) => e.stopPropagation());

    const itemStyle = "padding: 6px 12px; cursor: pointer; color: #cccccc; font-size: 13px; font-family: 'Segoe UI', sans-serif;";

    const copyItem = el('div', { style: itemStyle }, 'Copy');
    copyItem.addEventListener('click', () => {
      (window as any).__noviShellCopy?.();
      this.hideContextMenu();
    });

    const pasteItem = el('div', { style: itemStyle }, 'Paste');
    pasteItem.addEventListener('click', () => {
      (window as any).__noviShellPaste?.();
      this.hideContextMenu();
    });

    const sep = el('div', { style: 'height: 1px; background-color: #3e3e42; margin: 4px 0;' });

    const closeItem = el('div', { style: itemStyle }, 'Close');
    closeItem.addEventListener('click', () => {
      void this.removeTab(tab.id);
      this.hideContextMenu();
    });

    menu.appendChild(copyItem);
    menu.appendChild(pasteItem);
    menu.appendChild(sep);
    menu.appendChild(closeItem);

    document.body.appendChild(menu);
    this.contextMenu = menu;
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
      this.contextMenuTab = null;
    }
  }
}
