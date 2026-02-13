/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Status Bar Component
 * Bottom status bar displaying contextual information
 */

export interface StatusBarOptions {
  backgroundColor?: string;
  foregroundColor?: string;
  height?: number;
}

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  priority?: number; // Higher priority items appear first (left side)
}

export class StatusBar {
  private container: HTMLElement;
  private leftSection: HTMLElement;
  private centerSection: HTMLElement;
  private rightSection: HTMLElement;
  private items: Map<string, StatusBarItem> = new Map();

  constructor(options: StatusBarOptions = {}) {
    this.container = this.createStatusBar(options);
    this.leftSection = this.container.querySelector('.status-bar-left') as HTMLElement;
    this.centerSection = this.container.querySelector('.status-bar-center') as HTMLElement;
    this.rightSection = this.container.querySelector('.status-bar-right') as HTMLElement;

    // Set initial status
    this.setStatus('Ready');
  }

  private createStatusBar(options: StatusBarOptions): HTMLElement {
    const statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    statusBar.style.cssText = `
      display: flex;
      height: ${options.height || 24}px;
      background-color: ${options.backgroundColor || '#1e3a5f'};
      color: ${options.foregroundColor || '#ffffff'};
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-size: 12px;
      user-select: none;
      border-top: 1px solid #005a9e;
    `;

    // Left section - main status
    const leftSection = document.createElement('div');
    leftSection.className = 'status-bar-left';
    leftSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    `;

    // Center section - contextual info
    const centerSection = document.createElement('div');
    centerSection.className = 'status-bar-center';
    centerSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      justify-content: center;
    `;

    // Right section - additional info
    const rightSection = document.createElement('div');
    rightSection.className = 'status-bar-right';
    rightSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      justify-content: flex-end;
    `;

    statusBar.appendChild(leftSection);
    statusBar.appendChild(centerSection);
    statusBar.appendChild(rightSection);

    return statusBar;
  }

  private createStatusItem(item: StatusBarItem): HTMLElement {
    const element = document.createElement('div');
    element.className = 'status-bar-item';
    element.id = `status-item-${item.id}`;
    element.textContent = item.text;
    element.style.cssText = `
      padding: 2px 6px;
      cursor: default;
      white-space: nowrap;
    `;

    if (item.tooltip) {
      element.title = item.tooltip;
    }

    // Add hover effect
    element.addEventListener('mouseenter', () => {
      element.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });

    element.addEventListener('mouseleave', () => {
      element.style.backgroundColor = 'transparent';
    });

    return element;
  }

  /**
   * Set the main status text (displayed on the left)
   */
  public setStatus(text: string, tooltip?: string): void {
    this.addItem({ id: 'main-status', text, tooltip, priority: 100 }, 'left');
  }

  /**
   * Add or update a status bar item
   */
  public addItem(item: StatusBarItem, section: 'left' | 'center' | 'right' = 'right'): void {
    // Remove existing item if present
    const existingElement = this.container.querySelector(`#status-item-${item.id}`);
    if (existingElement) {
      existingElement.remove();
    }

    this.items.set(item.id, item);

    const element = this.createStatusItem(item);

    // Add to appropriate section
    const targetSection =
      section === 'left' ? this.leftSection : section === 'center' ? this.centerSection : this.rightSection;

    // Insert based on priority (higher priority first)
    const existingItems = Array.from(targetSection.children) as HTMLElement[];
    let inserted = false;

    for (let i = 0; i < existingItems.length; i++) {
      const existingId = existingItems[i].id.replace('status-item-', '');
      const existingItem = this.items.get(existingId);

      if (existingItem && (item.priority || 0) > (existingItem.priority || 0)) {
        targetSection.insertBefore(element, existingItems[i]);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      targetSection.appendChild(element);
    }
  }

  /**
   * Remove a status bar item
   */
  public removeItem(id: string): void {
    const element = this.container.querySelector(`#status-item-${id}`);
    if (element) {
      element.remove();
    }
    this.items.delete(id);
  }

  /**
   * Update an existing item's text
   */
  public updateItem(id: string, text: string, tooltip?: string): void {
    const item = this.items.get(id);
    if (item) {
      item.text = text;
      if (tooltip !== undefined) {
        item.tooltip = tooltip;
      }

      const element = this.container.querySelector(`#status-item-${id}`) as HTMLElement;
      if (element) {
        element.textContent = text;
        if (tooltip) {
          element.title = tooltip;
        }
      }
    }
  }

  /**
   * Clear all items from a section
   */
  public clearSection(section: 'left' | 'center' | 'right'): void {
    const targetSection =
      section === 'left' ? this.leftSection : section === 'center' ? this.centerSection : this.rightSection;

    // Get all children before clearing
    const children = Array.from(targetSection.children);

    // Remove items from map
    children.forEach((child) => {
      const id = child.id.replace('status-item-', '');
      this.items.delete(id);
      child.remove();
    });
  }

  /**
   * Clear all items
   */
  public clearAll(): void {
    // Clear all children
    Array.from(this.leftSection.children).forEach((child) => child.remove());
    Array.from(this.centerSection.children).forEach((child) => child.remove());
    Array.from(this.rightSection.children).forEach((child) => child.remove());
    
    // Clear items map
    this.items.clear();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.clearAll();
    this.container.remove();
  }
}

