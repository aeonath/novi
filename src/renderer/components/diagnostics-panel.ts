/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Diagnostics Panel Component
 * Displays environment and version information for debugging
 */

export interface DiagnosticsData {
  timestamp: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  appVersion: string;
}

export class DiagnosticsPanel {
  private container: HTMLElement;
  private panelElement: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor(container?: HTMLElement) {
    this.container = container || document.body;
    this.createPanel();
  }

  private createPanel(): void {
    // Create overlay backdrop
    const overlay = document.createElement('div');
    overlay.className = 'diagnostics-overlay';
    overlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      backdrop-filter: blur(2px);
    `;

    // Create panel
    const panel = document.createElement('div');
    panel.className = 'diagnostics-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      max-width: 90vw;
      max-height: 80vh;
      background-color: var(--bg-secondary, #252526);
      border: 1px solid var(--border-default, #3e3e42);
      border-radius: var(--radius-md, 4px);
      box-shadow: var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.4));
      z-index: 9999;
      overflow: hidden;
      flex-direction: column;
      display: none;
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'diagnostics-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md, 12px) var(--space-lg, 16px);
      background-color: var(--bg-elevated, #2d2d30);
      border-bottom: 1px solid var(--border-default, #3e3e42);
    `;

    const title = document.createElement('h2');
    title.textContent = 'System Diagnostics';
    title.style.cssText = `
      margin: 0;
      font-size: var(--font-size-lg, 16px);
      font-weight: var(--font-weight-semibold, 600);
      color: var(--fg-primary, #ffffff);
    `;

    const closeButton = this.createButton('×', 'Close');
    closeButton.addEventListener('click', () => {
      this.hide();
    });

    header.appendChild(title);
    header.appendChild(closeButton);

    // Content area
    const content = document.createElement('div');
    content.className = 'diagnostics-content';
    content.style.cssText = `
      flex: 1;
      padding: var(--space-lg, 16px);
      overflow-y: auto;
      background-color: var(--bg-secondary, #252526);
    `;

    const infoTable = document.createElement('table');
    infoTable.className = 'diagnostics-table';
    infoTable.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-mono, monospace);
      font-size: var(--font-size-sm, 12px);
    `;

    content.appendChild(infoTable);

    // Footer with actions
    const footer = document.createElement('div');
    footer.className = 'diagnostics-footer';
    footer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-sm, 8px);
      padding: var(--space-md, 12px) var(--space-lg, 16px);
      background-color: var(--bg-elevated, #2d2d30);
      border-top: 1px solid var(--border-default, #3e3e42);
    `;

    const copyButton = this.createActionButton('Copy Info', 'copy');
    copyButton.addEventListener('click', () => {
      void this.copyDiagnostics();
    });

    footer.appendChild(copyButton);

    // Assemble panel
    panel.appendChild(header);
    panel.appendChild(content);
    panel.appendChild(footer);

    // Add to container
    this.container.appendChild(overlay);
    this.container.appendChild(panel);

    this.panelElement = panel;

    // Click overlay to close
    overlay.addEventListener('click', () => {
      this.hide();
    });

    // Store overlay reference
    (panel as HTMLElement & { overlay?: HTMLElement }).overlay = overlay;
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
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm, 2px);
      transition: background-color 0.15s ease, color 0.15s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--bg-hover, #3e3e42)';
      button.style.color = 'var(--fg-primary, #ffffff)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--fg-secondary, #cccccc)';
    });

    return button;
  }

  private createActionButton(text: string, action: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.dataset.action = action;
    button.style.cssText = `
      padding: var(--space-sm, 8px) var(--space-md, 12px);
      border: none;
      background-color: var(--accent-primary, #0078d4);
      color: var(--fg-primary, #ffffff);
      font-size: var(--font-size-sm, 12px);
      font-weight: var(--font-weight-medium, 500);
      cursor: pointer;
      border-radius: var(--radius-sm, 2px);
      transition: background-color 0.15s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--accent-primary-hover, #106ebe)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'var(--accent-primary, #0078d4)';
    });

    return button;
  }

  /**
   * Load and display diagnostics information
   */
  public async loadDiagnostics(): Promise<void> {
    if (!window.api) {
      console.error('API not available');
      return;
    }

    try {
      // Get diagnostics from main process
      const diagnosticsText = await window.api.copyDiagnostics();
      
      // Parse the diagnostics text
      const data = this.parseDiagnostics(diagnosticsText);
      
      // Display the data
      this.displayDiagnostics(data);
    } catch (error) {
      console.error('Failed to load diagnostics:', error);
      this.displayError('Failed to load diagnostics information');
    }
  }

  /**
   * Parse diagnostics text into structured data
   */
  private parseDiagnostics(text: string): DiagnosticsData {
    const lines = text.split('\n');
    const data: DiagnosticsData = {
      timestamp: '',
      platform: '',
      arch: '',
      nodeVersion: '',
      electronVersion: '',
      appVersion: '',
    };

    for (const line of lines) {
      if (line.includes('Timestamp:')) {
        data.timestamp = line.split('Timestamp:')[1]?.trim() || '';
      } else if (line.includes('Platform:')) {
        data.platform = line.split('Platform:')[1]?.trim() || '';
      } else if (line.includes('Architecture:')) {
        data.arch = line.split('Architecture:')[1]?.trim() || '';
      } else if (line.includes('Node.js Version:')) {
        data.nodeVersion = line.split('Node.js Version:')[1]?.trim() || '';
      } else if (line.includes('Electron Version:')) {
        data.electronVersion = line.split('Electron Version:')[1]?.trim() || '';
      } else if (line.includes('App Version:')) {
        data.appVersion = line.split('App Version:')[1]?.trim() || '';
      }
    }

    return data;
  }

  /**
   * Display diagnostics data in the panel
   */
  private displayDiagnostics(data: DiagnosticsData): void {
    if (!this.panelElement) {
      return;
    }

    const table = this.panelElement.querySelector('.diagnostics-table') as HTMLTableElement;
    if (!table) {
      return;
    }

    // Clear existing content
    table.innerHTML = '';

    // Create table rows
    const rows = [
      { label: 'Application Version', value: data.appVersion },
      { label: 'Electron Version', value: data.electronVersion },
      { label: 'Node.js Version', value: data.nodeVersion },
      { label: 'Platform', value: data.platform },
      { label: 'Architecture', value: data.arch },
      { label: 'Timestamp', value: data.timestamp },
    ];

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.style.cssText = `
        border-bottom: 1px solid var(--border-subtle, #2d2d30);
      `;

      const tdLabel = document.createElement('td');
      tdLabel.textContent = row.label;
      tdLabel.style.cssText = `
        padding: var(--space-sm, 8px) var(--space-md, 12px);
        color: var(--fg-secondary, #cccccc);
        font-weight: var(--font-weight-medium, 500);
        width: 40%;
      `;

      const tdValue = document.createElement('td');
      tdValue.textContent = row.value;
      tdValue.style.cssText = `
        padding: var(--space-sm, 8px) var(--space-md, 12px);
        color: var(--fg-primary, #ffffff);
        word-break: break-all;
      `;

      tr.appendChild(tdLabel);
      tr.appendChild(tdValue);
      table.appendChild(tr);
    });
  }

  /**
   * Display an error message
   */
  private displayError(message: string): void {
    if (!this.panelElement) {
      return;
    }

    const content = this.panelElement.querySelector('.diagnostics-content') as HTMLElement;
    if (content) {
      content.innerHTML = `
        <div style="
          padding: var(--space-lg, 16px);
          color: var(--accent-error, #f14c4c);
          text-align: center;
        ">
          ${message}
        </div>
      `;
    }
  }

  /**
   * Copy diagnostics to clipboard
   */
  private async copyDiagnostics(): Promise<void> {
    if (!window.api) {
      console.error('API not available');
      return;
    }

    try {
      const diagnosticsText = await window.api.copyDiagnostics();
      
      // Copy to clipboard using Clipboard API
      await navigator.clipboard.writeText(diagnosticsText);
      
      // Update button to show success
      const copyButton = this.panelElement?.querySelector('[data-action="copy"]') as HTMLButtonElement;
      if (copyButton) {
        const originalText = copyButton.textContent;
        const originalBg = copyButton.style.backgroundColor;
        
        copyButton.textContent = 'Copied!';
        copyButton.style.backgroundColor = 'var(--accent-success, #00cc00)';
        
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.backgroundColor = originalBg;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy diagnostics:', error);
    }
  }

  /**
   * Show the diagnostics panel
   */
  public async show(): Promise<void> {
    await this.loadDiagnostics();
    
    if (this.panelElement) {
      const overlay = (this.panelElement as HTMLElement & { overlay?: HTMLElement }).overlay;
      if (overlay) {
        overlay.style.display = 'block';
      }
      this.panelElement.style.display = 'flex';
      this.isVisible = true;
    }
  }

  /**
   * Hide the diagnostics panel
   */
  public hide(): void {
    if (this.panelElement) {
      const overlay = (this.panelElement as HTMLElement & { overlay?: HTMLElement }).overlay;
      if (overlay) {
        overlay.style.display = 'none';
      }
      this.panelElement.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Check if panel is visible
   */
  public visible(): boolean {
    return this.isVisible;
  }

  /**
   * Destroy the panel
   */
  public destroy(): void {
    if (this.panelElement) {
      const overlay = (this.panelElement as HTMLElement & { overlay?: HTMLElement }).overlay;
      if (overlay) {
        overlay.remove();
      }
      this.panelElement.remove();
      this.panelElement = null;
    }
    this.isVisible = false;
  }
}

