/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * SettingsTab - Settings tab content area.
 * Displays settings for the selected section (Terminal, Editor, Novi).
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';

export type SettingsSection = 'terminal' | 'editor' | 'extensions' | 'novi';
export type ShellType = 'gitbash' | 'cmd' | 'powershell' | 'wsl' | 'linux';

interface ShellOption {
  type: ShellType;
  label: string;
  description: string;
  hasPath?: boolean;
  pathLabel?: string;
  unavailableReason?: string;
}

interface ExtensionInfo {
  name: string;
  displayName: string;
  version: string;
  description: string;
  publisher: string;
  languageId: string;
  fileExtensions: string[];
}

export class SettingsTab extends Component {
  private contentEl: HTMLElement;
  private activeSection: SettingsSection = 'terminal';
  private currentShellType: ShellType = 'gitbash';
  private currentShellPath = 'C:\\Program Files\\Git\\bin\\bash.exe';
  private platform: string = 'win32';
  private wslAvailable = false;
  private wslChecked = false;
  private hasBeenShown = false;
  private linuxUseDefault = true;
  private loadedExtensions: ExtensionInfo[] = [];
  private extensionsLoaded = false;
  private vimodeEnabled = false;
  private singlefiletreeEnabled = false;
  private keeptabsEnabled = true;
  private gitenabledEnabled = true;
  private wordWrapDefault = false;
  private columnBreakEnabled = false;
  private columnBreakValue = 90;
  private columnBreakHard = false;
  private showRulerEnabled = false;

  constructor() {
    super('div');
    setStyles(this.el, {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#1e1e1e',
      color: '#cccccc',
    });

    this.contentEl = el('div');
    setStyles(this.contentEl, {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
      padding: '24px 40px',
    });

    this.el.appendChild(this.contentEl);
    this.loadSettings().then(() => this.render());
  }

  /** Called by App when the Settings panel actually becomes visible (as opposed to
   * being mounted-but-hidden at startup). Gates probes like the WSL availability
   * check so they don't run until the user actually opens Options → Terminal. */
  notifyShown(): void {
    if (this.hasBeenShown) return;
    this.hasBeenShown = true;
    this.render();
  }

  get section(): SettingsSection { return this.activeSection; }

  set section(value: SettingsSection) {
    if (this.activeSection !== value) {
      this.activeSection = value;
      this.render();
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      this.platform = await window.api?.getPlatform?.() || 'win32';
      const st = await window.api?.getSetting<ShellType>('shellType');
      const sp = await window.api?.getSetting<string>('shellPath');
      const ud = await window.api?.getSetting<boolean>('shellUseDefault');
      if (this.platform === 'linux') {
        this.currentShellType = st || 'linux';
        this.currentShellPath = sp || '/bin/bash';
        this.linuxUseDefault = ud !== false;
      } else {
        this.currentShellType = st || 'gitbash';
        this.currentShellPath = sp || 'C:\\Program Files\\Git\\bin\\bash.exe';
      }
      this.vimodeEnabled = !!(await window.api?.getSetting<boolean>('vimode', false));
      this.singlefiletreeEnabled = !!(await window.api?.getSetting<boolean>('singlefiletree', false));
      this.keeptabsEnabled = (await window.api?.getSetting<boolean>('keeptabs', true)) !== false;
      this.gitenabledEnabled = (await window.api?.getSetting<boolean>('gitenabled', true)) !== false;
      this.wordWrapDefault = !!(await window.api?.getSetting<boolean>('wordwrap', false));
      this.columnBreakEnabled = !!(await window.api?.getSetting<boolean>('columnbreak', false));
      this.columnBreakValue = (await window.api?.getSetting<number>('columnbreakvalue', 90)) ?? 90;
      this.columnBreakHard = !!(await window.api?.getSetting<boolean>('columnbreakhard', false));
      this.showRulerEnabled = !!(await window.api?.getSetting<boolean>('showruler', false));
    } catch { /* use defaults */ }
  }

  private render(): void {
    clearChildren(this.contentEl);
    switch (this.activeSection) {
      case 'terminal': this.renderTerminalSettings(); break;
      case 'editor': this.renderEditorSettings(); break;
      case 'extensions': this.renderExtensionsSettings(); break;
      case 'novi': this.renderNoviSettings(); break;
    }
  }

  private renderExtensionsSettings(): void {
    const heading = el('h2', {}, 'Extensions');
    setStyles(heading, { margin: '0 0 8px 0', fontWeight: '400', fontSize: '1.3em' });
    this.contentEl.appendChild(heading);

    const description = el('div', {}, 'Syntax extensions loaded from ~/.novi/extensions/');
    setStyles(description, {
      fontSize: '12px',
      opacity: '0.6',
      marginBottom: '20px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    this.contentEl.appendChild(description);

    if (!this.extensionsLoaded) {
      this.extensionsLoaded = true;
      const loading = el('div', {}, 'Loading...');
      setStyles(loading, { opacity: '0.5', fontSize: '13px', fontFamily: "'Segoe UI', sans-serif" });
      this.contentEl.appendChild(loading);
      window.api?.loadAllExtensions?.().then((result: any) => {
        if (result.success && result.extensions) {
          this.loadedExtensions = result.extensions;
        }
        this.render();
      }).catch(() => this.render());
      return;
    }

    if (this.loadedExtensions.length === 0) {
      const empty = el('div');
      setStyles(empty, {
        padding: '24px',
        textAlign: 'center',
        opacity: '0.5',
        fontSize: '13px',
        fontFamily: "'Segoe UI', sans-serif",
      });
      empty.appendChild(el('div', {}, 'No extensions installed.'));
      const hint = el('div', {}, 'Drop VSCode language extensions into ~/.novi/extensions/ to add syntax highlighting.');
      setStyles(hint, { marginTop: '8px', fontSize: '12px' });
      empty.appendChild(hint);
      this.contentEl.appendChild(empty);
      return;
    }

    for (const ext of this.loadedExtensions) {
      const card = el('div');
      setStyles(card, {
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: '#252526',
        borderRadius: '4px',
        border: '1px solid #3e3e42',
        fontFamily: "'Segoe UI', sans-serif",
      });

      const titleRow = el('div');
      setStyles(titleRow, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' });

      const name = el('div', {}, ext.displayName);
      setStyles(name, { fontSize: '14px', fontWeight: '500' });
      titleRow.appendChild(name);

      const version = el('div', {}, `v${ext.version}`);
      setStyles(version, { fontSize: '11px', opacity: '0.5' });
      titleRow.appendChild(version);

      card.appendChild(titleRow);

      if (ext.description) {
        const desc = el('div', {}, ext.description);
        setStyles(desc, { fontSize: '12px', opacity: '0.6', marginBottom: '6px' });
        card.appendChild(desc);
      }

      const details = el('div');
      setStyles(details, { fontSize: '12px', opacity: '0.5', display: 'flex', gap: '16px' });

      details.appendChild(el('span', {}, `Language: ${ext.languageId}`));
      if (ext.fileExtensions?.length) {
        details.appendChild(el('span', {}, `Files: ${ext.fileExtensions.join(', ')}`));
      }
      if (ext.publisher) {
        details.appendChild(el('span', {}, `Publisher: ${ext.publisher}`));
      }

      card.appendChild(details);
      this.contentEl.appendChild(card);
    }
  }

  private renderNoviSettings(): void {
    const heading = el('h2', {}, 'Novi Settings');
    setStyles(heading, { margin: '0 0 24px 0', fontWeight: '400', fontSize: '1.3em' });
    this.contentEl.appendChild(heading);

    const sectionLabel = el('div', {}, 'File Tree');
    setStyles(sectionLabel, {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '12px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    this.contentEl.appendChild(sectionLabel);

    this.contentEl.appendChild(this.createToggleRow(
      'Single File Tree',
      'When unchecked, the file tree follows the active terminal — each terminal tab tracks its own working directory and the tree updates as you switch tabs. When checked, a single static file tree is shared across all tabs and never changes automatically.',
      this.singlefiletreeEnabled,
      async (enabled) => {
        this.singlefiletreeEnabled = enabled;
        await window.api?.setSetting('singlefiletree', enabled);
        window.dispatchEvent(new CustomEvent('novi-singlefiletree-changed'));
      },
    ));

    const sessionLabel = el('div', {}, 'Session');
    setStyles(sessionLabel, {
      fontSize: '14px',
      fontWeight: '600',
      marginTop: '20px',
      marginBottom: '12px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    this.contentEl.appendChild(sessionLabel);

    this.contentEl.appendChild(this.createToggleRow(
      'Restore Previous Session',
      'When enabled, Novi saves your open tabs on exit and restores them on next launch. When disabled, every launch starts fresh with only a new terminal tab.',
      this.keeptabsEnabled,
      async (enabled) => {
        this.keeptabsEnabled = enabled;
        await window.api?.setSetting('keeptabs', enabled);
      },
    ));

    const gitLabel = el('div', {}, 'Git');
    setStyles(gitLabel, {
      fontSize: '14px',
      fontWeight: '600',
      marginTop: '20px',
      marginBottom: '12px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    this.contentEl.appendChild(gitLabel);

    this.contentEl.appendChild(this.createToggleRow(
      'Built-in Git Support',
      'Enables Novi\'s built-in Git integration — the Git panel, status indicators in the file tree, and branch information in the status bar. Disable if you prefer to manage Git entirely from the terminal.',
      this.gitenabledEnabled,
      async (enabled) => {
        this.gitenabledEnabled = enabled;
        await window.api?.setSetting('gitenabled', enabled);
        window.dispatchEvent(new CustomEvent('novi-gitenabled-changed', { detail: { enabled } }));
      },
    ));
  }

  private renderEditorSettings(): void {
    const heading = el('h2', {}, 'Editor Settings');
    setStyles(heading, { margin: '0 0 24px 0', fontWeight: '400', fontSize: '1.3em' });
    this.contentEl.appendChild(heading);

    const sectionLabel = el('div', {}, 'Editing');
    setStyles(sectionLabel, {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '12px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    this.contentEl.appendChild(sectionLabel);

    this.contentEl.appendChild(this.createToggleRow(
      'VI Mode',
      'Enable VI mode emulation in the editor',
      this.vimodeEnabled,
      async (enabled) => {
        this.vimodeEnabled = enabled;
        await window.api?.setSetting('vimode', enabled);
        window.dispatchEvent(new CustomEvent('novi-vimode-changed', { detail: { enabled } }));
      },
    ));

    this.contentEl.appendChild(this.createToggleRow(
      'Word Wrap',
      'Wrap long lines to fit the editor width by default',
      this.wordWrapDefault,
      async (enabled) => {
        this.wordWrapDefault = enabled;
        await window.api?.setSetting('wordwrap', enabled);
        window.dispatchEvent(new CustomEvent('novi-wordwrap-changed', { detail: { enabled } }));
        this.render(); // Hard Break's disabled state depends on this
      },
    ));

    this.contentEl.appendChild(this.createColumnBreakSection());

    this.contentEl.appendChild(this.createToggleRow(
      'Show Ruler',
      `Show a vertical guide line at column ${this.columnBreakValue}`,
      this.showRulerEnabled,
      async (enabled) => {
        this.showRulerEnabled = enabled;
        await window.api?.setSetting('showruler', enabled);
        window.dispatchEvent(new CustomEvent('novi-showruler-changed', { detail: { enabled, column: this.columnBreakValue } }));
      },
    ));
  }

  /**
   * Column Break: a target line-length column, independent of Word Wrap.
   * Its "Hard Break" sub-option inserts a real newline as the user types
   * past the column, instead of Monaco's purely-visual wrap — the two are
   * alternatives, so hard-break is ignored while Word Wrap is on.
   */
  private createColumnBreakSection(): HTMLElement {
    const container = el('div');

    const dispatchChange = () => {
      window.dispatchEvent(new CustomEvent('novi-columnbreak-changed', {
        detail: { enabled: this.columnBreakEnabled, value: this.columnBreakValue, hard: this.columnBreakHard },
      }));
    };

    container.appendChild(this.createToggleRow(
      'Column Break',
      'Mark a target line-length column',
      this.columnBreakEnabled,
      async (enabled) => {
        this.columnBreakEnabled = enabled;
        await window.api?.setSetting('columnbreak', enabled);
        dispatchChange();
      },
    ));

    const valueRow = this.createNumberFieldRow(
      'Column',
      this.columnBreakValue,
      async (value) => {
        this.columnBreakValue = value;
        await window.api?.setSetting('columnbreakvalue', value);
        dispatchChange();
        this.render(); // Show Ruler's description echoes the column value
      },
    );
    setStyles(valueRow, { marginLeft: '32px' });
    container.appendChild(valueRow);

    const hardBreakRow = this.createToggleRow(
      'Hard Break',
      'Insert an actual newline instead of just wrapping visually (ignored while Word Wrap is on)',
      this.columnBreakHard,
      async (enabled) => {
        this.columnBreakHard = enabled;
        await window.api?.setSetting('columnbreakhard', enabled);
        dispatchChange();
      },
      this.wordWrapDefault,
    );
    setStyles(hardBreakRow, { marginLeft: '32px' });
    container.appendChild(hardBreakRow);

    return container;
  }

  private createNumberFieldRow(
    label: string,
    value: number,
    onChange: (value: number) => void,
  ): HTMLElement {
    const row = el('div');
    setStyles(row, {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 12px',
      marginBottom: '4px',
      borderRadius: '4px',
      fontFamily: "'Segoe UI', sans-serif",
    });

    const labelEl = el('div', {}, label);
    setStyles(labelEl, { fontSize: '13px', fontWeight: '500', flex: '1' });

    const input = el('input', { type: 'text', value: String(value) }) as HTMLInputElement;
    setStyles(input, {
      width: '56px',
      padding: '5px 8px',
      fontSize: '12px',
      backgroundColor: '#3c3c3c',
      color: '#cccccc',
      border: '1px solid #555',
      borderRadius: '3px',
      outline: 'none',
      textAlign: 'center',
    });

    const commit = () => {
      const parsed = parseInt(input.value, 10);
      const clamped = Number.isFinite(parsed) ? Math.max(1, Math.min(500, parsed)) : value;
      input.value = String(clamped);
      if (clamped !== value) onChange(clamped);
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    });

    row.append(labelEl, input);
    return row;
  }

  private createToggleRow(
    label: string,
    description: string,
    value: boolean,
    onChange: (value: boolean) => void,
    disabled = false,
  ): HTMLElement {
    const row = el('div');
    setStyles(row, {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 12px',
      marginBottom: '4px',
      borderRadius: '4px',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? '0.5' : '1',
      fontFamily: "'Segoe UI', sans-serif",
    });
    if (!disabled) {
      row.addEventListener('mouseenter', () => { row.style.backgroundColor = '#2a2d2e'; });
      row.addEventListener('mouseleave', () => { row.style.backgroundColor = 'transparent'; });
    }

    const checkbox = el('input', { type: 'checkbox' }) as HTMLInputElement;
    checkbox.checked = value;
    checkbox.disabled = disabled;
    setStyles(checkbox, { marginRight: '12px', cursor: disabled ? 'default' : 'pointer', flexShrink: '0' });

    const textCol = el('div');
    const labelEl = el('div', {}, disabled ? `${label} (disabled)` : label);
    setStyles(labelEl, { fontSize: '13px', fontWeight: '500' });
    const descEl = el('div', {}, description);
    setStyles(descEl, { fontSize: '11px', opacity: '0.6', marginTop: '2px' });
    textCol.appendChild(labelEl);
    textCol.appendChild(descEl);

    row.appendChild(checkbox);
    row.appendChild(textCol);

    if (!disabled) {
      const toggle = () => {
        checkbox.checked = !checkbox.checked;
        onChange(checkbox.checked);
      };
      checkbox.addEventListener('change', () => onChange(checkbox.checked));
      row.addEventListener('click', (e) => {
        if (e.target !== checkbox) toggle();
      });
    }

    return row;
  }

  private renderTerminalSettings(): void {
    const heading = el('h2', {}, 'Terminal Settings');
    setStyles(heading, { margin: '0 0 24px 0', fontWeight: '400', fontSize: '1.3em' });
    this.contentEl.appendChild(heading);

    const sectionLabel = el('div', {}, 'Default Shell');
    setStyles(sectionLabel, {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '12px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    this.contentEl.appendChild(sectionLabel);

    const description = el('div', {}, 'Select the shell used for new terminal tabs. Changing the shell will restart the home terminal.');
    setStyles(description, {
      fontSize: '12px',
      opacity: '0.6',
      marginBottom: '16px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    this.contentEl.appendChild(description);

    if (this.platform === 'linux') {
      this.renderLinuxShellSettings();
    } else {
      this.renderWindowsShellSettings();
    }
  }

  // ---- Windows shell options ----

  private renderWindowsShellSettings(): void {
    if (!this.wslChecked && this.hasBeenShown) {
      this.wslChecked = true;
      window.api?.checkWslAvailable?.().then((available: boolean) => {
        this.wslAvailable = available;
        this.render();
      }).catch(() => { /* leave wslAvailable as-is */ });
    }

    const options: ShellOption[] = [
      { type: 'gitbash', label: 'Git Bash', description: 'Git for Windows bash shell', hasPath: true, pathLabel: 'Git Bash Path' },
      { type: 'cmd', label: 'Command Prompt', description: 'Windows cmd.exe — no directory tracking' },
      { type: 'powershell', label: 'PowerShell', description: 'Windows PowerShell' },
      {
        type: 'wsl',
        label: 'WSL Bash',
        description: this.wslAvailable
          ? 'Windows Subsystem for Linux'
          : 'Windows Subsystem for Linux — not available',
        unavailableReason: this.wslAvailable ? undefined : 'WSL is not installed or has no distributions',
      },
    ];

    for (const option of options) {
      this.contentEl.appendChild(this.createShellOption(option));
      // Inline path selector right after the selected radio that needs it
      if (option.hasPath && this.currentShellType === option.type) {
        this.contentEl.appendChild(this.createPathSelector(option.pathLabel || 'Path', this.currentShellPath));
      }
    }
  }

  // ---- Linux shell settings ----

  private renderLinuxShellSettings(): void {
    const option: ShellOption = {
      type: 'linux',
      label: 'Linux Shell',
      description: 'System shell',
    };
    this.contentEl.appendChild(this.createShellOption(option));

    // Use Default checkbox
    const checkRow = el('div');
    setStyles(checkRow, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      marginBottom: '4px',
      fontFamily: "'Segoe UI', sans-serif",
    });

    const checkbox = el('input', { type: 'checkbox' }) as HTMLInputElement;
    checkbox.checked = this.linuxUseDefault;
    setStyles(checkbox, { marginRight: '8px', cursor: 'pointer' });
    checkbox.addEventListener('change', () => {
      this.linuxUseDefault = checkbox.checked;
      window.api?.setSetting('shellUseDefault', this.linuxUseDefault);
      if (this.linuxUseDefault) {
        this.applyShellChange();
      }
      this.render();
    });

    const cbLabel = el('label', {}, 'Use default shell ($SHELL)');
    setStyles(cbLabel, { fontSize: '13px', cursor: 'pointer' });
    cbLabel.addEventListener('click', () => { checkbox.click(); });

    checkRow.appendChild(checkbox);
    checkRow.appendChild(cbLabel);
    this.contentEl.appendChild(checkRow);

    // Show path input when not using default
    if (!this.linuxUseDefault) {
      this.contentEl.appendChild(this.createPathInput('Shell Path', this.currentShellPath, '/bin/bash'));
    }
  }

  // ---- Shared UI builders ----

  private createShellOption(option: ShellOption): HTMLElement {
    const isSelected = this.currentShellType === option.type;
    const isDisabled = !!option.unavailableReason;

    const row = el('div');
    setStyles(row, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      marginBottom: '4px',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      borderRadius: '4px',
      backgroundColor: isSelected ? '#37373d' : 'transparent',
      opacity: isDisabled ? '0.4' : '1',
      fontFamily: "'Segoe UI', sans-serif",
    });

    const radio = el('div');
    setStyles(radio, {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      border: isSelected ? '2px solid #007acc' : '2px solid #555',
      marginRight: '12px',
      flexShrink: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    if (isSelected) {
      const dot = el('div');
      setStyles(dot, {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#007acc',
      });
      radio.appendChild(dot);
    }

    const textCol = el('div', {}, '');
    const label = el('div', {}, option.label);
    setStyles(label, { fontSize: '13px', fontWeight: '500' });
    const desc = el('div', {}, option.description);
    setStyles(desc, { fontSize: '11px', opacity: '0.6', marginTop: '2px' });
    textCol.appendChild(label);
    textCol.appendChild(desc);
    if (isDisabled && option.unavailableReason) {
      const warn = el('div', {}, option.unavailableReason);
      setStyles(warn, { fontSize: '11px', color: '#d19a66', marginTop: '2px' });
      textCol.appendChild(warn);
    }

    row.appendChild(radio);
    row.appendChild(textCol);

    if (!isDisabled) {
      row.addEventListener('mouseenter', () => {
        if (!isSelected) row.style.backgroundColor = '#2a2d2e';
      });
      row.addEventListener('mouseleave', () => {
        if (!isSelected) row.style.backgroundColor = 'transparent';
      });
      row.addEventListener('click', () => {
        if (this.currentShellType !== option.type) {
          this.currentShellType = option.type;
          this.applyShellChange();
        }
      });
    }

    return row;
  }

  private createPathSelector(label: string, currentPath: string): HTMLElement {
    const container = el('div');
    setStyles(container, {
      marginBottom: '8px',
      padding: '12px',
      backgroundColor: '#252526',
      borderRadius: '4px',
      border: '1px solid #3e3e42',
    });

    const pathLabel = el('div', {}, label);
    setStyles(pathLabel, {
      fontSize: '12px',
      fontWeight: '600',
      marginBottom: '8px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    container.appendChild(pathLabel);

    const inputRow = el('div');
    setStyles(inputRow, { display: 'flex', gap: '8px', alignItems: 'center' });

    const input = el('input', { type: 'text', value: currentPath }) as HTMLInputElement;
    setStyles(input, {
      flex: '1',
      padding: '6px 8px',
      fontSize: '12px',
      backgroundColor: '#3c3c3c',
      color: '#cccccc',
      border: '1px solid #555',
      borderRadius: '3px',
      outline: 'none',
      fontFamily: "'Segoe UI', sans-serif",
    });
    input.addEventListener('focus', () => { input.style.borderColor = '#007acc'; });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#555';
      if (input.value !== this.currentShellPath) {
        this.currentShellPath = input.value;
        this.applyShellChange();
      }
    });

    const browseBtn = el('button', {}, 'Browse...');
    setStyles(browseBtn, {
      padding: '6px 12px',
      fontSize: '12px',
      backgroundColor: '#0e639c',
      color: '#ffffff',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      fontFamily: "'Segoe UI', sans-serif",
    });
    browseBtn.addEventListener('mouseenter', () => { browseBtn.style.backgroundColor = '#1177bb'; });
    browseBtn.addEventListener('mouseleave', () => { browseBtn.style.backgroundColor = '#0e639c'; });
    browseBtn.addEventListener('click', async () => {
      const path = await window.api?.browseForExecutable?.();
      if (path) {
        input.value = path;
        this.currentShellPath = path;
        this.applyShellChange();
      }
    });

    inputRow.appendChild(input);
    inputRow.appendChild(browseBtn);
    container.appendChild(inputRow);

    return container;
  }

  private createPathInput(label: string, currentPath: string, placeholder: string): HTMLElement {
    const container = el('div');
    setStyles(container, {
      marginBottom: '8px',
      padding: '12px',
      backgroundColor: '#252526',
      borderRadius: '4px',
      border: '1px solid #3e3e42',
    });

    const pathLabel = el('div', {}, label);
    setStyles(pathLabel, {
      fontSize: '12px',
      fontWeight: '600',
      marginBottom: '8px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    container.appendChild(pathLabel);

    const input = el('input', { type: 'text', value: currentPath, placeholder }) as HTMLInputElement;
    setStyles(input, {
      width: '100%',
      padding: '6px 8px',
      fontSize: '12px',
      backgroundColor: '#3c3c3c',
      color: '#cccccc',
      border: '1px solid #555',
      borderRadius: '3px',
      outline: 'none',
      boxSizing: 'border-box',
      fontFamily: "'Segoe UI', sans-serif",
    });
    input.addEventListener('focus', () => { input.style.borderColor = '#007acc'; });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#555';
      if (input.value !== this.currentShellPath) {
        this.currentShellPath = input.value;
        this.applyShellChange();
      }
    });

    container.appendChild(input);
    return container;
  }

  private async applyShellChange(): Promise<void> {
    try {
      await window.api?.setSetting('shellType', this.currentShellType);
      await window.api?.setSetting('shellPath', this.currentShellPath);
      // Update status bar shell label
      (window as any).__appInstance?.updateShellLabel?.(this.currentShellType);
      // Destroy and recreate home terminal from scratch (truly fresh, like first load)
      await (window as any).__appInstance?.recreateHomeTerminal?.();
    } catch (error) {
      console.error('[SettingsTab] Failed to apply shell change:', error);
    }
    this.render();
  }
}
