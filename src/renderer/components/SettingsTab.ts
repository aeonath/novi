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

export class SettingsTab extends Component {
  private contentEl: HTMLElement;
  private activeSection: SettingsSection = 'terminal';

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
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.2em',
      textAlign: 'center',
    });

    this.el.appendChild(this.contentEl);
    this.render();
  }

  get section(): SettingsSection { return this.activeSection; }

  set section(value: SettingsSection) {
    if (this.activeSection !== value) {
      this.activeSection = value;
      this.render();
    }
  }

  private render(): void {
    clearChildren(this.contentEl);
    const heading = el('h2', {}, `${this.sectionLabel(this.activeSection)} Settings`);
    setStyles(heading, { margin: '0 0 12px 0', fontWeight: '400', fontSize: '1.3em' });
    const message = el('p', {}, 'Settings coming.');
    setStyles(message, { opacity: '0.5', margin: '0' });
    this.contentEl.appendChild(heading);
    this.contentEl.appendChild(message);
  }

  private sectionLabel(section: SettingsSection): string {
    switch (section) {
      case 'terminal': return 'Terminal';
      case 'editor': return 'Editor';
      case 'novi': return 'Novi';
    }
  }
}
