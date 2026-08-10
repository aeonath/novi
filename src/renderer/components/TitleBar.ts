/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * TitleBar — Vanilla TypeScript custom title bar with window controls and menu.
 * Replaces React TitleBar.tsx.
 */

import { Component } from '../core/component.js';
import { el } from '../core/dom.js';

interface MenuItem {
  label?: string;
  command?: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  checkbox?: boolean;
  settingKey?: string;
  settingDefault?: boolean;
  mainManaged?: boolean; // Setting is toggled by main process, not renderer
}

export interface TitleBarConfig {
  title?: string;
  onCommand?: (command: string) => void;
  activeTabType?: string | null;
  showGitPanel?: boolean;
}

const MENUS: Record<string, MenuItem[]> = {
  File: [
    { label: 'New File', command: 'new-file', shortcut: 'Ctrl+N' },
    { label: 'Open File\u2026', command: 'open-file', shortcut: 'Ctrl+O' },
    { separator: true },
    { label: 'Save', command: 'save', shortcut: 'Ctrl+S' },
    { label: 'Save As\u2026', command: 'save-as', shortcut: 'Ctrl+Shift+S' },
    { separator: true },
    { label: 'Close File', command: 'close-file', shortcut: 'Ctrl+W' },
    { separator: true },
    { label: 'Exit', command: 'exit', shortcut: 'Alt+F4' },
  ],
  Edit: [
    { label: 'Undo', command: 'undo', shortcut: 'Ctrl+Z' },
    { label: 'Redo', command: 'redo', shortcut: 'Ctrl+Y' },
    { separator: true },
    { label: 'Cut', command: 'cut', shortcut: 'Ctrl+X' },
    { label: 'Copy', command: 'copy', shortcut: 'Ctrl+C' },
    { label: 'Paste', command: 'paste', shortcut: 'Ctrl+V' },
    { separator: true },
    { label: 'Select All', command: 'select-all', shortcut: 'Ctrl+A' },
  ],
  View: [
    { label: 'Toggle Word Wrap', command: 'toggle-word-wrap', checkbox: true, settingKey: 'wordwrap', settingDefault: false },
    { label: 'Toggle Line Numbers', command: 'toggle-line-numbers', checkbox: true, settingKey: 'linenumbers', settingDefault: true },
    { separator: true },
    { label: 'Increase Font Size', command: 'increase-font-size', shortcut: 'Ctrl+Shift+=' },
    { label: 'Decrease Font Size', command: 'decrease-font-size', shortcut: 'Ctrl+Shift+-' },
    { label: 'Reset Font Size', command: 'reset-font-size', shortcut: 'Ctrl+Shift+0' },
    { separator: true },
    { label: 'Show Hidden Files', command: 'show-hidden-files', checkbox: true, settingKey: 'showhiddenfiles', settingDefault: false },
  ],
  Novi: [
    { label: 'Settings', command: 'settings', shortcut: 'Ctrl+,' },
    { separator: true },
    { label: 'New Terminal', command: 'new-terminal', shortcut: 'Ctrl+T' },
    { label: 'Command Palette', command: 'command-palette' },
    { separator: true },
    { label: 'Clear Workspace', command: 'reset-workspace' },
  ],
  Help: [
    { label: 'Documentation', command: 'documentation' },
    { label: 'Report Issue', command: 'report-issue' },
    { separator: true },
    { label: 'Show Developer Tools', command: 'toggle-devtools', shortcut: 'Ctrl+Shift+I', checkbox: true, settingKey: 'devToolsEnabled', settingDefault: false, mainManaged: true },
    { separator: true },
    { label: 'Check for Updates', command: 'check-updates' },
    { label: 'About Novi', command: 'about' },
  ],
};

const FONT_COMMANDS = ['increase-font-size', 'decrease-font-size', 'reset-font-size'];
const SAVE_COMMANDS = ['save', 'save-as'];
// Close File only ever acts on a 'file' tab (App.onCloseFile is a no-op
// otherwise) — New/Open File still make sense from any tab, so they're not here.
const EDITOR_ONLY_COMMANDS = ['command-palette', 'close-file'];
const SETTINGS_DISABLED_COMMANDS = ['show-hidden-files'];
// Undo/Redo/Cut don't apply to a terminal (or any non-editor tab) at all.
const EDITOR_ONLY_EDIT_COMMANDS = ['undo', 'redo', 'cut'];
// Copy/Paste/Select All work on both an editor tab and a terminal tab.
const CLIPBOARD_COMMANDS = ['copy', 'paste', 'select-all'];
// Word wrap / line numbers are editor (Monaco) concepts — meaningless on a terminal.
const EDITOR_ONLY_VIEW_COMMANDS = ['toggle-word-wrap', 'toggle-line-numbers'];

export class TitleBar extends Component {
  private config: TitleBarConfig;
  private isMaximized = false;
  private openMenu: string | null = null;
  private dropdown: HTMLElement | null = null;
  private menuBar!: HTMLElement;
  private maximizeBtn!: HTMLElement;

  constructor(config: TitleBarConfig) {
    super('div');
    this.config = config;
    Object.assign(this.el.style, {
      display: 'flex',
      height: '32px',
      backgroundColor: '#1e1e1e',
      color: '#cccccc',
      WebkitAppRegion: 'drag',
      userSelect: 'none',
      borderBottom: '1px solid #3e3e42',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px',
    });
    this.buildLayout();
  }

  protected onMount(): void {
    this.updateMaximizeState();
  }

  protected onDestroy(): void {
    this.closeMenu();
  }

  updateConfig(config: Partial<TitleBarConfig>): void {
    Object.assign(this.config, config);
  }

  private async updateMaximizeState(): Promise<void> {
    if (window.api?.windowIsMaximized) {
      try {
        this.isMaximized = await window.api.windowIsMaximized();
        this.updateMaximizeIcon();
      } catch (error) {
        console.error('[TitleBar] Failed to get maximize state:', error);
      }
    }
  }

  private buildLayout(): void {
    // Left section: logo + menu bar
    const leftSection = el('div', {
      style: 'display: flex; align-items: center; gap: 12px; flex: 1;',
    });

    // Logo
    const logoContainer = el('div', {
      style: 'display: flex; align-items: center; padding-right: 12px; border-right: 1px solid #3e3e42; height: 32px;',
    });
    const logo = document.createElement('img');
    logo.src = 'assets/novi_logo.png';
    logo.alt = 'Novi Terminal Environment';
    Object.assign(logo.style, {
      height: '25px',
      width: 'auto',
      objectFit: 'contain',
      userSelect: 'none',
    });
    logoContainer.appendChild(logo);
    leftSection.appendChild(logoContainer);

    // Menu bar
    this.menuBar = el('div', {
      style: 'display: flex; align-items: center; gap: 4px; -webkit-app-region: no-drag;',
    });
    for (const menuName of Object.keys(MENUS)) {
      const btn = el('div', {
        className: 'menu-button',
        style: 'padding: 0 10px; height: 32px; display: flex; align-items: center; cursor: pointer; font-size: 12px; transition: background-color 0.1s; user-select: none;',
      }, menuName);
      btn.addEventListener('click', (e) => this.handleMenuClick(menuName, e));
      btn.addEventListener('mouseenter', (e) => {
        if (this.openMenu && this.openMenu !== menuName) {
          this.handleMenuClick(menuName, e);
        }
      });
      this.menuBar.appendChild(btn);
    }
    leftSection.appendChild(this.menuBar);
    this.el.appendChild(leftSection);

    // Window controls
    const controls = el('div', {
      style: 'display: flex; align-items: center; justify-content: flex-end; background-color: #1e1e1e; -webkit-app-region: no-drag;',
    });

    controls.appendChild(this.createWindowButton('minimize', () => {
      window.api?.windowMinimize?.();
    }));
    this.maximizeBtn = this.createWindowButton('maximize', () => this.handleMaximize());
    controls.appendChild(this.maximizeBtn);
    controls.appendChild(this.createWindowButton('close', () => {
      window.api?.windowClose?.();
    }));

    this.el.appendChild(controls);

    // Close menu on click outside or Escape
    this.listen(document, 'mousedown', (e) => {
      if (this.openMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.menu-dropdown') && !target.closest('.menu-button')) {
          this.closeMenu();
        }
      }
    });
    this.listen(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.openMenu) this.closeMenu();
    });
  }

  private createWindowButton(type: 'minimize' | 'maximize' | 'close', onClick: () => void): HTMLElement {
    const btn = el('div', {
      className: `window-btn window-btn-${type}`,
      style: 'width: 46px; height: 32px; border: none; background: transparent; color: #ccc; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: background-color 0.15s ease, color 0.15s ease; outline: none;',
    });
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');

    const isClose = type === 'close';
    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = isClose ? '#e81123' : '#2a2a2a';
      btn.style.color = '#fff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'transparent';
      btn.style.color = '#ccc';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.backgroundColor = isClose ? '#c50f1f' : '#333';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.backgroundColor = isClose ? '#e81123' : '#2a2a2a';
    });
    btn.addEventListener('click', onClick);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    });

    btn.innerHTML = this.getWindowButtonSvg(type);
    return btn;
  }

  private getWindowButtonSvg(type: string): string {
    switch (type) {
      case 'minimize':
        return '<svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="1" fill="#cccccc"/></svg>';
      case 'maximize':
        return this.isMaximized
          ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2V0H10V8H8V10H0V2H2ZM8 2H2V8H8V2Z" fill="#cccccc"/></svg>'
          : '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10" stroke="#cccccc" stroke-width="1" fill="none"/></svg>';
      case 'close':
        return '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 0L0 0.5L4.5 5L0 9.5L0.5 10L5 5.5L9.5 10L10 9.5L5.5 5L10 0.5L9.5 0L5 4.5L0.5 0Z" fill="#cccccc"/></svg>';
      default:
        return '';
    }
  }

  private updateMaximizeIcon(): void {
    if (this.maximizeBtn) {
      this.maximizeBtn.innerHTML = this.getWindowButtonSvg('maximize');
      this.maximizeBtn.setAttribute('aria-label', this.isMaximized ? 'Restore' : 'Maximize');
    }
  }

  private async handleMaximize(): Promise<void> {
    if (window.api?.windowMaximize) {
      window.api.windowMaximize();
      this.isMaximized = !this.isMaximized;
      this.updateMaximizeIcon();

      setTimeout(async () => {
        if (window.api?.windowIsMaximized) {
          try {
            this.isMaximized = await window.api.windowIsMaximized();
            this.updateMaximizeIcon();
          } catch (error) {
            console.error('[TitleBar] Failed to update maximize state:', error);
          }
        }
      }, 100);
    }
  }

  private handleMenuClick(menuName: string, e: Event): void {
    const target = (e.currentTarget || e.target) as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.openMenu === menuName) {
      this.closeMenu();
      return;
    }

    this.closeMenu();
    this.openMenu = menuName;

    // Highlight active menu button
    this.updateMenuButtonStyles();

    // Create dropdown
    const dropdown = el('div', {
      className: 'menu-dropdown',
      style: [
        'position: fixed', `top: ${rect.bottom}px`, `left: ${rect.left}px`,
        'background-color: #252526', 'border: 1px solid #454545',
        'box-shadow: 0 4px 8px rgba(0,0,0,0.3)', 'min-width: 220px',
        'padding: 4px 0', 'z-index: 10000',
      ].join(';'),
    });

    const items = MENUS[menuName];
    const checkboxPromises: { item: MenuItem; checkEl: HTMLElement }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.separator) {
        dropdown.appendChild(el('div', { style: 'height: 1px; background-color: #454545; margin: 4px 0;' }));
        continue;
      }

      const tabType = this.config.activeTabType;
      const isFileTab = tabType === 'file';
      const isNonFileTab = tabType === 'terminal' || tabType === 'settings';
      const isTerminalOrFileTab = tabType === 'terminal' || isFileTab;
      // Live, not cached — window.__monacoEditorAPI reflects whatever file is
      // currently displayed at the moment the menu is opened.
      const canUndo = isFileTab && !!(window as any).__monacoEditorAPI?.canUndo?.();
      const canRedo = isFileTab && !!(window as any).__monacoEditorAPI?.canRedo?.();
      // Show Hidden Files acts on the file tree, which is hidden whenever the
      // Settings tab is active OR the Git panel has replaced it in the sidebar.
      const isFileTreeHidden = tabType === 'settings' || this.config.showGitPanel === true;
      const disabled = item.disabled === true ||
        (tabType === 'settings' && item.command && FONT_COMMANDS.includes(item.command)) ||
        (isNonFileTab && item.command && SAVE_COMMANDS.includes(item.command)) ||
        (tabType !== 'file' && item.command && EDITOR_ONLY_COMMANDS.includes(item.command)) ||
        (isFileTreeHidden && item.command && SETTINGS_DISABLED_COMMANDS.includes(item.command)) ||
        (!isFileTab && item.command && EDITOR_ONLY_EDIT_COMMANDS.includes(item.command)) ||
        (item.command === 'undo' && isFileTab && !canUndo) ||
        (item.command === 'redo' && isFileTab && !canRedo) ||
        (!isTerminalOrFileTab && item.command && CLIPBOARD_COMMANDS.includes(item.command)) ||
        (!isFileTab && item.command && EDITOR_ONLY_VIEW_COMMANDS.includes(item.command));

      const menuItem = el('div', {
        style: [
          'padding: 6px 20px', 'cursor: pointer', 'display: flex',
          'justify-content: space-between', 'align-items: center',
          'transition: background-color 0.1s', 'font-size: 12px',
          disabled ? 'opacity: 0.5; cursor: default;' : '',
        ].join(';'),
      });

      // Label — always left-justified
      menuItem.appendChild(el('span', {}, item.label));

      // Right side: checkmark (for checkbox items) and/or shortcut
      let checkEl: HTMLElement | null = null;
      const rightSide = el('span', { style: 'display: flex; align-items: center; gap: 8px; margin-left: 40px;' });
      let hasRight = false;
      if (item.checkbox) {
        checkEl = el('span', { style: 'font-size: 12px; min-width: 14px; text-align: center;' }, '');
        rightSide.appendChild(checkEl);
        checkboxPromises.push({ item, checkEl });
        hasRight = true;
      }
      if (item.shortcut) {
        rightSide.appendChild(el('span', { style: 'font-size: 11px; color: #858585;' }, item.shortcut));
        hasRight = true;
      }
      if (hasRight) menuItem.appendChild(rightSide);

      if (!disabled) {
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.backgroundColor = '#094771';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = 'transparent';
        });
        menuItem.addEventListener('click', () => {
          if (item.checkbox && item.settingKey && !item.mainManaged) {
            // Toggle the setting and update checkmark (renderer-managed)
            window.api?.getSetting<boolean>(item.settingKey, item.settingDefault ?? false).then((current) => {
              const newVal = !current;
              window.api?.setSetting(item.settingKey!, newVal);
              if (item.command && this.config.onCommand) {
                this.config.onCommand(item.command);
              }
            });
          } else if (item.command && this.config.onCommand) {
            this.config.onCommand(item.command);
          }
          this.closeMenu();
        });
      }

      dropdown.appendChild(menuItem);
    }

    // Resolve checkbox states asynchronously
    for (const { item, checkEl: ce } of checkboxPromises) {
      if (item.settingKey) {
        window.api?.getSetting<boolean>(item.settingKey, item.settingDefault ?? false).then((val) => {
          ce.textContent = val ? '\u2713' : '';
        });
      }
    }

    document.body.appendChild(dropdown);
    this.dropdown = dropdown;
  }

  private closeMenu(): void {
    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }
    this.openMenu = null;
    this.updateMenuButtonStyles();
  }

  private updateMenuButtonStyles(): void {
    const buttons = this.menuBar.querySelectorAll('.menu-button');
    buttons.forEach((btn) => {
      const htmlBtn = btn as HTMLElement;
      htmlBtn.style.backgroundColor = htmlBtn.textContent === this.openMenu ? '#2a2a2a' : '';
    });
  }
}
