/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Recovery Dialog Component
 * Shows available recovery files and allows restoration or discard
 */

import type { RecoveryFile } from '../../types/global.js';

export class RecoveryDialog {
  private container: HTMLElement;
  private onRestoreCallback: ((recoveryFile: RecoveryFile) => void) | null = null;
  private onDiscardCallback: ((id: string) => void) | null = null;
  private onDiscardAllCallback: (() => void) | null = null;

  constructor() {
    this.container = this.createDialogElement();
    document.body.appendChild(this.container);
  }

  /**
   * Create the dialog element
   */
  private createDialogElement(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.id = 'recovery-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    return dialog;
  }

  /**
   * Show the recovery dialog with available recovery files
   */
  public async show(): Promise<void> {
    try {
      const recoveryFiles = await window.api?.getRecoveryFiles();
      
      if (!recoveryFiles || recoveryFiles.length === 0) {
        return; // No recovery files to show
      }
      
      console.log(`[Recovery] Found ${recoveryFiles.length} recovery file(s)`);
      
      this.render(recoveryFiles);
      this.container.style.display = 'flex';
    } catch (error) {
      console.error('[Recovery] Failed to load recovery files:', error);
    }
  }

  /**
   * Hide the recovery dialog
   */
  public hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Set callback for when restore is clicked
   */
  public onRestore(callback: (recoveryFile: RecoveryFile) => void): void {
    this.onRestoreCallback = callback;
  }

  /**
   * Set callback for when discard is clicked
   */
  public onDiscard(callback: (id: string) => void): void {
    this.onDiscardCallback = callback;
  }

  /**
   * Set callback for when discard all is clicked
   */
  public onDiscardAll(callback: () => void): void {
    this.onDiscardAllCallback = callback;
  }

  /**
   * Render the recovery dialog content
   */
  private render(recoveryFiles: RecoveryFile[]): void {
    const content = document.createElement('div');
    content.style.cssText = `
      background: var(--background-primary, #1e1e1e);
      border: 1px solid var(--border-color, #3e3e42);
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    // Header
    const header = document.createElement('div');
    header.innerHTML = `
      <h2 style="margin: 0 0 8px 0; color: var(--text-primary, #ffffff); font-size: 20px;">
        Recover Unsaved Changes
      </h2>
      <p style="margin: 0 0 20px 0; color: var(--text-secondary, #cccccc); font-size: 14px;">
        Nova found ${recoveryFiles.length} file${recoveryFiles.length > 1 ? 's' : ''} with unsaved changes from a previous session.
      </p>
    `;
    content.appendChild(header);

    // Recovery file list
    const fileList = document.createElement('div');
    fileList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    `;

    for (const file of recoveryFiles) {
      const fileItem = this.createFileItem(file);
      fileList.appendChild(fileItem);
    }

    content.appendChild(fileList);

    // Footer buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;

    const discardAllBtn = document.createElement('button');
    discardAllBtn.textContent = 'Discard All';
    discardAllBtn.style.cssText = `
      padding: 8px 16px;
      background: transparent;
      border: 1px solid var(--border-color, #3e3e42);
      color: var(--text-secondary, #cccccc);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    discardAllBtn.addEventListener('click', () => {
      if (this.onDiscardAllCallback) {
        this.onDiscardAllCallback();
      }
      this.hide();
    });

    footer.appendChild(discardAllBtn);
    content.appendChild(footer);

    this.container.innerHTML = '';
    this.container.appendChild(content);
  }

  /**
   * Create a file item element
   */
  private createFileItem(file: RecoveryFile): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 16px;
      background: var(--background-secondary, #252526);
      border: 1px solid var(--border-color, #3e3e42);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // File info
    const info = document.createElement('div');
    const fileName = file.originalPath.split(/[\\/]/).pop() || 'Unknown file';
    const date = new Date(file.timestamp);
    const timeAgo = this.getTimeAgo(file.timestamp);

    info.innerHTML = `
      <div style="font-weight: 500; color: var(--text-primary, #ffffff); margin-bottom: 4px;">
        ${fileName}
      </div>
      <div style="font-size: 12px; color: var(--text-secondary, #cccccc);">
        ${file.originalPath}
      </div>
      <div style="font-size: 12px; color: var(--text-muted, #858585); margin-top: 4px;">
        Last saved ${timeAgo} (${date.toLocaleString()})
      </div>
    `;

    item.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    const restoreBtn = document.createElement('button');
    restoreBtn.textContent = 'Restore';
    restoreBtn.style.cssText = `
      padding: 6px 12px;
      background: var(--accent-color, #007acc);
      border: none;
      color: #ffffff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    `;
    restoreBtn.addEventListener('click', () => {
      if (this.onRestoreCallback) {
        this.onRestoreCallback(file);
      }
    });

    const discardBtn = document.createElement('button');
    discardBtn.textContent = 'Discard';
    discardBtn.style.cssText = `
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--border-color, #3e3e42);
      color: var(--text-secondary, #cccccc);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    `;
    discardBtn.addEventListener('click', () => {
      if (this.onDiscardCallback) {
        this.onDiscardCallback(file.id);
      }
      // Remove this item from the dialog
      item.remove();
    });

    actions.appendChild(restoreBtn);
    actions.appendChild(discardBtn);
    item.appendChild(actions);

    return item;
  }

  /**
   * Get human-readable time ago
   */
  private getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) {
      return 'just now';
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  /**
   * Destroy the dialog
   */
  public destroy(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}

