/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Terminal - Integrated terminal component using xterm.js (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, setStyles } from '../core/dom.js';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';

export interface TerminalConfig {
  terminalId: string;
  workspaceRoot?: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  onNewTerminal?: () => void;
  fontSize?: number;
}

export class Terminal extends Component {
  private terminalId: string;
  private workspaceRoot?: string;
  private onData?: (data: string) => void;
  private onResize?: (cols: number, rows: number) => void;
  private onNewTerminal?: () => void;
  private fontSize: number;

  private terminal: XTerm | null = null;
  private fitAddon: FitAddon | null = null;
  private container: HTMLElement;
  private contextMenuEl: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isReady = false;
  private ptyCreated = false;
  private initInProgress = false;
  private hasInitialFit = false;
  private _isActive = false;
  private ptyCols = 0;
  private ptyRows = 0;

  constructor(config: TerminalConfig) {
    super('div');
    this.terminalId = config.terminalId;
    this.workspaceRoot = config.workspaceRoot;
    this.onData = config.onData;
    this.onResize = config.onResize;
    this.onNewTerminal = config.onNewTerminal;
    this.fontSize = config.fontSize ?? 14;

    // Fragment wrapper (replaces React Fragment)
    setStyles(this.el, { display: 'contents' });

    this.container = el('div');
    this.container.setAttribute('data-terminal-id', this.terminalId);
    setStyles(this.container, {
      width: '100%',
      height: '100%',
      backgroundColor: '#1e1e1e',
      boxSizing: 'border-box',
      overflow: 'hidden',
      opacity: '0',
      transition: 'opacity 0.2s ease-in',
    });
    this.container.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    this.el.appendChild(this.container);
  }

  get isActive(): boolean { return this._isActive; }

  set isActive(active: boolean) {
    this._isActive = active;

    if (active && !this.ptyCreated) {
      this.initPhase1();
    } else if (active && this.ptyCreated && !this.terminal) {
      // PTY exists but xterm not yet created (restart while tab was hidden)
      this.initDisplay();
    }

    // Refit on tab switch (after initial mount)
    if (active && this.isReady && this.hasInitialFit && this.terminal && this.fitAddon) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            if (this.fitAddon && this.terminal) {
              const oldCols = this.terminal.cols;
              const oldRows = this.terminal.rows;
              this.fitAddon.fit();
              const newCols = this.terminal.cols;
              const newRows = this.terminal.rows;
              if (this.ptyCreated && this.onResize && (newCols !== oldCols || newRows !== oldRows) && newCols > 0 && newRows > 0) {
                this.onResize(newCols, newRows);
              }
              this.terminal.scrollToBottom();
              this.terminal.focus();
              ro.disconnect();
            }
          }
        }
      });
      ro.observe(this.container);
      this.addCleanup(() => ro.disconnect());
    }
  }

  set fontSizeProp(size: number) {
    this.fontSize = size;
    if (this.terminal && this.fitAddon) {
      this.terminal.options.fontSize = size;
      try {
        this.fitAddon.fit();
        if (this.onResize && this.terminal.cols && this.terminal.rows) {
          this.onResize(this.terminal.cols, this.terminal.rows);
        }
      } catch (_) {}
    }
  }

  private async initPhase1(): Promise<void> {
    if (this.ptyCreated || this.initInProgress || !this._isActive) return;
    this.initInProgress = true;

    console.log('[Terminal] PHASE 1: Container is active, measuring and creating PTY...');

    // Wait for container to have non-zero dimensions
    await new Promise<void>((resolve) => {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            observer.disconnect();
            resolve();
          }
        }
      });
      observer.observe(this.container);
    });

    // Measure with temp terminal
    const tempTerminal = new XTerm({
      fontSize: this.fontSize,
      fontFamily: "'DejaVu Sans Mono', monospace",
      lineHeight: 1.2,
    });
    const tempFitAddon = new FitAddon();
    tempTerminal.loadAddon(tempFitAddon);

    try {
      tempTerminal.open(this.container);
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      tempFitAddon.fit();

      const cols = tempTerminal.cols;
      const rows = tempTerminal.rows;
      console.log(`[Terminal] Measured dimensions: ${cols}x${rows}`);
      tempTerminal.dispose();

      if (cols < 40 || rows < 10) {
        this.ptyCols = 100;
        this.ptyRows = 30;
      } else {
        this.ptyCols = cols;
        this.ptyRows = rows;
      }
      await (window as any).api?.terminalCreate(this.workspaceRoot, this.ptyCols, this.ptyRows, this.terminalId);

      this.ptyCreated = true;
      this.initDisplay();
    } catch (error) {
      console.error('[Terminal] Failed to measure and create PTY:', error);
      this.initInProgress = false;
      tempTerminal.dispose();
    }
  }

  resetTerminal(): void {
    this.terminal?.reset();
  }

  /** Mark the PTY as dead so resize events are not forwarded */
  markPtyExited(): void {
    this.ptyCreated = false;
  }

  /**
   * Respawn the shell after the PTY has already exited (e.g. user typed `exit`).
   * The xterm and Terminal component stay alive — only a new PTY is created.
   */
  respawnShell(): void {
    const cols = this.terminal?.cols || 120;
    const rows = this.terminal?.rows || 30;
    this.terminal?.reset();
    (window as any).api?.terminalCreate(this.workspaceRoot, cols, rows, this.terminalId)
      .then(() => {
        this.ptyCreated = true;
        if (this._isActive) this.terminal?.focus();
      })
      .catch((err: unknown) => {
        console.error('[Terminal] Failed to respawn shell:', err);
      });
  }

  /**
   * Full restart: kill PTY, dispose xterm, reinitialize from scratch.
   * Used when switching shells — ensures clean state like a fresh tab.
   */
  async restartTerminal(): Promise<void> {
    // Save dimensions before dispose — needed to create PTY without measuring
    const savedCols = this.terminal?.cols || 120;
    const savedRows = this.terminal?.rows || 30;
    // Kill PTY on main process
    await window.api?.terminalKill?.(this.terminalId);
    // Dispose xterm and addons
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if ((window as any).__terminalAPI) {
      delete (window as any).__terminalAPI[this.terminalId];
    }
    this.disposeXterm();
    // Reset flags so initDisplay can run
    this.isReady = false;
    this.hasInitialFit = false;
    this.initInProgress = false;
    this.container.style.opacity = '0';
    // Create PTY immediately with saved dimensions — don't wait for container
    // visibility (initPhase1 would deadlock if the terminal tab is hidden)
    this.ptyCols = savedCols;
    this.ptyRows = savedRows;
    await (window as any).api?.terminalCreate(this.workspaceRoot, savedCols, savedRows, this.terminalId);
    this.ptyCreated = true;
    // Create xterm display immediately if visible, otherwise defer to isActive setter
    if (this._isActive) {
      this.initDisplay();
    }
  }

  /**
   * Create xterm display when PTY already exists (restart while tab was hidden).
   * Unlike initPhase1 which creates both xterm and PTY together, this only
   * sets up the display layer for an existing PTY session.
   */
  private initDisplay(): void {
    if (!this.ptyCreated || this.terminal) return;

    console.log('[Terminal] initDisplay: Opening xterm for existing PTY...');

    const terminal = new XTerm({
      theme: {
        background: '#1e1e1e', foreground: '#cccccc', cursor: '#ffffff', cursorAccent: '#000000',
        selectionBackground: 'rgba(0, 122, 204, 0.3)',
        black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
        blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
        brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b', brightYellow: '#f5f543',
        brightBlue: '#3b8eea', brightMagenta: '#d670d6', brightCyan: '#29b8db', brightWhite: '#e5e5e5',
      },
      fontSize: this.fontSize,
      fontFamily: "'DejaVu Sans Mono', monospace",
      cursorBlink: false, cursorStyle: 'underline', cursorWidth: 2,
      lineHeight: 1.2, letterSpacing: 0, scrollback: 10000, windowsMode: false,
    });

    terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Tab') return false;
      return true;
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    try {
      terminal.open(this.container);

      try {
        const webglAddon = new WebglAddon();
        // dispose() here can throw (see disposeXterm()'s comment) if this fires
        // while/after the terminal itself is already being torn down.
        webglAddon.onContextLoss(() => {
          try { webglAddon.dispose(); } catch (_) {}
        });
        terminal.loadAddon(webglAddon);
      } catch (_) {}

      this.terminal = terminal;
      this.fitAddon = fitAddon;

      requestAnimationFrame(() => {
        fitAddon.fit();
        const newCols = terminal.cols;
        const newRows = terminal.rows;
        const dimensionsChanged = (newCols !== this.ptyCols || newRows !== this.ptyRows) && newCols > 0 && newRows > 0;
        if (dimensionsChanged) {
          // Dimensions differ from what PTY was created with.  Discard the
          // stale buffered prompt — the resize will SIGWINCH the shell, which
          // redraws a fresh prompt with the correct column width.
          (window as any).__appInstance?.clearEarlyTerminalData?.(this.terminalId);
        }
        this.registerAPI();
        if (dimensionsChanged && this.onResize) {
          this.onResize(newCols, newRows);
        }
        this.ptyCols = newCols;
        this.ptyRows = newRows;
        this.container.style.opacity = '1';
        if (this._isActive) terminal.focus();

        // Attach the persistent ResizeObserver AFTER the initial fit so it
        // only reacts to genuine future container size changes, not the
        // initial layout settling (which would cause a duplicate SIGWINCH).
        this.resizeObserver = new ResizeObserver(() => {
          if (this.fitAddon && this.terminal) {
            const oldC = this.terminal.cols;
            const oldR = this.terminal.rows;
            this.fitAddon.fit();
            const newC = this.terminal.cols;
            const newR = this.terminal.rows;
            if (this.ptyCreated && this.onResize && (newC !== oldC || newR !== oldR) && newC > 0 && newR > 0) {
              this.onResize(newC, newR);
            }
          }
        });
        this.resizeObserver.observe(this.container);

        // Mark ready AFTER ResizeObserver is attached, so the isActive
        // setter's refit block does not fire during this same init cycle.
        this.hasInitialFit = true;
        this.isReady = true;

        requestAnimationFrame(() => terminal.scrollToBottom());
      });

      terminal.onData((data) => this.onData?.(data));

      if (typeof terminal.onSelectionChange === 'function') {
        terminal.onSelectionChange(async () => {
          const s = terminal.getSelection();
          if (s && (window as any).api?.clipboardWriteText) {
            try { await (window as any).api.clipboardWriteText(s); } catch (_) {}
          }
        });
      }
    } catch (error) {
      console.error('[Terminal] Failed to open terminal display:', error);
    }
  }

  private registerAPI(): void {
    (window as any).__terminalAPI = (window as any).__terminalAPI || {};
    (window as any).__terminalAPI[this.terminalId] = {
      write: (data: string) => this.terminal?.write(data),
      clear: () => this.terminal?.clear(),
      focus: () => this.terminal?.focus(),
    };
    // Flush any data that arrived before xterm was ready (fast-starting shells)
    (window as any).__appInstance?.flushEarlyTerminalData?.(this.terminalId);
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('novi-close-context-menus', { detail: { source: 'Terminal' } }));
    this.showContextMenu(e.clientX, e.clientY);
  }

  private showContextMenu(x: number, y: number): void {
    this.hideContextMenu();

    const menu = el('div');
    setStyles(menu, {
      position: 'fixed', left: `${x}px`, top: `${y}px`,
      backgroundColor: '#252526', border: '1px solid #3e3e42', borderRadius: '4px',
      padding: '4px 0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)', zIndex: '10000', minWidth: '150px',
    });

    const makeItem = (text: string, handler: () => void) => {
      const item = el('div', {}, text);
      setStyles(item, {
        padding: '8px 16px', cursor: 'pointer', color: '#cccccc',
        fontSize: '13px', fontFamily: "'Segoe UI', sans-serif",
      });
      item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#2a2d2e'; });
      item.addEventListener('mouseleave', () => { item.style.backgroundColor = 'transparent'; });
      item.addEventListener('click', handler);
      return item;
    };

    menu.appendChild(makeItem('\u{1F4CB} Copy', () => this.handleCopy()));
    menu.appendChild(makeItem('\u{1F4C4} Paste', () => this.handlePaste()));

    const sep = el('div');
    setStyles(sep, { height: '1px', backgroundColor: '#3e3e42', margin: '4px 0' });
    menu.appendChild(sep);

    menu.appendChild(makeItem('\u{1F4BB} New Terminal', () => {
      this.hideContextMenu();
      this.onNewTerminal?.();
    }));

    document.body.appendChild(menu);
    this.contextMenuEl = menu;

    const clickHandler = () => this.hideContextMenu();
    document.addEventListener('click', clickHandler, { once: true });
  }

  private hideContextMenu(): void {
    if (this.contextMenuEl) {
      this.contextMenuEl.remove();
      this.contextMenuEl = null;
    }
  }

  private async handleCopy(): Promise<void> {
    if (this.terminal) {
      const selection = this.terminal.getSelection();
      if (selection && (window as any).api?.clipboardWriteText) {
        await (window as any).api.clipboardWriteText(selection);
      }
    }
    this.hideContextMenu();
  }

  private async handlePaste(): Promise<void> {
    if (this.terminal) {
      const api = (window as any).api;
      if (api?.clipboardReadText) {
        const text = await api.clipboardReadText();
        if (text) this.onData?.(text);
      }
    }
    this.hideContextMenu();
  }

  protected onDestroy(): void {
    this.hideContextMenu();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if ((window as any).__terminalAPI) {
      delete (window as any).__terminalAPI[this.terminalId];
    }
    this.disposeXterm();
  }

  /**
   * xterm.js's WebGL addon has a known internal ordering bug: its own
   * registered disposable reads `terminal._core._store._isDisposed`, which
   * can already be undefined by the time it runs during `terminal.dispose()`,
   * throwing "Cannot read properties of undefined (reading '_isDisposed')".
   * That throw is synchronous, so left unguarded it propagates out through
   * whoever destroyed this component — e.g. App.syncTerminalInstances(),
   * called from the terminal-exit IPC handler's onTabClose() chain, which
   * would then never reach the TabBar mutation that actually removes the
   * tab, leaving a dead tab stuck in the UI forever. This is a best-effort
   * teardown of a third-party renderer, not something our own tab-lifecycle
   * logic should ever be held hostage by.
   */
  private disposeXterm(): void {
    try {
      this.terminal?.dispose();
    } catch (err) {
      console.error('[Terminal] xterm dispose threw (ignored):', err);
    }
    this.terminal = null;
    this.fitAddon = null;
  }
}
