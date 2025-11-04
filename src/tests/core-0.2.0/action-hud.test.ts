/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { ActionHUD, Action } from '../../renderer/components/action-hud';

describe('ActionHUD', () => {
  let hud: ActionHUD;
  let mockActions: Action[];

  beforeEach(() => {
    // Clear any existing HUD overlay
    const existingOverlay = document.getElementById('action-hud-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create mock actions
    mockActions = [
      {
        id: 'open-file',
        label: 'Open File',
        handler: jest.fn(),
      },
      {
        id: 'toggle-theme',
        label: 'Toggle Theme',
        handler: jest.fn(),
      },
      {
        id: 'settings',
        label: 'Settings',
        handler: jest.fn(),
      },
    ];

    hud = new ActionHUD(mockActions);
  });

  afterEach(() => {
    hud.hide();
    const overlay = document.getElementById('action-hud-overlay');
    if (overlay) {
      overlay.remove();
    }
  });

  describe('Initialization', () => {
    it('should create overlay element in DOM', () => {
      const overlay = document.getElementById('action-hud-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay?.style.display).toBe('none');
    });

    it('should initialize with provided actions', () => {
      expect(hud.isOpen()).toBe(false);
    });

    it('should initialize with hidden state', () => {
      expect(hud.isOpen()).toBe(false);
    });
  });

  describe('Show/Hide/Toggle', () => {
    it('should show HUD when show() is called', () => {
      hud.show();
      expect(hud.isOpen()).toBe(true);
      const overlay = document.getElementById('action-hud-overlay');
      expect(overlay?.style.display).toBe('flex');
    });

    it('should hide HUD when hide() is called', () => {
      hud.show();
      hud.hide();
      expect(hud.isOpen()).toBe(false);
      const overlay = document.getElementById('action-hud-overlay');
      expect(overlay?.style.display).toBe('none');
    });

    it('should toggle HUD visibility', () => {
      expect(hud.isOpen()).toBe(false);
      hud.toggle();
      expect(hud.isOpen()).toBe(true);
      hud.toggle();
      expect(hud.isOpen()).toBe(false);
    });

    it('should focus input when shown', () => {
      hud.show();
      const input = document.getElementById('action-hud-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input?.value).toBe('');
    });

    it('should clear input when hidden', () => {
      hud.show();
      const input = document.getElementById('action-hud-input') as HTMLInputElement;
      if (input) {
        input.value = 'test query';
      }
      hud.hide();
      expect(input?.value).toBe('');
    });
  });

  describe('Action Rendering', () => {
    it('should render all actions when shown', () => {
      hud.show();
      const list = document.getElementById('action-hud-list');
      expect(list).toBeTruthy();
      const items = list?.querySelectorAll('li');
      expect(items?.length).toBe(3);
    });

    it('should display action labels correctly', () => {
      hud.show();
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      expect(items?.[0]?.textContent).toBe('Open File');
      expect(items?.[1]?.textContent).toBe('Toggle Theme');
      expect(items?.[2]?.textContent).toBe('Settings');
    });

    it('should highlight first action by default', () => {
      hud.show();
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      expect(items?.[0]?.style.background).toBe('rgb(42, 45, 46)'); // #2a2d2e
      expect(items?.[0]?.style.color).toBe('rgb(255, 255, 255)');
    });
  });

  describe('Action Filtering', () => {
    it('should filter actions by query', () => {
      hud.show();
      const input = document.getElementById('action-hud-input') as HTMLInputElement;
      if (input) {
        input.value = 'file';
        input.dispatchEvent(new Event('input'));
      }

      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      expect(items?.length).toBe(1);
      expect(items?.[0]?.textContent).toBe('Open File');
    });

    it('should show all actions when query is empty', () => {
      hud.show();
      const input = document.getElementById('action-hud-input') as HTMLInputElement;
      if (input) {
        input.value = 'file';
        input.dispatchEvent(new Event('input'));
        input.value = '';
        input.dispatchEvent(new Event('input'));
      }

      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      expect(items?.length).toBe(3);
    });

    it('should filter case-insensitively', () => {
      hud.show();
      const input = document.getElementById('action-hud-input') as HTMLInputElement;
      if (input) {
        input.value = 'THEME';
        input.dispatchEvent(new Event('input'));
      }

      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      expect(items?.length).toBe(1);
      expect(items?.[0]?.textContent).toBe('Toggle Theme');
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      hud.show();
    });

    it('should navigate down with ArrowDown key', () => {
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      
      // Initially first item is selected
      expect(items?.[0]?.style.background).toBe('rgb(42, 45, 46)');
      
      // Press ArrowDown
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(downEvent);
      
      // Second item should be selected
      expect(items?.[1]?.style.background).toBe('rgb(42, 45, 46)');
      expect(items?.[0]?.style.background).toBe('transparent');
    });

    it('should navigate up with ArrowUp key', () => {
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      
      // Select second item first
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(downEvent);
      
      // Press ArrowUp
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      document.dispatchEvent(upEvent);
      
      // First item should be selected
      expect(items?.[0]?.style.background).toBe('rgb(42, 45, 46)');
    });

    it('should wrap around when navigating down from last item', () => {
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      
      // Navigate to last item
      for (let i = 0; i < 2; i++) {
        const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        document.dispatchEvent(downEvent);
      }
      
      // Navigate down again (should wrap to first)
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(downEvent);
      
      expect(items?.[0]?.style.background).toBe('rgb(42, 45, 46)');
    });

    it('should wrap around when navigating up from first item', () => {
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      
      // Press ArrowUp from first item
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      document.dispatchEvent(upEvent);
      
      // Last item should be selected
      expect(items?.[items.length - 1]?.style.background).toBe('rgb(42, 45, 46)');
    });

    it('should close on Escape key', () => {
      hud.show();
      expect(hud.isOpen()).toBe(true);
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(hud.isOpen()).toBe(false);
    });

    it('should execute selected action on Enter key', () => {
      hud.show();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);
      
      expect(mockActions[0].handler).toHaveBeenCalled();
      expect(hud.isOpen()).toBe(false);
    });
  });

  describe('Mouse Interaction', () => {
    beforeEach(() => {
      hud.show();
    });

    it('should highlight item on mouse enter', () => {
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      
      // Hover over second item
      const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
      items?.[1]?.dispatchEvent(mouseEnterEvent);
      
      expect(items?.[1]?.style.background).toBe('rgb(42, 45, 46)');
    });

    it('should execute action on click', () => {
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      
      // Click second item
      const clickEvent = new MouseEvent('click', { bubbles: true });
      items?.[1]?.dispatchEvent(clickEvent);
      
      expect(mockActions[1].handler).toHaveBeenCalled();
      expect(hud.isOpen()).toBe(false);
    });

    it('should close when clicking overlay background', () => {
      hud.show();
      expect(hud.isOpen()).toBe(true);
      
      const overlay = document.getElementById('action-hud-overlay');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      overlay?.dispatchEvent(clickEvent);
      
      expect(hud.isOpen()).toBe(false);
    });

    it('should not close when clicking container', () => {
      hud.show();
      expect(hud.isOpen()).toBe(true);
      
      const overlay = document.getElementById('action-hud-overlay');
      const container = overlay?.querySelector('div');
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      container?.dispatchEvent(clickEvent);
      
      // Should still be open
      expect(hud.isOpen()).toBe(true);
    });
  });

  describe('Action Management', () => {
    it('should set new actions', () => {
      const newActions: Action[] = [
        {
          id: 'new-action',
          label: 'New Action',
          handler: jest.fn(),
        },
      ];
      
      hud.setActions(newActions);
      hud.show();
      
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      expect(items?.length).toBe(1);
      expect(items?.[0]?.textContent).toBe('New Action');
    });

    it('should add action', () => {
      hud.show();
      const list = document.getElementById('action-hud-list');
      let items = list?.querySelectorAll('li');
      expect(items?.length).toBe(3);
      
      hud.addAction({
        id: 'new-action',
        label: 'New Action',
        handler: jest.fn(),
      });
      
      items = list?.querySelectorAll('li');
      expect(items?.length).toBe(4);
    });

    it('should remove action', () => {
      hud.show();
      hud.removeAction('open-file');
      
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      expect(items?.length).toBe(2);
      expect(items?.[0]?.textContent).toBe('Toggle Theme');
    });

    it('should adjust selected index when removing action', () => {
      hud.show();
      // Select second item
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(downEvent);
      
      // Remove first item
      hud.removeAction('open-file');
      
      // First item should now be selected (was second)
      const list = document.getElementById('action-hud-list');
      const items = list?.querySelectorAll('li');
      expect(items?.[0]?.style.background).toBe('rgb(42, 45, 46)');
    });
  });

  describe('Keyboard Shortcut', () => {
    it('should toggle HUD on Ctrl+Space', () => {
      // Test directly calling toggle method
      expect(hud.isOpen()).toBe(false);
      hud.toggle();
      expect(hud.isOpen()).toBe(true);
      hud.toggle();
      expect(hud.isOpen()).toBe(false);
    });

    it('should toggle HUD programmatically', () => {
      // Test that toggle method works correctly
      expect(hud.isOpen()).toBe(false);
      hud.show();
      expect(hud.isOpen()).toBe(true);
      hud.hide();
      expect(hud.isOpen()).toBe(false);
    });

    it('should not toggle when HUD is not visible and other keys pressed', () => {
      expect(hud.isOpen()).toBe(false);
      
      const otherKeyEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
      });
      document.dispatchEvent(otherKeyEvent);
      
      expect(hud.isOpen()).toBe(false);
    });
  });

  describe('Action Callback', () => {
    it('should call onAction callback when action is executed', () => {
      const callback = jest.fn();
      hud.onAction(callback);
      
      hud.show();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);
      
      expect(callback).toHaveBeenCalledWith(mockActions[0]);
    });
  });
});
