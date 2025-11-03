import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import {
  loadSettings,
  saveSettings,
  getSetting,
  setSetting,
  getSettingsFilePath,
  type Settings,
} from '../../main/settings';

describe('Settings Manager', () => {
  let originalSettingsPath: string;
  let testSettingsBackup: string | null = null;

  beforeAll(() => {
    // Backup original settings if they exist
    originalSettingsPath = getSettingsFilePath();
    if (existsSync(originalSettingsPath)) {
      testSettingsBackup = readFileSync(originalSettingsPath, 'utf-8');
    }
  });

  beforeEach(() => {
    // Clean up settings file before each test to ensure clean state
    if (existsSync(originalSettingsPath)) {
      unlinkSync(originalSettingsPath);
    }
  });

  afterAll(() => {
    // Restore original settings if they existed
    if (existsSync(originalSettingsPath)) {
      unlinkSync(originalSettingsPath);
    }
    if (testSettingsBackup) {
      writeFileSync(originalSettingsPath, testSettingsBackup, 'utf-8');
    }
  });

  describe('loadSettings', () => {
    it('should return empty object when settings file does not exist', () => {
      const settings = loadSettings();
      expect(settings).toEqual({});
    });

    it('should load settings from existing file', () => {
      const testSettings: Settings = { key1: 'value1', key2: 42 };
      writeFileSync(originalSettingsPath, JSON.stringify(testSettings, null, 2), 'utf-8');

      const settings = loadSettings();
      expect(settings).toEqual(testSettings);
    });

    it('should return empty object when file contains invalid JSON', () => {
      writeFileSync(originalSettingsPath, 'invalid json', 'utf-8');

      const settings = loadSettings();
      expect(settings).toEqual({});
    });
  });

  describe('saveSettings', () => {
    it('should create settings file with correct content', () => {
      const testSettings: Settings = { testKey: 'testValue', numberKey: 123 };

      saveSettings(testSettings);

      expect(existsSync(originalSettingsPath)).toBe(true);
      const content = readFileSync(originalSettingsPath, 'utf-8');
      const saved = JSON.parse(content) as Settings;
      expect(saved).toEqual(testSettings);
    });

    it('should handle write errors gracefully', () => {
      // Settings should not throw even if there's an error
      const testSettings: Settings = { test: 'value' };
      expect(() => saveSettings(testSettings)).not.toThrow();
    });
  });

  describe('getSetting', () => {
    beforeEach(() => {
      const testSettings: Settings = {
        stringKey: 'testValue',
        numberKey: 42,
        boolKey: true,
        objectKey: { nested: 'value' },
      };
      writeFileSync(originalSettingsPath, JSON.stringify(testSettings, null, 2), 'utf-8');
    });

    it('should return value for existing key', () => {
      const value = getSetting<string>('stringKey');
      expect(value).toBe('testValue');
    });

    it('should return undefined for non-existent key', () => {
      const value = getSetting('nonExistentKey');
      expect(value).toBeUndefined();
    });

    it('should return default value for non-existent key when provided', () => {
      const value = getSetting('nonExistentKey', 'default');
      expect(value).toBe('default');
    });

    it('should return typed value correctly', () => {
      const numberValue = getSetting<number>('numberKey');
      expect(numberValue).toBe(42);
      expect(typeof numberValue).toBe('number');
    });

    it('should return object value correctly', () => {
      const objectValue = getSetting<{ nested: string }>('objectKey');
      expect(objectValue).toEqual({ nested: 'value' });
    });
  });

  describe('setSetting', () => {
    it('should set a new setting', () => {
      setSetting('newKey', 'newValue');

      const value = getSetting('newKey');
      expect(value).toBe('newValue');
    });

    it('should update an existing setting', () => {
      setSetting('testKey', 'initialValue');
      setSetting('testKey', 'updatedValue');

      const value = getSetting('testKey');
      expect(value).toBe('updatedValue');
    });

    it('should save settings to file', () => {
      setSetting('persistedKey', 'persistedValue');

      // Reload settings from file to verify persistence
      const content = readFileSync(originalSettingsPath, 'utf-8');
      const settings = JSON.parse(content) as Settings;
      expect(settings.persistedKey).toBe('persistedValue');
    });

    it('should handle various value types', () => {
      setSetting('stringVal', 'test');
      setSetting('numberVal', 123);
      setSetting('boolVal', true);
      setSetting('nullVal', null);
      setSetting('arrayVal', [1, 2, 3]);
      setSetting('objectVal', { key: 'value' });

      expect(getSetting('stringVal')).toBe('test');
      expect(getSetting('numberVal')).toBe(123);
      expect(getSetting('boolVal')).toBe(true);
      expect(getSetting('nullVal')).toBeNull();
      expect(getSetting('arrayVal')).toEqual([1, 2, 3]);
      expect(getSetting('objectVal')).toEqual({ key: 'value' });
    });
  });

  describe('getSettingsFilePath', () => {
    it('should return the settings file path', () => {
      const path = getSettingsFilePath();
      expect(path).toBeTruthy();
      expect(typeof path).toBe('string');
      expect(path).toContain('settings.json');
    });
  });

  describe('Integration: Window Bounds', () => {
    it('should save and restore window bounds', () => {
      const bounds = { width: 1200, height: 800, x: 100, y: 200 };

      setSetting('windowBounds', bounds);

      const restored = getSetting<typeof bounds>('windowBounds');
      expect(restored).toEqual(bounds);
      expect(restored?.width).toBe(1200);
      expect(restored?.height).toBe(800);
      expect(restored?.x).toBe(100);
      expect(restored?.y).toBe(200);
    });

    it('should handle partial window bounds', () => {
      const partialBounds = { width: 1200, height: 800 };

      setSetting('windowBounds', partialBounds);

      const restored = getSetting<typeof partialBounds>('windowBounds');
      expect(restored).toEqual(partialBounds);
    });
  });
});
