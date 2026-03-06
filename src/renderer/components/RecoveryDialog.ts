/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * RecoveryDialog - File recovery UI (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';

interface RecoveryFileLocal {
  id: string;
  filePath: string;
  savedAt: number;
}

export class RecoveryDialog extends Component {
  private fileListEl: HTMLElement;
  private messageEl: HTMLElement;
  private files: RecoveryFileLocal[] = [];

  constructor() {
    super('div');

    // Overlay
    setStyles(this.el, {
      position: 'fixed',
      top: '0', left: '0', right: '0', bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000',
    });

    const title = el('h2', {}, 'Recover Unsaved Files');
    setStyles(title, { margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#cccccc' });

    const header = el('div', {}, title);
    setStyles(header, { padding: '20px', borderBottom: '1px solid #3e3e42' });

    this.messageEl = el('p');
    setStyles(this.messageEl, { margin: '0 0 16px 0', color: '#cccccc', fontSize: '14px' });

    this.fileListEl = el('div');
    setStyles(this.fileListEl, { display: 'flex', flexDirection: 'column', gap: '12px' });

    const content = el('div', {}, this.messageEl, this.fileListEl);
    setStyles(content, { padding: '20px', overflowY: 'auto', flex: '1' });

    const discardBtn = el('button', { type: 'button' }, 'Discard All');
    setStyles(discardBtn, {
      padding: '8px 16px', backgroundColor: '#d13438', color: '#ffffff',
      border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
    });
    discardBtn.addEventListener('click', () => this.discardAll());

    const closeBtn = el('button', { type: 'button' }, 'Close');
    setStyles(closeBtn, {
      padding: '8px 16px', backgroundColor: '#3e3e42', color: '#cccccc',
      border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
    });
    closeBtn.addEventListener('click', () => this.hide());

    const footer = el('div', {}, discardBtn, closeBtn);
    setStyles(footer, {
      display: 'flex', justifyContent: 'flex-end', gap: '12px',
      padding: '16px 20px', borderTop: '1px solid #3e3e42',
    });

    const dialog = el('div', {}, header, content, footer);
    setStyles(dialog, {
      backgroundColor: '#1e1e1e',
      border: '1px solid #3e3e42',
      borderRadius: '8px',
      width: '600px',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
    });

    this.el.appendChild(dialog);
  }

  protected onMount(): void {
    void this.checkRecoveryFiles();
  }

  async checkRecoveryFiles(): Promise<void> {
    if (!window.api?.getRecoveryFiles) return;

    try {
      const recoveryFiles = await window.api.getRecoveryFiles();
      if (recoveryFiles.length > 0) {
        this.files = recoveryFiles.map(f => ({
          id: f.id,
          filePath: f.originalPath || 'Unknown',
          savedAt: f.timestamp,
        }));
        this.renderFileList();
        this.el.style.display = 'flex';
      }
    } catch (error) {
      console.error('[RecoveryDialog] Failed to check recovery files:', error);
    }
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  private async restoreFile(id: string): Promise<void> {
    if (!window.api?.deleteRecoveryFile) return;

    try {
      await window.api.deleteRecoveryFile(id);
      this.files = this.files.filter(f => f.id !== id);
      if (this.files.length === 0) {
        this.hide();
      } else {
        this.renderFileList();
      }
    } catch (error) {
      console.error('[RecoveryDialog] Failed to restore file:', error);
    }
  }

  private async discardAll(): Promise<void> {
    if (!window.api?.clearRecoveryFiles) return;

    try {
      await window.api.clearRecoveryFiles();
      this.files = [];
      this.hide();
    } catch (error) {
      console.error('[RecoveryDialog] Failed to discard all:', error);
    }
  }

  private renderFileList(): void {
    this.messageEl.textContent = `Nova found ${this.files.length} unsaved file(s) from a previous session.`;
    clearChildren(this.fileListEl);

    for (const file of this.files) {
      const fileName = el('div', {}, file.filePath);
      setStyles(fileName, { color: '#cccccc', fontSize: '14px', marginBottom: '4px' });

      const fileTime = el('div', {}, new Date(file.savedAt).toLocaleString());
      setStyles(fileTime, { color: '#858585', fontSize: '12px' });

      const fileInfo = el('div', {}, fileName, fileTime);
      setStyles(fileInfo, { flex: '1' });

      const restoreBtn = el('button', { type: 'button' }, 'Restore');
      setStyles(restoreBtn, {
        padding: '6px 16px', backgroundColor: '#0e639c', color: '#ffffff',
        border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
      });
      restoreBtn.addEventListener('click', () => this.restoreFile(file.id));

      const row = el('div', {}, fileInfo, restoreBtn);
      setStyles(row, {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px', backgroundColor: '#252526', borderRadius: '4px',
        border: '1px solid #3e3e42',
      });
      this.fileListEl.appendChild(row);
    }
  }
}
