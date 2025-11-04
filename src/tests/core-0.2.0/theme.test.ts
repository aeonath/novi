/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Unit tests for Theme System
 */

import {
  darkTheme,
  lightTheme,
  themes,
  ThemeManager,
  initializeThemeManager,
  getThemeManager,
} from '../../renderer/theme';

// Mock window.api
const mockWindowApi = {
  getSetting: jest.fn(),
  setSetting: jest.fn(),
};

describe('Theme System', () => {
  let originalWindow: typeof global.window;

  beforeAll(() => {
    originalWindow = global.window;
  });

  beforeEach(() => {
    // Set up window.api mock
    (global.window as unknown as typeof global.window & { api: typeof mockWindowApi }) = {
      ...originalWindow,
      api: mockWindowApi,
    } as typeof global.window & { api: typeof mockWindowApi };

    // Clear mocks
    jest.clearAllMocks();

    // Clear any existing theme styles
    const existingStyle = document.getElementById('nova-theme');
    if (existingStyle) {
      existingStyle.remove();
    }
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  afterAll(() => {
    global.window = originalWindow;
  });

  describe('Theme Definitions', () => {
    test('should have dark theme defined', () => {
      expect(darkTheme).toBeDefined();
      expect(darkTheme.id).toBe('dark');
      expect(darkTheme.name).toBe('Dark');
    });

    test('should have light theme defined', () => {
      expect(lightTheme).toBeDefined();
      expect(lightTheme.id).toBe('light');
      expect(lightTheme.name).toBe('Light');
    });

    test('should have colors defined in dark theme', () => {
      expect(darkTheme.colors.background.primary).toBeDefined();
      expect(darkTheme.colors.foreground.primary).toBeDefined();
      expect(darkTheme.colors.accent.primary).toBeDefined();
      expect(darkTheme.colors.border.default).toBeDefined();
    });

    test('should have colors defined in light theme', () => {
      expect(lightTheme.colors.background.primary).toBeDefined();
      expect(lightTheme.colors.foreground.primary).toBeDefined();
      expect(lightTheme.colors.accent.primary).toBeDefined();
      expect(lightTheme.colors.border.default).toBeDefined();
    });

    test('should have typography defined', () => {
      expect(darkTheme.typography.fontFamily.base).toBeDefined();
      expect(darkTheme.typography.fontSize.base).toBeDefined();
      expect(darkTheme.typography.fontWeight.normal).toBeDefined();
      expect(darkTheme.typography.lineHeight.normal).toBeDefined();
    });

    test('should have spacing defined', () => {
      expect(darkTheme.spacing.xs).toBeDefined();
      expect(darkTheme.spacing.sm).toBeDefined();
      expect(darkTheme.spacing.md).toBeDefined();
      expect(darkTheme.spacing.lg).toBeDefined();
    });

    test('should have shadows defined', () => {
      expect(darkTheme.shadows.sm).toBeDefined();
      expect(darkTheme.shadows.md).toBeDefined();
      expect(darkTheme.shadows.lg).toBeDefined();
    });

    test('should have border radius defined', () => {
      expect(darkTheme.borderRadius.sm).toBeDefined();
      expect(darkTheme.borderRadius.md).toBeDefined();
      expect(darkTheme.borderRadius.lg).toBeDefined();
      expect(darkTheme.borderRadius.full).toBeDefined();
    });

    test('should have themes registry', () => {
      expect(themes).toBeDefined();
      expect(themes.dark).toBe(darkTheme);
      expect(themes.light).toBe(lightTheme);
    });
  });

  describe('ThemeManager', () => {
    test('should create ThemeManager with default dark theme', () => {
      const manager = new ThemeManager();
      expect(manager.getCurrentTheme()).toBe(darkTheme);
    });

    test('should create ThemeManager with custom theme', () => {
      const manager = new ThemeManager(lightTheme);
      expect(manager.getCurrentTheme()).toBe(lightTheme);
    });

    test('should create style element on initialization', () => {
      new ThemeManager();
      const styleElement = document.getElementById('nova-theme');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.tagName).toBe('STYLE');
    });

    test('should apply theme and update CSS variables', () => {
      const manager = new ThemeManager();
      manager.applyTheme(lightTheme);

      const styleElement = document.getElementById('nova-theme');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('--bg-primary');
      expect(styleElement?.textContent).toContain(lightTheme.colors.background.primary);
    });

    test('should apply theme by ID', () => {
      const manager = new ThemeManager();
      manager.applyThemeById('light');

      expect(manager.getCurrentTheme()).toBe(lightTheme);
    });

    test('should fall back to dark theme for invalid ID', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const manager = new ThemeManager();
      manager.applyThemeById('invalid-theme');

      expect(manager.getCurrentTheme()).toBe(darkTheme);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Theme "invalid-theme" not found, falling back to dark theme'
      );

      consoleSpy.mockRestore();
    });

    test('should save theme preference when applying theme', () => {
      const manager = new ThemeManager();
      manager.applyTheme(lightTheme);

      // Window API should be called to save theme
      if (window.api) {
        expect(mockWindowApi.setSetting).toHaveBeenCalledWith('theme', 'light');
      }
    });

    test('should generate CSS variables for all theme properties', () => {
      const manager = new ThemeManager(darkTheme);
      expect(manager).toBeDefined();
      
      // Force update CSS variables
      manager.applyTheme(darkTheme);
      
      const styleElement = document.getElementById('nova-theme');
      expect(styleElement).toBeTruthy();
      
      const css = styleElement?.textContent || '';
      expect(css.length).toBeGreaterThan(0);

      // Check background colors
      expect(css).toContain('--bg-primary');
      expect(css).toContain('--bg-secondary');
      expect(css).toContain('--bg-tertiary');

      // Check foreground colors
      expect(css).toContain('--fg-primary');
      expect(css).toContain('--fg-secondary');

      // Check accent colors
      expect(css).toContain('--accent-primary');
      expect(css).toContain('--accent-success');
      expect(css).toContain('--accent-error');

      // Check typography
      expect(css).toContain('--font-base');
      expect(css).toContain('--font-size-base');
      expect(css).toContain('--font-weight-normal');

      // Check spacing
      expect(css).toContain('--space-md');
      expect(css).toContain('--space-lg');

      // Check shadows
      expect(css).toContain('--shadow-md');

      // Check border radius
      expect(css).toContain('--radius-md');
    });

    test('should apply body styles', () => {
      const manager = new ThemeManager(darkTheme);
      expect(manager).toBeDefined();
      
      // Force update CSS variables
      manager.applyTheme(darkTheme);
      
      const styleElement = document.getElementById('nova-theme');
      expect(styleElement).toBeTruthy();
      
      const css = styleElement?.textContent || '';
      expect(css.length).toBeGreaterThan(0);

      expect(css).toContain('body {');
      expect(css).toContain('background-color: var(--bg-primary)');
      expect(css).toContain('color: var(--fg-primary)');
      expect(css).toContain('font-family: var(--font-base)');
    });

    test('should load theme from storage', async () => {
      mockWindowApi.getSetting.mockResolvedValue('light');

      const manager = new ThemeManager();
      await manager.loadThemeFromStorage();

      // If window.api exists, theme should be changed
      if (window.api) {
        expect(mockWindowApi.getSetting).toHaveBeenCalledWith('theme', 'dark');
        expect(manager.getCurrentTheme()).toBe(lightTheme);
      } else {
        // If no API, should remain with default theme
        expect(manager.getCurrentTheme()).toBe(darkTheme);
      }
    });

    test('should handle missing theme in storage', async () => {
      mockWindowApi.getSetting.mockResolvedValue(null);

      const manager = new ThemeManager();
      await manager.loadThemeFromStorage();

      // Should remain with default theme
      expect(manager.getCurrentTheme()).toBe(darkTheme);
    });

    test('should handle storage error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWindowApi.getSetting.mockRejectedValue(new Error('Storage error'));

      const manager = new ThemeManager();
      await manager.loadThemeFromStorage();

      // Check if window.api exists before expecting error
      if (window.api) {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load theme from storage:',
          expect.any(Error)
        );
      }

      consoleErrorSpy.mockRestore();
    });

    test('should not attempt to load from storage if API unavailable', async () => {
      (global.window as { api: unknown }).api = undefined;

      const manager = new ThemeManager();
      expect(manager).toBeDefined();
      await manager.loadThemeFromStorage();

      expect(mockWindowApi.getSetting).not.toHaveBeenCalled();
    });
  });

  describe('Global Theme Manager', () => {
    test('should initialize global theme manager', () => {
      const manager = initializeThemeManager();
      expect(manager).toBeInstanceOf(ThemeManager);
      expect(manager).toBeDefined();
    });

    test('should return same instance on multiple initializations', () => {
      const manager1 = initializeThemeManager();
      const manager2 = initializeThemeManager();
      expect(manager1).toBe(manager2);
    });

    test('should get theme manager instance', () => {
      const manager = initializeThemeManager();
      const retrieved = getThemeManager();
      expect(retrieved).toBe(manager);
    });

    test('should return null before initialization', () => {
      // Reset the module by re-importing
      jest.resetModules();
      const { getThemeManager: getManager } = require('../../renderer/theme');
      expect(getManager()).toBeNull();
    });
  });

  describe('Theme Color Contrast', () => {
    test('dark theme should have light foreground on dark background', () => {
      // Dark theme: background should be darker than foreground
      const bgBrightness = parseInt(darkTheme.colors.background.primary.slice(1), 16);
      const fgBrightness = parseInt(darkTheme.colors.foreground.primary.slice(1), 16);
      
      expect(fgBrightness).toBeGreaterThan(bgBrightness);
    });

    test('light theme should have dark foreground on light background', () => {
      // Light theme: foreground should be darker than background
      const bgBrightness = parseInt(lightTheme.colors.background.primary.slice(1), 16);
      const fgBrightness = parseInt(lightTheme.colors.foreground.primary.slice(1), 16);
      
      expect(bgBrightness).toBeGreaterThan(fgBrightness);
    });
  });

  describe('Theme Structure Consistency', () => {
    test('both themes should have same structure', () => {
      const darkKeys = Object.keys(darkTheme);
      const lightKeys = Object.keys(lightTheme);

      expect(darkKeys.sort()).toEqual(lightKeys.sort());
    });

    test('both themes should have same color categories', () => {
      const darkColorKeys = Object.keys(darkTheme.colors);
      const lightColorKeys = Object.keys(lightTheme.colors);

      expect(darkColorKeys.sort()).toEqual(lightColorKeys.sort());
    });

    test('both themes should have same typography properties', () => {
      const darkTypoKeys = Object.keys(darkTheme.typography);
      const lightTypoKeys = Object.keys(lightTheme.typography);

      expect(darkTypoKeys.sort()).toEqual(lightTypoKeys.sort());
    });

    test('both themes should have same spacing values', () => {
      const darkSpacingKeys = Object.keys(darkTheme.spacing);
      const lightSpacingKeys = Object.keys(lightTheme.spacing);

      expect(darkSpacingKeys.sort()).toEqual(lightSpacingKeys.sort());
    });
  });
});

