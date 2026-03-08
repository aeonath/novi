/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * NoviShell - Novi's command-line interface for settings and commands (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, setStyles } from '../core/dom.js';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export interface NoviShellConfig {
  promptId: string;
  onClose?: () => void;
}

export class NoviShell extends Component {
  private promptId: string;
  private onClose?: () => void;
  private terminal: XTerm | null = null;
  private fitAddon: FitAddon | null = null;
  private currentLine = '';
  private contextMenuEl: HTMLElement | null = null;
  private termContainer: HTMLElement;
  private appVersion = 'unknown';
  private _isActive = false;

  constructor(config: NoviShellConfig) {
    super('div');
    this.promptId = config.promptId;
    this.onClose = config.onClose;

    setStyles(this.el, {
      display: 'flex', flex: '1', flexDirection: 'column',
      height: '100%', backgroundColor: '#1e1e1e',
    });

    this.termContainer = el('div');
    setStyles(this.termContainer, { flex: '1', height: '100%' });
    this.el.appendChild(this.termContainer);

    this.el.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
  }

  protected onMount(): void {
    this.init();

    // Listen for close context menus from other components
    const closeHandler = () => this.hideContextMenu();
    const clickHandler = () => this.hideContextMenu();
    window.addEventListener('novi-close-context-menus', closeHandler);
    document.addEventListener('click', clickHandler);
    this.addCleanup(() => {
      window.removeEventListener('novi-close-context-menus', closeHandler);
      document.removeEventListener('click', clickHandler);
    });
  }

  set isActive(active: boolean) {
    this._isActive = active;
    if (active && this.fitAddon) {
      setTimeout(() => {
        try { this.fitAddon?.fit(); } catch (_) {}
      }, 100);
    }
    // Update copy/paste globals when active
    if (active) {
      (window as any).__noviShellCopy = () => this.handleCopy();
      (window as any).__noviShellPaste = () => this.handlePaste();
    }
  }

  private async init(): Promise<void> {
    if (this.terminal) return;

    this.appVersion = await window.api?.getVersion?.().catch(() => 'unknown') ?? 'unknown';

    const terminal = new XTerm({
      cursorBlink: true, fontSize: 14,
      fontFamily: "Consolas, 'Courier New', monospace",
      theme: {
        background: '#1e1e1e', foreground: '#cccccc', cursor: '#ffffff',
        selectionBackground: 'rgba(0, 122, 204, 0.3)',
        black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
        blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
        brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b', brightYellow: '#f5f543',
        brightBlue: '#3b8eea', brightMagenta: '#d670d6', brightCyan: '#29b8db', brightWhite: '#e5e5e5',
      },
      convertEol: true, scrollback: 1000, windowsMode: false,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    try {
      terminal.open(this.termContainer);
      fitAddon.fit();
      this.terminal = terminal;
      this.fitAddon = fitAddon;

      terminal.writeln(`Novi Shell v${this.appVersion}`);
      terminal.writeln('Type "help" for available commands');
      terminal.writeln('');
      this.writePrompt();

      terminal.onData((data) => this.handleInput(data));

      // Expose focus API
      (window as any).__noviShellAPI = (window as any).__noviShellAPI || {};
      (window as any).__noviShellAPI[this.promptId] = { focus: () => this.terminal?.focus() };
    } catch (error) {
      console.error('[NoviShell] Failed to initialize:', error);
    }

    const handleResize = () => {
      if (this.fitAddon && this.terminal) {
        try { this.fitAddon.fit(); } catch (_) {}
      }
    };
    window.addEventListener('resize', handleResize);
    this.addCleanup(() => window.removeEventListener('resize', handleResize));
  }

  private writePrompt(): void {
    this.terminal?.write('\r\n\x1b[36mnovi>\x1b[0m ');
  }

  private handleInput(data: string): void {
    if (!this.terminal) return;
    const char = data.charCodeAt(0);

    if (char === 13) { // Enter
      const command = this.currentLine.trim();
      this.terminal.write('\r\n');
      if (command) {
        this.executeCommand(command).then(() => {
          this.currentLine = '';
          this.writePrompt();
        });
      } else {
        this.currentLine = '';
        this.writePrompt();
      }
      return;
    }
    if (char === 127 || char === 8) { // Backspace
      if (this.currentLine.length > 0) {
        this.currentLine = this.currentLine.slice(0, -1);
        this.terminal.write('\b \b');
      }
      return;
    }
    if (char === 3) { // Ctrl+C
      this.terminal.write('^C');
      this.currentLine = '';
      this.writePrompt();
      return;
    }
    if (char === 12) { // Ctrl+L
      this.terminal.clear();
      this.writePrompt();
      return;
    }
    if (char >= 32 && char < 127) {
      this.currentLine += data;
      this.terminal.write(data);
    }
  }

  private async executeCommand(command: string): Promise<void> {
    if (!this.terminal) return;
    const parts = command.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'help': this.commandHelp(); break;
        case 'version': this.commandVersion(); break;
        case 'list': this.commandList(); break;
        case 'clear': this.terminal.clear(); break;
        case 'exit': this.onClose?.(); return;
        case 'set': await this.commandSet(args); break;
        case '': break;
        default:
          this.terminal.writeln(`\x1b[31mUnknown command: ${cmd}\x1b[0m`);
          this.terminal.writeln('Type "help" for available commands');
          break;
      }
    } catch (error) {
      this.terminal.writeln(`\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
    }
  }

  private async commandSet(args: string[]): Promise<void> {
    const t = this.terminal!;
    if (args.length === 0) {
      try {
        const vimode = await window.api.getSetting<boolean>('vimode', false);
        const compat = await window.api.getSetting<boolean>('compat', false);
        const singlefiletree = await window.api.getSetting<boolean>('singlefiletree', false);
        const debug = await window.api.getSetting<boolean>('debug', false);
        const keeptabs = await window.api.getSetting<boolean>('keeptabs', true);
        const gitenabled = await window.api.getSetting<boolean>('gitenabled', true);
        t.writeln('\x1b[36mCurrent settings:\x1b[0m');
        t.writeln(`  vimode         ${vimode ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
        t.writeln(`  compat         ${compat ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
        t.writeln(`  singlefiletree ${singlefiletree ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
        t.writeln(`  debug          ${debug ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
        t.writeln(`  keeptabs      ${keeptabs ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
        t.writeln(`  gitenabled     ${gitenabled ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
      } catch (_) { t.writeln('\x1b[31mFailed to read settings\x1b[0m'); }
      return;
    }
    const option = args[0].toLowerCase();
    const value = args[1]?.toLowerCase();
    const validOptions = ['vimode', 'compat', 'singlefiletree', 'debug', 'keeptabs', 'gitenabled', 'showhiddenfiles'];
    if (!validOptions.includes(option)) {
      t.writeln(`\x1b[31mUnknown option: ${option}\x1b[0m`);
      t.writeln('Supported: vimode, compat, singlefiletree, debug, keeptabs, gitenabled, showhiddenfiles');
      return;
    }
    if (value === undefined || value === '') {
      try {
        const defaultVal = (option === 'keeptabs' || option === 'gitenabled') ? true : false;
        const on = await window.api.getSetting<boolean>(option, defaultVal);
        t.writeln(on ? `\x1b[32m${option} is on\x1b[0m` : `\x1b[33m${option} is off\x1b[0m`);
      } catch (_) { t.writeln('\x1b[31mFailed to read setting\x1b[0m'); }
      return;
    }
    if (value !== 'on' && value !== 'off') {
      t.writeln(`\x1b[31mExpected "on" or "off", got: ${value}\x1b[0m`);
      return;
    }
    try {
      await window.api.setSetting(option, value === 'on');
      const eventMap: Record<string, string> = {
        vimode: 'novi-vimode-changed',
        singlefiletree: 'novi-singlefiletree-changed',
        debug: 'novi-debug-changed',
        gitenabled: 'novi-gitenabled-changed',
        showhiddenfiles: 'novi-showhiddenfiles-changed',
      };
      if (eventMap[option]) {
        const detail = option === 'singlefiletree' ? {} : { enabled: value === 'on' };
        window.dispatchEvent(new CustomEvent(eventMap[option], { detail }));
      }
      t.writeln(value === 'on' ? `\x1b[32m${option} on\x1b[0m` : `\x1b[33m${option} off\x1b[0m`);
    } catch (_) { t.writeln(`\x1b[31mFailed to set ${option}\x1b[0m`); }
  }

  private commandHelp(): void {
    const t = this.terminal!;
    t.writeln('Available Commands:');
    t.writeln('');
    t.writeln('  \x1b[33mversion\x1b[0m      - Display Novi version information');
    t.writeln('  \x1b[33mlist\x1b[0m         - List all open tabs');
    t.writeln('  \x1b[33mclear\x1b[0m        - Clear the screen');
    t.writeln('  \x1b[33mexit\x1b[0m         - Close this Novi Shell tab');
    t.writeln('  \x1b[33mset\x1b[0m          - Set options (e.g. set vimode on|off); set with no args shows all');
    t.writeln('  \x1b[33mhelp\x1b[0m         - Show this help message');
    t.writeln('');
    t.writeln('Keyboard Shortcuts:');
    t.writeln('  Ctrl+C       - Cancel current input');
    t.writeln('  Ctrl+L       - Clear the screen');
  }

  private commandVersion(): void {
    const t = this.terminal!;
    t.writeln(`Novi Terminal Environment v${this.appVersion}`);
    t.writeln('');
    t.writeln('\u00a9 2026 MiraNova Studios');
  }

  private commandList(): void {
    const t = this.terminal!;
    const tabs = (window as any).__tabBarAPI?.getTabs() || [];
    const activeTab = (window as any).__tabBarAPI?.getActiveTab();
    if (tabs.length === 0) { t.writeln('\x1b[33mNo tabs open\x1b[0m'); return; }
    t.writeln(`Open Tabs (${tabs.length}):`);
    t.writeln('');
    tabs.forEach((tab: any) => {
      const isAct = activeTab && activeTab.id === tab.id;
      const marker = isAct ? '\x1b[32m*\x1b[0m' : ' ';
      const dirtyMarker = tab.isDirty ? '\x1b[33m\u25cf\x1b[0m' : ' ';
      const typeIcon = tab.type === 'terminal' ? '\u{1F4BB}' : tab.type === 'novi-prompt' ? '\u2699' : '\u{1F4C4}';
      t.writeln(`  ${marker} ${typeIcon} ${tab.fileName} ${dirtyMarker}`);
    });
    t.writeln('');
    t.writeln('Legend: \x1b[32m*\x1b[0m = active, \x1b[33m\u25cf\x1b[0m = unsaved changes');
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('novi-close-context-menus'));
    this.showContextMenu(e.clientX, e.clientY);
  }

  private showContextMenu(x: number, y: number): void {
    this.hideContextMenu();
    const menu = el('div');
    setStyles(menu, {
      position: 'fixed', left: `${x}px`, top: `${y}px`,
      backgroundColor: '#252526', border: '1px solid #3e3e42', borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)', zIndex: '10000', minWidth: '150px', padding: '4px 0',
    });

    const makeItem = (text: string, handler: () => void) => {
      const item = el('div', {}, text);
      setStyles(item, {
        padding: '6px 12px', cursor: 'pointer', fontSize: '13px',
        color: '#cccccc', userSelect: 'none', transition: 'background-color 0.1s',
      });
      item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#2a2d2e'; });
      item.addEventListener('mouseleave', () => { item.style.backgroundColor = 'transparent'; });
      item.addEventListener('click', handler);
      return item;
    };

    menu.appendChild(makeItem('Copy', () => this.handleCopy()));
    menu.appendChild(makeItem('Paste', () => this.handlePaste()));
    const sep = el('div');
    setStyles(sep, { height: '1px', backgroundColor: '#3e3e42', margin: '4px 0' });
    menu.appendChild(sep);
    menu.appendChild(makeItem('Close', () => { this.hideContextMenu(); this.onClose?.(); }));
    menu.addEventListener('click', (e) => e.stopPropagation());

    document.body.appendChild(menu);
    this.contextMenuEl = menu;
  }

  private hideContextMenu(): void {
    if (this.contextMenuEl) { this.contextMenuEl.remove(); this.contextMenuEl = null; }
  }

  private async handleCopy(): Promise<void> {
    if (this.terminal) {
      const selection = this.terminal.getSelection();
      if (selection) {
        try { await window.api.clipboardWriteText(selection); } catch (_) {}
      }
    }
    this.hideContextMenu();
  }

  private async handlePaste(): Promise<void> {
    if (this.terminal) {
      try {
        const text = await window.api.clipboardReadText();
        if (text) { this.currentLine += text; this.terminal.write(text); }
      } catch (_) {}
    }
    this.hideContextMenu();
  }

  protected onDestroy(): void {
    this.hideContextMenu();
    delete (window as any).__noviShellCopy;
    delete (window as any).__noviShellPaste;
    delete (window as any).__noviShellAPI?.[this.promptId];
    if (this.terminal) { this.terminal.dispose(); this.terminal = null; }
  }
}
