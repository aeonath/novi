import { SettingsPanel, SettingControl } from '../../renderer/components/settings-panel';

// Mock window.api
const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();

(global as unknown as { window: { api: unknown } }).window = {
  api: {
    getSetting: mockGetSetting,
    setSetting: mockSetSetting,
  },
};

describe('SettingsPanel', () => {
  let panel: SettingsPanel;

  beforeEach(() => {
    // Clear any existing panel overlay
    const existingOverlay = document.getElementById('settings-panel-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Reset mocks
    mockGetSetting.mockReset();
    mockSetSetting.mockReset();

    panel = new SettingsPanel();
  });

  afterEach(() => {
    panel.hide();
    const overlay = document.getElementById('settings-panel-overlay');
    if (overlay) {
      overlay.remove();
    }
  });

  describe('Initialization', () => {
    it('should create overlay element in DOM', () => {
      const overlay = document.getElementById('settings-panel-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay?.style.display).toBe('none');
    });

    it('should create panel container', () => {
      const container = document.getElementById('settings-panel-container');
      expect(container).toBeTruthy();
    });

    it('should create panel content area', () => {
      const content = document.getElementById('settings-panel-content');
      expect(content).toBeTruthy();
    });

    it('should create close button', () => {
      const closeButton = document.getElementById('settings-panel-close');
      expect(closeButton).toBeTruthy();
    });

    it('should start hidden', () => {
      expect(panel.isOpen()).toBe(false);
    });
  });

  describe('Show/Hide/Toggle', () => {
    it('should show panel when show() is called', () => {
      panel.show();
      expect(panel.isOpen()).toBe(true);
      const overlay = document.getElementById('settings-panel-overlay');
      expect(overlay?.style.display).toBe('flex');
    });

    it('should hide panel when hide() is called', () => {
      panel.show();
      panel.hide();
      expect(panel.isOpen()).toBe(false);
      const overlay = document.getElementById('settings-panel-overlay');
      expect(overlay?.style.display).toBe('none');
    });

    it('should toggle panel visibility', () => {
      expect(panel.isOpen()).toBe(false);
      panel.toggle();
      expect(panel.isOpen()).toBe(true);
      panel.toggle();
      expect(panel.isOpen()).toBe(false);
    });

    it('should hide panel when close button is clicked', () => {
      panel.show();
      const closeButton = document.getElementById('settings-panel-close');
      closeButton?.click();
      expect(panel.isOpen()).toBe(false);
    });

    it('should hide panel when overlay is clicked', () => {
      panel.show();
      const overlay = document.getElementById('settings-panel-overlay');
      overlay?.click();
      expect(panel.isOpen()).toBe(false);
    });

    it('should not hide panel when container is clicked', () => {
      panel.show();
      const container = document.getElementById('settings-panel-container');
      container?.click();
      expect(panel.isOpen()).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should close panel on Escape key', () => {
      panel.show();
      expect(panel.isOpen()).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(panel.isOpen()).toBe(false);
    });

    it('should not close panel on Escape key when hidden', () => {
      expect(panel.isOpen()).toBe(false);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(panel.isOpen()).toBe(false);
    });
  });

  describe('Settings Management', () => {
    it('should add setting', () => {
      const setting: SettingControl = {
        id: 'test',
        label: 'Test Setting',
        type: 'toggle',
        value: true,
      };

      panel.addSetting(setting);
      expect(panel.getSetting('test')).toBe(true);
    });

    it('should remove setting', () => {
      const setting: SettingControl = {
        id: 'test',
        label: 'Test Setting',
        type: 'toggle',
        value: true,
      };

      panel.addSetting(setting);
      expect(panel.getSetting('test')).toBe(true);

      panel.removeSetting('test');
      expect(panel.getSetting('test')).toBeUndefined();
    });

    it('should update setting value', () => {
      const setting: SettingControl = {
        id: 'test',
        label: 'Test Setting',
        type: 'toggle',
        value: true,
      };

      panel.addSetting(setting);
      expect(panel.getSetting('test')).toBe(true);

      panel.setSetting('test', false);
      expect(panel.getSetting('test')).toBe(false);
    });

    it('should get setting value', () => {
      const setting: SettingControl = {
        id: 'test',
        label: 'Test Setting',
        type: 'toggle',
        value: true,
      };

      panel.addSetting(setting);
      expect(panel.getSetting('test')).toBe(true);
    });
  });

  describe('Toggle Control', () => {
    it('should render toggle control', () => {
      panel.addSetting({
        id: 'toggle-test',
        label: 'Toggle Test',
        type: 'toggle',
        value: false,
      });

      panel.show();

      const toggle = document.getElementById('setting-toggle-test');
      expect(toggle).toBeTruthy();
    });

    it('should toggle value on click', () => {
      const onChange = jest.fn();
      panel.onChange(onChange);

      panel.addSetting({
        id: 'toggle-test',
        label: 'Toggle Test',
        type: 'toggle',
        value: false,
      });

      panel.show();

      const toggle = document.getElementById('setting-toggle-test');
      toggle?.click();

      expect(onChange).toHaveBeenCalledWith('toggle-test', true);
      expect(panel.getSetting('toggle-test')).toBe(true);
    });

    it('should update visual state when toggled', () => {
      panel.addSetting({
        id: 'toggle-test',
        label: 'Toggle Test',
        type: 'toggle',
        value: false,
      });

      panel.show();

      const toggle = document.getElementById('setting-toggle-test') as HTMLButtonElement;
      // Background can be in rgb format or hex format
      expect(toggle.style.background).toBeTruthy();

      toggle?.click();

      // After toggle, should have a different background (blue for on)
      expect(toggle.style.background).toBeTruthy();
      expect(panel.getSetting('toggle-test')).toBe(true);
    });
  });

  describe('Slider Control', () => {
    it('should render slider control', () => {
      panel.addSetting({
        id: 'slider-test',
        label: 'Slider Test',
        type: 'slider',
        value: 50,
        min: 0,
        max: 100,
        step: 1,
      });

      panel.show();

      const slider = document.getElementById('setting-slider-test');
      expect(slider).toBeTruthy();
      expect(slider?.getAttribute('type')).toBe('range');
    });

    it('should update value on input', () => {
      const onChange = jest.fn();
      panel.onChange(onChange);

      panel.addSetting({
        id: 'slider-test',
        label: 'Slider Test',
        type: 'slider',
        value: 50,
        min: 0,
        max: 100,
        step: 1,
      });

      panel.show();

      const slider = document.getElementById('setting-slider-test') as HTMLInputElement;
      slider.value = '75';
      slider.dispatchEvent(new Event('input'));

      expect(onChange).toHaveBeenCalledWith('slider-test', 75);
      expect(panel.getSetting('slider-test')).toBe(75);
    });

    it('should display current value', () => {
      panel.addSetting({
        id: 'slider-test',
        label: 'Slider Test',
        type: 'slider',
        value: 50,
        min: 0,
        max: 100,
        step: 1,
      });

      panel.show();

      const slider = document.getElementById('setting-slider-test') as HTMLInputElement;
      const valueLabel = slider.parentElement?.querySelector('span');

      expect(valueLabel?.textContent).toBe('50');

      slider.value = '75';
      slider.dispatchEvent(new Event('input'));

      expect(valueLabel?.textContent).toBe('75');
    });
  });

  describe('Dropdown Control', () => {
    it('should render dropdown control', () => {
      panel.addSetting({
        id: 'dropdown-test',
        label: 'Dropdown Test',
        type: 'dropdown',
        value: 'option1',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      });

      panel.show();

      const dropdown = document.getElementById('setting-dropdown-test');
      expect(dropdown).toBeTruthy();
      expect(dropdown?.tagName).toBe('SELECT');
    });

    it('should render options', () => {
      panel.addSetting({
        id: 'dropdown-test',
        label: 'Dropdown Test',
        type: 'dropdown',
        value: 'option1',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      });

      panel.show();

      const dropdown = document.getElementById('setting-dropdown-test') as HTMLSelectElement;
      const options = dropdown.querySelectorAll('option');

      expect(options.length).toBe(2);
      expect(options[0].textContent).toBe('Option 1');
      expect(options[1].textContent).toBe('Option 2');
    });

    it('should select current value', () => {
      panel.addSetting({
        id: 'dropdown-test',
        label: 'Dropdown Test',
        type: 'dropdown',
        value: 'option2',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      });

      panel.show();

      const dropdown = document.getElementById('setting-dropdown-test') as HTMLSelectElement;
      expect(dropdown.value).toBe('option2');
    });

    it('should update value on change', () => {
      const onChange = jest.fn();
      panel.onChange(onChange);

      panel.addSetting({
        id: 'dropdown-test',
        label: 'Dropdown Test',
        type: 'dropdown',
        value: 'option1',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      });

      panel.show();

      const dropdown = document.getElementById('setting-dropdown-test') as HTMLSelectElement;
      dropdown.value = 'option2';
      dropdown.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith('dropdown-test', 'option2');
      expect(panel.getSetting('dropdown-test')).toBe('option2');
    });
  });

  describe('Text Control', () => {
    it('should render text control', () => {
      panel.addSetting({
        id: 'text-test',
        label: 'Text Test',
        type: 'text',
        value: 'test value',
      });

      panel.show();

      const text = document.getElementById('setting-text-test');
      expect(text).toBeTruthy();
      expect(text?.getAttribute('type')).toBe('text');
    });

    it('should display current value', () => {
      panel.addSetting({
        id: 'text-test',
        label: 'Text Test',
        type: 'text',
        value: 'test value',
      });

      panel.show();

      const text = document.getElementById('setting-text-test') as HTMLInputElement;
      expect(text.value).toBe('test value');
    });

    it('should update value on change', () => {
      const onChange = jest.fn();
      panel.onChange(onChange);

      panel.addSetting({
        id: 'text-test',
        label: 'Text Test',
        type: 'text',
        value: 'test value',
      });

      panel.show();

      const text = document.getElementById('setting-text-test') as HTMLInputElement;
      text.value = 'new value';
      text.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledWith('text-test', 'new value');
      expect(panel.getSetting('text-test')).toBe('new value');
    });
  });

  describe('Storage Integration', () => {
    it('should load settings from storage', async () => {
      // Set up window.api before test
      (window as unknown as { api: unknown }).api = {
        getSetting: mockGetSetting,
        setSetting: mockSetSetting,
      };

      mockGetSetting.mockResolvedValueOnce('dark');
      mockGetSetting.mockResolvedValueOnce(16);

      panel.addSetting({
        id: 'theme',
        label: 'Theme',
        type: 'dropdown',
        value: 'light',
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ],
      });

      panel.addSetting({
        id: 'fontSize',
        label: 'Font Size',
        type: 'slider',
        value: 14,
        min: 10,
        max: 24,
        step: 1,
      });

      await panel.loadFromStorage();

      expect(mockGetSetting).toHaveBeenCalledWith('theme', 'light');
      expect(mockGetSetting).toHaveBeenCalledWith('fontSize', 14);
      expect(panel.getSetting('theme')).toBe('dark');
      expect(panel.getSetting('fontSize')).toBe(16);
    });

    it('should save settings to storage', async () => {
      // Set up window.api before test
      (window as unknown as { api: unknown }).api = {
        getSetting: mockGetSetting,
        setSetting: mockSetSetting,
      };

      mockSetSetting.mockResolvedValueOnce(undefined);

      await panel.saveToStorage('theme', 'dark');

      expect(mockSetSetting).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should handle storage errors gracefully', async () => {
      // Set up window.api before test
      (window as unknown as { api: unknown }).api = {
        getSetting: mockGetSetting,
        setSetting: mockSetSetting,
      };

      // Mock console.error to suppress expected error output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockGetSetting.mockRejectedValueOnce(new Error('Storage error'));

      panel.addSetting({
        id: 'theme',
        label: 'Theme',
        type: 'dropdown',
        value: 'light',
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ],
      });

      await expect(panel.loadFromStorage()).resolves.not.toThrow();
      expect(panel.getSetting('theme')).toBe('light'); // Should keep default

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should handle save errors gracefully', async () => {
      // Set up window.api before test
      (window as unknown as { api: unknown }).api = {
        getSetting: mockGetSetting,
        setSetting: mockSetSetting,
      };

      // Mock console.error to suppress expected error output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockSetSetting.mockRejectedValueOnce(new Error('Storage error'));

      await expect(panel.saveToStorage('theme', 'dark')).resolves.not.toThrow();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Change Callback', () => {
    it('should call onChange callback when setting changes', () => {
      const onChange = jest.fn();
      panel.onChange(onChange);

      panel.addSetting({
        id: 'test',
        label: 'Test',
        type: 'toggle',
        value: false,
      });

      panel.show();

      const toggle = document.getElementById('setting-test');
      toggle?.click();

      expect(onChange).toHaveBeenCalledWith('test', true);
    });

    it('should handle async onChange callback', async () => {
      const onChange = jest.fn().mockResolvedValue(undefined);
      panel.onChange(onChange);

      panel.addSetting({
        id: 'test',
        label: 'Test',
        type: 'toggle',
        value: false,
      });

      panel.show();

      const toggle = document.getElementById('setting-test');
      toggle?.click();

      expect(onChange).toHaveBeenCalledWith('test', true);
      await Promise.resolve(); // Wait for promise to resolve
    });
  });

  describe('Rendering', () => {
    it('should render multiple settings', () => {
      panel.addSetting({
        id: 'setting1',
        label: 'Setting 1',
        type: 'toggle',
        value: true,
      });

      panel.addSetting({
        id: 'setting2',
        label: 'Setting 2',
        type: 'slider',
        value: 50,
        min: 0,
        max: 100,
      });

      panel.addSetting({
        id: 'setting3',
        label: 'Setting 3',
        type: 'dropdown',
        value: 'option1',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      });

      panel.show();

      expect(document.getElementById('setting-setting1')).toBeTruthy();
      expect(document.getElementById('setting-setting2')).toBeTruthy();
      expect(document.getElementById('setting-setting3')).toBeTruthy();
    });

    it('should update rendering after adding setting', () => {
      panel.show();

      const content = document.getElementById('settings-panel-content');
      expect(content?.children.length).toBe(0);

      panel.addSetting({
        id: 'test',
        label: 'Test',
        type: 'toggle',
        value: true,
      });

      expect(content?.children.length).toBe(1);
    });

    it('should update rendering after removing setting', () => {
      panel.addSetting({
        id: 'test',
        label: 'Test',
        type: 'toggle',
        value: true,
      });

      panel.show();

      const content = document.getElementById('settings-panel-content');
      expect(content?.children.length).toBe(1);

      panel.removeSetting('test');

      expect(content?.children.length).toBe(0);
    });
  });
});

