/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * SettingsPanel - Settings UI (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';

interface Setting {
  key: string;
  label: string;
  type: 'toggle' | 'number' | 'text' | 'select';
  value: any;
  options?: string[];
}

export class SettingsPanel extends Component {
  private contentEl: HTMLElement;
  private settings: Setting[] = [];

  constructor() {
    super('div');

    // Overlay
    setStyles(this.el, {
      position: 'fixed',
      top: '0', left: '0', right: '0', bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
    });
    this.el.addEventListener('click', () => this.hide());

    const closeBtn = el('button', {}, '\u00d7');
    setStyles(closeBtn, {
      background: 'transparent', border: 'none', color: '#cccccc',
      fontSize: '24px', cursor: 'pointer', padding: '0', width: '30px', height: '30px',
    });
    closeBtn.addEventListener('click', () => this.hide());

    const title = el('h2', {}, 'Settings');
    setStyles(title, { margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#cccccc' });

    const header = el('div', {}, title, closeBtn);
    setStyles(header, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 20px', borderBottom: '1px solid #3e3e42',
    });

    this.contentEl = el('div');
    setStyles(this.contentEl, { padding: '20px', overflowY: 'auto' });

    const panel = el('div', {}, header, this.contentEl);
    setStyles(panel, {
      backgroundColor: '#1e1e1e',
      border: '1px solid #3e3e42',
      borderRadius: '8px',
      width: '500px',
      maxHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    });
    panel.addEventListener('click', (e) => e.stopPropagation());

    this.el.appendChild(panel);

    // Expose API
    (window as any).__settingsPanelAPI = {
      show: () => this.show(),
      hide: () => this.hide(),
    };
  }

  async show(): Promise<void> {
    await this.loadSettings();
    this.renderSettings();
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  private async loadSettings(): Promise<void> {
    if (!window.api?.getSetting) return;

    try {
      const theme = await window.api.getSetting<string>('theme', 'dark');
      const fontSize = await window.api.getSetting<number>('fontSize', 14);
      const wordWrap = await window.api.getSetting<boolean>('wordWrap', false);
      const autoSave = await window.api.getSetting<boolean>('autoSave', true);

      this.settings = [
        { key: 'theme', label: 'Theme', type: 'select', value: theme, options: ['light', 'dark'] },
        { key: 'fontSize', label: 'Font Size', type: 'number', value: fontSize },
        { key: 'wordWrap', label: 'Word Wrap', type: 'toggle', value: wordWrap },
        { key: 'autoSave', label: 'Auto Save', type: 'toggle', value: autoSave },
      ];
    } catch (error) {
      console.error('[SettingsPanel] Failed to load settings:', error);
    }
  }

  private async updateSetting(key: string, value: any): Promise<void> {
    if (!window.api?.setSetting) return;

    try {
      await window.api.setSetting(key, value);
      const setting = this.settings.find(s => s.key === key);
      if (setting) setting.value = value;
    } catch (error) {
      console.error(`[SettingsPanel] Failed to update ${key}:`, error);
    }
  }

  private renderSettings(): void {
    clearChildren(this.contentEl);

    for (const setting of this.settings) {
      const label = el('label', {}, setting.label);
      setStyles(label, { color: '#cccccc', fontSize: '14px' });

      let control: HTMLElement;

      if (setting.type === 'toggle') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = setting.value;
        setStyles(checkbox, { width: '20px', height: '20px', cursor: 'pointer' });
        checkbox.addEventListener('change', () => this.updateSetting(setting.key, checkbox.checked));
        control = checkbox;
      } else if (setting.type === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = String(setting.value);
        setStyles(input, {
          backgroundColor: '#2d2d30', border: '1px solid #3e3e42', color: '#cccccc',
          padding: '6px 10px', borderRadius: '4px', fontSize: '14px', width: '100px',
        });
        input.addEventListener('change', () => this.updateSetting(setting.key, parseInt(input.value, 10)));
        control = input;
      } else if (setting.type === 'select') {
        const select = document.createElement('select');
        select.value = setting.value;
        setStyles(select, {
          backgroundColor: '#2d2d30', border: '1px solid #3e3e42', color: '#cccccc',
          padding: '6px 10px', borderRadius: '4px', fontSize: '14px', cursor: 'pointer',
        });
        for (const opt of setting.options ?? []) {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          select.appendChild(option);
        }
        select.value = setting.value;
        select.addEventListener('change', () => this.updateSetting(setting.key, select.value));
        control = select;
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = String(setting.value);
        setStyles(input, {
          backgroundColor: '#2d2d30', border: '1px solid #3e3e42', color: '#cccccc',
          padding: '6px 10px', borderRadius: '4px', fontSize: '14px', width: '200px',
        });
        input.addEventListener('change', () => this.updateSetting(setting.key, input.value));
        control = input;
      }

      const row = el('div', {}, label, control);
      setStyles(row, {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px',
      });
      this.contentEl.appendChild(row);
    }
  }

  protected onDestroy(): void {
    delete (window as any).__settingsPanelAPI;
  }
}
