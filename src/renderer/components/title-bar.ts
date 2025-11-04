/**
 * Title Bar Component
 * Custom title bar with window controls for frameless window
 */

export interface TitleBarOptions {
  title?: string;
  showTitle?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

export class TitleBar {
  private container: HTMLElement;
  private titleElement: HTMLElement;
  private maximizeButton: HTMLElement;
  private isMaximized: boolean = false;

  constructor(options: TitleBarOptions = {}) {
    this.container = this.createTitleBar(options);
    this.titleElement = this.container.querySelector('.title-bar-title') as HTMLElement;
    this.maximizeButton = this.container.querySelector(
      '.title-bar-button-maximize'
    ) as HTMLElement;

    // Initialize maximize state
    void this.updateMaximizeState();

    // Set up event listeners
    this.setupEventListeners();
  }

  private createTitleBar(options: TitleBarOptions): HTMLElement {
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.style.cssText = `
      display: flex;
      height: 32px;
      background-color: ${options.backgroundColor || '#2d2d30'};
      color: ${options.foregroundColor || '#cccccc'};
      -webkit-app-region: drag;
      user-select: none;
      border-bottom: 1px solid #3e3e42;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px;
    `;

    // Left section with title
    const leftSection = document.createElement('div');
    leftSection.className = 'title-bar-left';
    leftSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const title = document.createElement('div');
    title.className = 'title-bar-title';
    title.textContent = options.title || 'Nova IDE';
    title.style.cssText = `
      font-size: 12px;
      font-weight: 400;
      color: ${options.foregroundColor || '#cccccc'};
    `;

    leftSection.appendChild(title);
    titleBar.appendChild(leftSection);

    // Right section with window controls
    const controlsSection = document.createElement('div');
    controlsSection.className = 'title-bar-controls';
    controlsSection.style.cssText = `
      display: flex;
      -webkit-app-region: no-drag;
    `;

    // Minimize button
    const minimizeButton = this.createButton('minimize', '−');
    minimizeButton.className = 'title-bar-button title-bar-button-minimize';

    // Maximize/Restore button
    const maximizeButton = this.createButton('maximize', '□');
    maximizeButton.className = 'title-bar-button title-bar-button-maximize';

    // Close button
    const closeButton = this.createButton('close', '×');
    closeButton.className = 'title-bar-button title-bar-button-close';
    closeButton.style.cssText += `
      font-size: 20px;
    `;

    controlsSection.appendChild(minimizeButton);
    controlsSection.appendChild(maximizeButton);
    controlsSection.appendChild(closeButton);

    titleBar.appendChild(controlsSection);

    return titleBar;
  }

  private createButton(action: string, label: string): HTMLElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.dataset.action = action;
    button.style.cssText = `
      width: 46px;
      height: 32px;
      border: none;
      background: transparent;
      color: #cccccc;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background-color 0.15s ease;
    `;

    // Hover effects
    button.addEventListener('mouseenter', () => {
      if (action === 'close') {
        button.style.backgroundColor = '#e81123';
        button.style.color = '#ffffff';
      } else {
        button.style.backgroundColor = '#3e3e42';
      }
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = '#cccccc';
    });

    return button;
  }

  private setupEventListeners(): void {
    // Window control buttons
    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the closest element with data-action attribute
      const actionElement = target.closest('[data-action]') as HTMLElement;
      const action = actionElement?.dataset.action;

      if (action === 'minimize') {
        this.minimize();
      } else if (action === 'maximize') {
        this.maximize();
      } else if (action === 'close') {
        this.close();
      }
    });
  }

  private async updateMaximizeState(): Promise<void> {
    try {
      if (window.api && window.api.windowIsMaximized) {
        this.isMaximized = await window.api.windowIsMaximized();
        this.maximizeButton.textContent = this.isMaximized ? '❐' : '□';
      }
    } catch (error) {
      console.error('Failed to get window maximize state:', error);
    }
  }

  private minimize(): void {
    try {
      if (window.api && window.api.windowMinimize) {
        window.api.windowMinimize();
      }
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }

  private maximize(): void {
    try {
      if (window.api && window.api.windowMaximize) {
        window.api.windowMaximize();
        // Toggle state immediately for better UX
        this.isMaximized = !this.isMaximized;
        this.maximizeButton.textContent = this.isMaximized ? '❐' : '□';
        // Update actual state after a short delay
        setTimeout(() => void this.updateMaximizeState(), 100);
      }
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  }

  private close(): void {
    try {
      if (window.api && window.api.windowClose) {
        window.api.windowClose();
      }
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }

  public setTitle(title: string): void {
    this.titleElement.textContent = title;
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.container.remove();
  }
}

