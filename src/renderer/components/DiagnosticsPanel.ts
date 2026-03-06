/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * DiagnosticsPanel - Environment diagnostics (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';

export class DiagnosticsPanel extends Component {
  private overlay: HTMLElement;
  private contentEl: HTMLElement;

  constructor() {
    super('div');

    // Overlay
    this.overlay = this.el;
    setStyles(this.overlay, {
      position: 'fixed',
      top: '0', left: '0', right: '0', bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
    });
    this.overlay.addEventListener('click', () => this.hide());

    const closeBtn = el('button', {}, '\u00d7');
    setStyles(closeBtn, {
      background: 'transparent', border: 'none', color: '#cccccc',
      fontSize: '24px', cursor: 'pointer', padding: '0', width: '30px', height: '30px',
    });
    closeBtn.addEventListener('click', () => this.hide());

    const title = el('h2', {}, 'Diagnostics');
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
      width: '600px',
      maxHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    });
    panel.addEventListener('click', (e) => e.stopPropagation());

    this.overlay.appendChild(panel);

    // Expose API
    (window as any).__diagnosticsPanelAPI = {
      show: () => this.show(),
      hide: () => this.hide(),
    };
  }

  async show(): Promise<void> {
    await this.loadDiagnostics();
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  private async loadDiagnostics(): Promise<void> {
    if (!window.api) return;

    try {
      const electronVersion = (process as any).versions?.electron ?? 'unknown';
      const nodeVersion = (process as any).versions?.node ?? 'unknown';
      const chromeVersion = (process as any).versions?.chrome ?? 'unknown';
      const appVersion = await window.api.getVersion();

      const entries: Record<string, string> = {
        'Electron': electronVersion,
        'Node.js': nodeVersion,
        'Chrome': chromeVersion,
        'Nova Version': appVersion,
        'Platform': navigator.platform,
        'User Agent': navigator.userAgent,
      };

      clearChildren(this.contentEl);
      for (const [key, value] of Object.entries(entries)) {
        const keySpan = el('span', {}, `${key}:`);
        setStyles(keySpan, { color: '#858585', minWidth: '150px', fontWeight: 'bold' });

        const valueSpan = el('span', {}, value);
        setStyles(valueSpan, { color: '#cccccc', flex: '1' });

        const row = el('div', {}, keySpan, valueSpan);
        setStyles(row, { display: 'flex', marginBottom: '12px', fontSize: '14px' });
        this.contentEl.appendChild(row);
      }
    } catch (error) {
      console.error('[DiagnosticsPanel] Failed to load diagnostics:', error);
    }
  }

  protected onDestroy(): void {
    delete (window as any).__diagnosticsPanelAPI;
  }
}
