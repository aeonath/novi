// Action HUD Component - Contextual action interface
// Replaces traditional command palette with simple, focused overlay

export interface Action {
  id: string;
  label: string;
  handler: () => void | Promise<void>;
}

export class ActionHUD {
  private overlay: HTMLDivElement | null = null;
  private actions: Action[] = [];
  private selectedIndex = 0;
  private isVisible = false;
  private onActionSelected?: (action: Action) => void;

  constructor(actions: Action[] = []) {
    this.actions = actions;
    console.log('[ActionHUD] Initializing with', actions.length, 'actions');
    this.createOverlay();
    this.setupKeyboardListeners();
    console.log('[ActionHUD] Initialized successfully');
  }

  private createOverlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'action-hud-overlay';
    overlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      justify-content: center;
      align-items: flex-start;
      padding-top: 20vh;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: #1e1e1e;
      border: 1px solid #333;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      min-width: 400px;
      max-width: 600px;
      max-height: 60vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type to filter actions...';
    input.id = 'action-hud-input';
    input.style.cssText = `
      padding: 12px 16px;
      background: #252526;
      border: none;
      border-bottom: 1px solid #333;
      color: #fff;
      font-size: 14px;
      outline: none;
    `;

    const list = document.createElement('ul');
    list.id = 'action-hud-list';
    list.style.cssText = `
      margin: 0;
      padding: 0;
      list-style: none;
      overflow-y: auto;
      max-height: 50vh;
    `;

    container.appendChild(input);
    container.appendChild(list);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    this.overlay = overlay;

    // Setup input filtering
    input.addEventListener('input', () => {
      this.filterActions(input.value);
    });

    // Close on overlay click (outside container)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    // Prevent container clicks from closing
    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  private setupKeyboardListeners(): void {
    console.log('[ActionHUD] Setting up keyboard listeners');
    document.addEventListener('keydown', (e) => {
      // Debug: log all Ctrl/Cmd keypresses
      if (e.ctrlKey || e.metaKey) {
        console.log('[ActionHUD] Ctrl/Cmd key pressed:', e.key, 'ctrlKey:', e.ctrlKey, 'metaKey:', e.metaKey);
      }
      
      // Ctrl/Cmd + Space to toggle (or Ctrl/Cmd + K as alternative)
      // Use lowercase comparison and check both 'k' and 'K'
      if ((e.ctrlKey || e.metaKey) && (e.key === ' ' || e.key.toLowerCase() === 'k')) {
        console.log('[ActionHUD] Toggle triggered!');
        e.preventDefault();
        e.stopPropagation(); // Prevent Monaco from consuming the event
        this.toggle();
        return;
      }

      // Only handle keys when HUD is visible
      if (!this.isVisible) {
        return;
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
        return;
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevious();
        return;
      }

      // Enter to execute selected action
      if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
        return;
      }
    });
  }

  public setActions(actions: Action[]): void {
    this.actions = actions;
    this.selectedIndex = 0;
    this.render();
  }

  public addAction(action: Action): void {
    this.actions.push(action);
    this.render();
  }

  public removeAction(actionId: string): void {
    this.actions = this.actions.filter((a) => a.id !== actionId);
    if (this.selectedIndex >= this.actions.length) {
      this.selectedIndex = Math.max(0, this.actions.length - 1);
    }
    this.render();
  }

  public show(): void {
    if (!this.overlay) {
      return;
    }
    this.isVisible = true;
    this.overlay.style.display = 'flex';
    this.selectedIndex = 0;
    this.render();

    // Focus input
    const input = document.getElementById('action-hud-input') as HTMLInputElement;
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  public hide(): void {
    if (!this.overlay) {
      return;
    }
    this.isVisible = false;
    this.overlay.style.display = 'none';
    const input = document.getElementById('action-hud-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  private filterActions(query: string): void {
    const filtered = query
      ? this.actions.filter((action) =>
          action.label.toLowerCase().includes(query.toLowerCase())
        )
      : this.actions;

    const list = document.getElementById('action-hud-list');
    if (!list) {
      return;
    }

    list.innerHTML = '';
    this.selectedIndex = 0;

    filtered.forEach((action, index) => {
      const item = document.createElement('li');
      item.dataset.actionId = action.id;
      item.dataset.index = index.toString();
      item.style.cssText = `
        padding: 12px 16px;
        cursor: pointer;
        color: #ccc;
        border-bottom: 1px solid #2d2d30;
        transition: background 0.1s;
      `;

      if (index === this.selectedIndex) {
        item.style.background = '#2a2d2e';
        item.style.color = '#fff';
      }

      item.textContent = action.label;

      item.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateSelection();
      });

      item.addEventListener('click', () => {
        this.executeAction(action);
      });

      list.appendChild(item);
    });

    this.updateSelection();
  }

  private selectNext(): void {
    const list = document.getElementById('action-hud-list');
    if (!list) {
      return;
    }
    const items = list.querySelectorAll('li');
    if (items.length === 0) {
      return;
    }
    this.selectedIndex = (this.selectedIndex + 1) % items.length;
    this.updateSelection();
    this.scrollToSelected();
  }

  private selectPrevious(): void {
    const list = document.getElementById('action-hud-list');
    if (!list) {
      return;
    }
    const items = list.querySelectorAll('li');
    if (items.length === 0) {
      return;
    }
    this.selectedIndex = this.selectedIndex - 1;
    if (this.selectedIndex < 0) {
      this.selectedIndex = items.length - 1;
    }
    this.updateSelection();
    this.scrollToSelected();
  }

  private updateSelection(): void {
    const list = document.getElementById('action-hud-list');
    if (!list) {
      return;
    }
    const items = list.querySelectorAll('li');
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.style.background = '#2a2d2e';
        item.style.color = '#fff';
      } else {
        item.style.background = 'transparent';
        item.style.color = '#ccc';
      }
    });
  }

  private scrollToSelected(): void {
    const list = document.getElementById('action-hud-list');
    if (!list) {
      return;
    }
    const items = list.querySelectorAll('li');
    const selected = items[this.selectedIndex];
    if (selected && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private executeSelected(): void {
    const list = document.getElementById('action-hud-list');
    if (!list) {
      return;
    }
    const items = list.querySelectorAll('li');
    const selected = items[this.selectedIndex];
    if (!selected) {
      return;
    }
    const actionId = selected.dataset.actionId;
    if (!actionId) {
      return;
    }
    const action = this.actions.find((a) => a.id === actionId);
    if (action) {
      this.executeAction(action);
    }
  }

  private executeAction(action: Action): void {
    void Promise.resolve(action.handler());
    this.hide();
    if (this.onActionSelected) {
      this.onActionSelected(action);
    }
  }

  private render(): void {
    if (!this.isVisible) {
      return;
    }
    const input = document.getElementById('action-hud-input') as HTMLInputElement;
    const query = input?.value ?? '';
    this.filterActions(query);
  }

  public onAction(callback: (action: Action) => void): void {
    this.onActionSelected = callback;
  }
}

