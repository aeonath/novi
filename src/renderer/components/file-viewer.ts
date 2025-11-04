/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * File Viewer Component
 * Read-only text file viewer with syntax highlighting support
 */

import type { FileData } from '../../types/global';

export interface FileViewerOptions {
  container?: HTMLElement;
  onClose?: () => void;
}

export class FileViewer {
  private container: HTMLElement;
  private viewerElement: HTMLElement | null = null;
  private currentFile: FileData | null = null;
  private onCloseCallback?: () => void;

  constructor(options: FileViewerOptions = {}) {
    this.container = options.container || document.body;
    this.onCloseCallback = options.onClose;
    this.createViewer();
  }

  private createViewer(): void {
    const viewer = document.createElement('div');
    viewer.className = 'file-viewer';
    viewer.style.cssText = `
      display: none;
      flex-direction: column;
      height: 100%;
      background-color: var(--bg-primary, #1e1e1e);
      color: var(--fg-primary, #ffffff);
      overflow: hidden;
    `;

    // Header with file info and controls
    const header = document.createElement('div');
    header.className = 'file-viewer-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-sm, 8px) var(--space-md, 12px);
      background-color: var(--bg-secondary, #252526);
      border-bottom: 1px solid var(--border-default, #3e3e42);
      min-height: 40px;
    `;

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-viewer-info';
    fileInfo.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    `;

    const fileName = document.createElement('div');
    fileName.className = 'file-viewer-name';
    fileName.textContent = 'No file open';
    fileName.style.cssText = `
      font-size: var(--font-size-sm, 12px);
      font-weight: var(--font-weight-semibold, 600);
      color: var(--fg-primary, #ffffff);
    `;

    const filePath = document.createElement('div');
    filePath.className = 'file-viewer-path';
    filePath.style.cssText = `
      font-size: var(--font-size-xs, 11px);
      color: var(--fg-tertiary, #999999);
      font-family: var(--font-mono, monospace);
    `;

    fileInfo.appendChild(fileName);
    fileInfo.appendChild(filePath);

    const controls = document.createElement('div');
    controls.className = 'file-viewer-controls';
    controls.style.cssText = `
      display: flex;
      gap: var(--space-sm, 8px);
    `;

    // Close button
    const closeButton = this.createButton('×', 'Close file');
    closeButton.addEventListener('click', () => {
      this.close();
    });

    controls.appendChild(closeButton);

    header.appendChild(fileInfo);
    header.appendChild(controls);

    // Content area with line numbers
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'file-viewer-content-wrapper';
    contentWrapper.style.cssText = `
      display: flex;
      flex: 1;
      overflow: hidden;
    `;

    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'file-viewer-line-numbers';
    lineNumbers.style.cssText = `
      min-width: 50px;
      padding: var(--space-md, 12px) var(--space-sm, 8px);
      background-color: var(--bg-secondary, #252526);
      border-right: 1px solid var(--border-subtle, #2d2d30);
      color: var(--fg-tertiary, #999999);
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-sm, 12px);
      line-height: 1.6;
      text-align: right;
      user-select: none;
      overflow-y: auto;
    `;

    const content = document.createElement('pre');
    content.className = 'file-viewer-content';
    content.style.cssText = `
      flex: 1;
      margin: 0;
      padding: var(--space-md, 12px);
      background-color: var(--bg-primary, #1e1e1e);
      color: var(--fg-primary, #ffffff);
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-sm, 12px);
      line-height: 1.6;
      overflow: auto;
      white-space: pre;
      word-wrap: normal;
      tab-size: 4;
    `;

    contentWrapper.appendChild(lineNumbers);
    contentWrapper.appendChild(content);

    viewer.appendChild(header);
    viewer.appendChild(contentWrapper);

    this.container.appendChild(viewer);
    this.viewerElement = viewer;
  }

  private createButton(text: string, title?: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    if (title) {
      button.title = title;
    }
    button.style.cssText = `
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--fg-secondary, #cccccc);
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm, 2px);
      transition: background-color 0.15s ease, color 0.15s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--bg-elevated, #333333)';
      button.style.color = 'var(--fg-primary, #ffffff)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--fg-secondary, #cccccc)';
    });

    return button;
  }

  /**
   * Open and display a file
   */
  public async openFile(filePath: string): Promise<void> {
    if (!window.api) {
      console.error('API not available');
      return;
    }

    try {
      const fileData = await window.api.readFile(filePath);
      this.displayFile(fileData);
    } catch (error) {
      console.error('Failed to open file:', error);
      this.displayError(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Display file content
   */
  private displayFile(fileData: FileData): void {
    this.currentFile = fileData;

    if (!this.viewerElement) {
      return;
    }

    // Update file info
    const fileName = this.viewerElement.querySelector('.file-viewer-name') as HTMLElement;
    const filePath = this.viewerElement.querySelector('.file-viewer-path') as HTMLElement;
    
    if (fileName && filePath) {
      const pathParts = fileData.path.split(/[\\/]/);
      fileName.textContent = pathParts[pathParts.length - 1];
      filePath.textContent = fileData.path;
    }

    // Update content
    const content = this.viewerElement.querySelector('.file-viewer-content') as HTMLPreElement;
    const lineNumbers = this.viewerElement.querySelector('.file-viewer-line-numbers') as HTMLElement;
    
    if (content && lineNumbers) {
      // Use textContent for safe display (automatically escapes HTML)
      content.textContent = fileData.content;

      // Generate line numbers
      const lines = fileData.content.split('\n');
      lineNumbers.textContent = lines.map((_, i) => i + 1).join('\n');

      // Synchronize scroll
      content.addEventListener('scroll', () => {
        lineNumbers.scrollTop = content.scrollTop;
      });
    }

    this.show();
  }

  /**
   * Display an error message
   */
  private displayError(message: string): void {
    if (!this.viewerElement) {
      return;
    }

    const content = this.viewerElement.querySelector('.file-viewer-content') as HTMLPreElement;
    if (content) {
      content.textContent = `Error: ${message}`;
      content.style.color = 'var(--accent-error, #f14c4c)';
    }

    this.show();
  }

  /**
   * Reload the current file
   */
  public async reload(): Promise<void> {
    if (!this.currentFile) {
      console.warn('No file to reload');
      return;
    }

    await this.openFile(this.currentFile.path);
  }

  /**
   * Close the file viewer
   */
  public close(): void {
    this.currentFile = null;
    this.hide();

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  /**
   * Show the viewer
   */
  public show(): void {
    if (this.viewerElement) {
      this.viewerElement.style.display = 'flex';
    }
  }

  /**
   * Hide the viewer
   */
  public hide(): void {
    if (this.viewerElement) {
      this.viewerElement.style.display = 'none';
    }
  }

  /**
   * Check if viewer is visible
   */
  public isVisible(): boolean {
    return this.viewerElement?.style.display === 'flex';
  }

  /**
   * Get currently open file
   */
  public getCurrentFile(): FileData | null {
    return this.currentFile;
  }

  /**
   * Destroy the viewer
   */
  public destroy(): void {
    if (this.viewerElement) {
      this.viewerElement.remove();
      this.viewerElement = null;
    }
    this.currentFile = null;
  }
}

