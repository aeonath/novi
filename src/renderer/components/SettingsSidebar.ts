/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * SettingsSidebar - Sidebar listing settings sections.
 * Replaces the file tree when the settings tab is active.
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';
import type { SettingsSection } from './SettingsTab.js';

interface SettingsSidebarConfig {
  onSectionSelect: (section: SettingsSection) => void;
}

interface SectionDef {
  id: SettingsSection;
  label: string;
  icon: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'terminal', label: 'Terminal', icon: '\u{1F4BB}' },
  { id: 'editor',   label: 'Editor',   icon: '\u{1F4DD}' },
  { id: 'novi',     label: 'Novi',     icon: '\u2699\uFE0F' },
];

export class SettingsSidebar extends Component {
  private listEl: HTMLElement;
  private activeSection: SettingsSection = 'terminal';
  private onSectionSelect: (section: SettingsSection) => void;

  constructor(config: SettingsSidebarConfig) {
    super('div');
    this.onSectionSelect = config.onSectionSelect;

    setStyles(this.el, {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#252526',
      color: '#cccccc',
    });

    // Header
    const header = el('div', {}, 'SETTINGS');
    setStyles(header, {
      padding: '10px 16px 6px',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.5px',
      color: '#888888',
      fontFamily: "'Segoe UI', sans-serif",
    });

    this.listEl = el('div');
    setStyles(this.listEl, {
      flex: '1',
      overflow: 'auto',
    });

    this.el.appendChild(header);
    this.el.appendChild(this.listEl);
    this.render();
  }

  get section(): SettingsSection { return this.activeSection; }

  set section(value: SettingsSection) {
    this.activeSection = value;
    this.render();
  }

  private render(): void {
    clearChildren(this.listEl);
    for (const def of SECTIONS) {
      const item = el('div', {}, `${def.icon}  ${def.label}`);
      const isActive = def.id === this.activeSection;
      setStyles(item, {
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: "'Segoe UI', sans-serif",
        backgroundColor: isActive ? '#37373d' : 'transparent',
        color: isActive ? '#ffffff' : '#cccccc',
        borderLeft: isActive ? '2px solid #007acc' : '2px solid transparent',
      });
      item.addEventListener('mouseenter', () => {
        if (!isActive) item.style.backgroundColor = '#2a2d2e';
      });
      item.addEventListener('mouseleave', () => {
        if (!isActive) item.style.backgroundColor = 'transparent';
      });
      item.addEventListener('click', () => {
        this.activeSection = def.id;
        this.onSectionSelect(def.id);
        this.render();
      });
      this.listEl.appendChild(item);
    }
  }
}
