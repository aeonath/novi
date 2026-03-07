/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * SettingsTab - Settings tab content area.
 * Displays settings for the selected section (Terminal, Editor, Novi).
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';

export type SettingsSection = 'terminal' | 'editor' | 'novi';
export type ShellType = 'gitbash' | 'cmd' | 'powershell' | 'wsl';

const HOME_TERMINAL_ID = 'terminal-home';

interface ShellOption {
  type: ShellType;
  label: string;
  description: string;
}

const SHELL_OPTIONS: ShellOption[] = [
  { type: 'gitbash', label: 'Git Bash', description: 'Git for Windows bash shell' },
  { type: 'cmd', label: 'Command Prompt', description: 'Windows cmd.exe' },
  { type: 'powershell', label: 'PowerShell', description: 'Windows PowerShell' },
  { type: 'wsl', label: 'WSL Bash', description: 'Windows Subsystem for Linux' },
];

export class SettingsTab extends Component {
  private contentEl: HTMLElement;
  private activeSection: SettingsSection = 'terminal';
  private currentShellType: ShellType = 'gitbash';
  private currentShellPath = 'C:\\Program Files\\Git\\bin\\bash.exe';

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
    this.loadShellSettings().then(() => this.render());
  }

  get section(): SettingsSection { return this.activeSection; }

  set section(value: SettingsSection) {
    if (this.activeSection !== value) {
      this.activeSection = value;
      this.render();
    }
  }

  private async loadShellSettings(): Promise<void> {
    try {
      const st = await window.api?.getSetting<ShellType>('shellType', 'gitbash');
      const sp = await window.api?.getSetting<string>('shellPath', 'C:\\Program Files\\Git\\bin\\bash.exe');
      this.currentShellType = st || 'gitbash';
      this.currentShellPath = sp || 'C:\\Program Files\\Git\\bin\\bash.exe';
    } catch { /* use defaults */ }
  }

  private render(): void {
    clearChildren(this.contentEl);
    switch (this.activeSection) {
      case 'terminal': this.renderTerminalSettings(); break;
      case 'editor': this.renderPlaceholder('Editor'); break;
      case 'novi': this.renderPlaceholder('Novi'); break;
    }
  }

  private renderPlaceholder(label: string): void {
    const wrapper = el('div');
    setStyles(wrapper, {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    });
    const heading = el('h2', {}, `${label} Settings`);
    setStyles(heading, { margin: '0 0 12px 0', fontWeight: '400', fontSize: '1.3em' });
    const message = el('p', {}, 'Settings coming.');
    setStyles(message, { opacity: '0.5', margin: '0' });
    wrapper.appendChild(heading);
    wrapper.appendChild(message);
    this.contentEl.appendChild(wrapper);
  }

  private renderTerminalSettings(): void {
    // Heading
    const heading = el('h2', {}, 'Terminal Settings');
    setStyles(heading, { margin: '0 0 24px 0', fontWeight: '400', fontSize: '1.3em' });
    this.contentEl.appendChild(heading);

    // Shell selection
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

    // Shell radio options
    for (const option of SHELL_OPTIONS) {
      const row = this.createShellOption(option);
      this.contentEl.appendChild(row);
    }

    // Git Bash path selector (only shown when gitbash is selected)
    if (this.currentShellType === 'gitbash') {
      this.contentEl.appendChild(this.createPathSelector());
    }
  }

  private createShellOption(option: ShellOption): HTMLElement {
    const isSelected = this.currentShellType === option.type;

    const row = el('div');
    setStyles(row, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      marginBottom: '4px',
      cursor: 'pointer',
      borderRadius: '4px',
      backgroundColor: isSelected ? '#37373d' : 'transparent',
      fontFamily: "'Segoe UI', sans-serif",
    });

    // Radio circle
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

    const textCol = el('div');
    const label = el('div', {}, option.label);
    setStyles(label, { fontSize: '13px', fontWeight: '500' });
    const desc = el('div', {}, option.description);
    setStyles(desc, { fontSize: '11px', opacity: '0.6', marginTop: '2px' });
    textCol.appendChild(label);
    textCol.appendChild(desc);

    row.appendChild(radio);
    row.appendChild(textCol);

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

    return row;
  }

  private createPathSelector(): HTMLElement {
    const container = el('div');
    setStyles(container, {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: '#252526',
      borderRadius: '4px',
      border: '1px solid #3e3e42',
    });

    const label = el('div', {}, 'Git Bash Path');
    setStyles(label, {
      fontSize: '12px',
      fontWeight: '600',
      marginBottom: '8px',
      fontFamily: "'Segoe UI', sans-serif",
    });
    container.appendChild(label);

    const inputRow = el('div');
    setStyles(inputRow, { display: 'flex', gap: '8px', alignItems: 'center' });

    const input = el('input', { type: 'text', value: this.currentShellPath }) as HTMLInputElement;
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

  private async applyShellChange(): Promise<void> {
    try {
      await window.api?.setSetting('shellType', this.currentShellType);
      if (this.currentShellType === 'gitbash') {
        await window.api?.setSetting('shellPath', this.currentShellPath);
      }
      // Signal to App that this is a deliberate restart (not a user exit)
      (window as any).__restartingTerminalId = HOME_TERMINAL_ID;
      // Restart home terminal with new shell
      await window.api?.terminalRestart?.(HOME_TERMINAL_ID);
    } catch (error) {
      console.error('[SettingsTab] Failed to apply shell change:', error);
    }
    this.render();
  }

}
