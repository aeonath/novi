/**
 * Tab Bar Component
 * Manages tabs for multiple open files in the editor
 */

export interface Tab {
  id: string;
  filePath: string;
  fileName: string;
  isDirty: boolean;
  content: string;
  language: string;
}

export class TabBar {
  private container: HTMLElement;
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;
  private onTabSwitchCallback: ((tab: Tab) => void) | null = null;
  private onTabCloseCallback: ((tabId: string) => boolean) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initialize();
  }

  private initialize(): void {
    // Create tab bar structure
    this.container.innerHTML = '';
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      background: var(--background-secondary, #252526);
      border-bottom: 1px solid var(--border-color, #3e3e42);
      min-height: 35px;
      overflow-x: auto;
      overflow-y: hidden;
      user-select: none;
    `;
    
    // Render initial empty state
    this.renderTabs();
  }

  /**
   * Add a new tab
   */
  public addTab(tab: Tab): void {
    // Check if tab already exists
    const existingTab = this.tabs.find(t => t.filePath === tab.filePath);
    if (existingTab) {
      this.setActiveTab(existingTab.id);
      return;
    }

    this.tabs.push(tab);
    this.renderTabs();
    this.setActiveTab(tab.id);
  }

  /**
   * Remove a tab
   */
  public removeTab(tabId: string): boolean {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) {
      return false;
    }

    // Ask callback if we can close (handles unsaved changes)
    if (this.onTabCloseCallback && !this.onTabCloseCallback(tabId)) {
      return false;
    }

    this.tabs.splice(tabIndex, 1);

    // If we closed the active tab, activate another
    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
        this.setActiveTab(this.tabs[newActiveIndex].id);
      } else {
        this.activeTabId = null;
      }
    }

    this.renderTabs();
    return true;
  }

  /**
   * Set the active tab
   */
  public setActiveTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) {
      return;
    }

    this.activeTabId = tabId;
    this.renderTabs();

    // Notify callback
    if (this.onTabSwitchCallback) {
      this.onTabSwitchCallback(tab);
    }
  }

  /**
   * Update tab dirty state
   */
  public updateTabDirty(tabId: string, isDirty: boolean): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.isDirty = isDirty;
      this.renderTabs();
    }
  }

  /**
   * Update tab content
   */
  public updateTabContent(tabId: string, content: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.content = content;
    }
  }

  /**
   * Get the active tab
   */
  public getActiveTab(): Tab | null {
    if (!this.activeTabId) {
      return null;
    }
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  }

  /**
   * Get all tabs
   */
  public getTabs(): Tab[] {
    return [...this.tabs];
  }

  /**
   * Register callback for tab switching
   */
  public onTabSwitch(callback: (tab: Tab) => void): void {
    this.onTabSwitchCallback = callback;
  }

  /**
   * Register callback for tab closing
   * Callback should return true to allow close, false to prevent
   */
  public onTabClose(callback: (tabId: string) => boolean): void {
    this.onTabCloseCallback = callback;
  }

  /**
   * Render all tabs
   */
  private renderTabs(): void {
    this.container.innerHTML = '';

    if (this.tabs.length === 0) {
      // Show empty state
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        padding: 0 12px;
        color: var(--text-secondary, #999);
        font-size: 12px;
        line-height: 35px;
      `;
      emptyState.textContent = 'No files open';
      this.container.appendChild(emptyState);
      return;
    }

    this.tabs.forEach(tab => {
      const tabElement = this.createTabElement(tab);
      this.container.appendChild(tabElement);
    });
  }

  /**
   * Create a tab element
   */
  private createTabElement(tab: Tab): HTMLElement {
    const isActive = tab.id === this.activeTabId;

    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.style.cssText = `
      display: flex;
      align-items: center;
      padding: 0 12px;
      height: 35px;
      border-right: 1px solid var(--border-color, #3e3e42);
      cursor: pointer;
      background: ${isActive ? 'var(--background-primary, #1e1e1e)' : 'transparent'};
      color: ${isActive ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #999)'};
      font-size: 13px;
      white-space: nowrap;
      transition: background 0.1s;
    `;

    // Tab label
    const label = document.createElement('span');
    label.textContent = tab.fileName + (tab.isDirty ? ' ●' : '');
    label.style.cssText = 'margin-right: 8px;';
    tabEl.appendChild(label);

    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      font-size: 18px;
      line-height: 1;
      padding: 0 4px;
      opacity: ${isActive ? '0.7' : '0.5'};
      transition: opacity 0.1s;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '1';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = isActive ? '0.7' : '0.5';
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeTab(tab.id);
    });
    tabEl.appendChild(closeBtn);

    // Hover effect
    tabEl.addEventListener('mouseenter', () => {
      if (!isActive) {
        tabEl.style.background = 'var(--background-hover, #2a2d2e)';
      }
    });
    tabEl.addEventListener('mouseleave', () => {
      if (!isActive) {
        tabEl.style.background = 'transparent';
      }
    });

    // Click to activate
    tabEl.addEventListener('click', () => {
      this.setActiveTab(tab.id);
    });

    return tabEl;
  }
}

