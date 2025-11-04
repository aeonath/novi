/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Unit tests for Auto-Save Service
 */

import { AutoSaveService } from '../../renderer/services/auto-save';
import type { Tab } from '../../renderer/components/tab-bar';

// Mock window.api
const mockWindowApi = {
  saveRecoveryFiles: jest.fn().mockResolvedValue({ success: true }),
  getRecoveryFiles: jest.fn().mockResolvedValue([]),
  deleteRecoveryFile: jest.fn().mockResolvedValue({ success: true }),
  clearRecoveryFiles: jest.fn().mockResolvedValue({ success: true }),
};

describe('AutoSaveService', () => {
  let originalWindowApi: typeof window.api | undefined;

  beforeAll(() => {
    originalWindowApi = global.window.api;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock window.api using Object.defineProperty
    Object.defineProperty(global.window, 'api', {
      value: mockWindowApi,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    // Restore original window.api
    if (originalWindowApi) {
      Object.defineProperty(global.window, 'api', {
        value: originalWindowApi,
        writable: true,
        configurable: true,
      });
    }
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const service = new AutoSaveService();
      expect(service).toBeDefined();
      expect(service.isEnabled()).toBe(true);
      expect(service.getInterval()).toBe(30000);
    });

    it('should initialize with custom options', () => {
      const service = new AutoSaveService({
        enabled: false,
        intervalMs: 60000,
      });
      expect(service.isEnabled()).toBe(false);
      expect(service.getInterval()).toBe(60000);
    });
  });

  describe('start and stop', () => {
    it('should start auto-save service when enabled', () => {
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      service.start();
      
      // Service should be running (we can't directly check the interval, but we can verify behavior)
      expect(service.isEnabled()).toBe(true);
      
      service.stop();
    });

    it('should not start when disabled', () => {
      const service = new AutoSaveService({ enabled: false, intervalMs: 1000 });
      service.start();
      
      // Even though start was called, it shouldn't actually start
      expect(service.isEnabled()).toBe(false);
      
      service.stop();
    });

    it('should stop auto-save service', () => {
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      service.start();
      service.stop();
      
      // Verify it's stopped (no error should occur)
      expect(service.isEnabled()).toBe(true); // enabled state doesn't change, just stops running
    });
  });

  describe('auto-save operations', () => {
    it('should auto-save dirty tabs periodically', async () => {
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      
      const dirtyTabs: Tab[] = [
        {
          id: '1',
          filePath: '/test/file1.js',
          fileName: 'file1.js',
          isDirty: true,
          content: 'const x = 1;',
          language: 'javascript',
        },
        {
          id: '2',
          filePath: '/test/file2.js',
          fileName: 'file2.js',
          isDirty: true,
          content: 'const y = 2;',
          language: 'javascript',
        },
      ];
      
      service.onGetDirtyTabs(() => dirtyTabs);
      
      const autoSavePromise = new Promise<Tab[]>((resolve) => {
        service.onAutoSave((tabs) => {
          resolve(tabs);
        });
      });
      
      service.start();
      
      // Fast-forward time by 1 second
      jest.advanceTimersByTime(1000);
      
      // Wait for auto-save to complete
      const savedTabs = await autoSavePromise;
      
      expect(savedTabs.length).toBe(2);
      expect(mockWindowApi.saveRecoveryFiles).toHaveBeenCalledWith(dirtyTabs);
      
      service.stop();
    });

    it('should not save when no dirty tabs', async () => {
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      
      service.onGetDirtyTabs(() => []);
      
      service.start();
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      
      expect(mockWindowApi.saveRecoveryFiles).not.toHaveBeenCalled();
      
      service.stop();
    });

    it('should trigger manual auto-save', async () => {
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      
      const dirtyTab: Tab = {
        id: '1',
        filePath: '/test/file.js',
        fileName: 'file.js',
        isDirty: true,
        content: 'const x = 1;',
        language: 'javascript',
      };
      
      service.onGetDirtyTabs(() => [dirtyTab]);
      
      await service.triggerAutoSave();
      
      expect(mockWindowApi.saveRecoveryFiles).toHaveBeenCalledWith([dirtyTab]);
    });
  });

  describe('update options', () => {
    it('should update interval', () => {
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      service.start();
      
      service.updateOptions({ intervalMs: 2000 });
      
      expect(service.getInterval()).toBe(2000);
      
      service.stop();
    });

    it('should restart service when interval changes', () => {
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      service.start();
      
      const stopSpy = jest.spyOn(service, 'stop');
      const startSpy = jest.spyOn(service, 'start');
      
      service.updateOptions({ intervalMs: 2000 });
      
      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
      
      service.stop();
    });

    it('should enable/disable service', () => {
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      service.start();
      
      service.updateOptions({ enabled: false });
      expect(service.isEnabled()).toBe(false);
      
      service.updateOptions({ enabled: true });
      expect(service.isEnabled()).toBe(true);
      
      service.stop();
    });
  });

  describe('error handling', () => {
    it('should handle save errors gracefully', async () => {
      // Suppress console.error for this test to avoid polluting logger tests
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      
      const dirtyTab: Tab = {
        id: '1',
        filePath: '/test/file.js',
        fileName: 'file.js',
        isDirty: true,
        content: 'const x = 1;',
        language: 'javascript',
      };
      
      service.onGetDirtyTabs(() => [dirtyTab]);
      
      // Mock saveRecoveryFiles to throw error
      mockWindowApi.saveRecoveryFiles.mockRejectedValueOnce(new Error('Save failed'));
      
      // Should not throw
      await expect(service.triggerAutoSave()).resolves.not.toThrow();
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AutoSave] Failed to save recovery files:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
      service.stop();
    });

    it('should handle missing window.api', async () => {
      // Temporarily remove window.api
      Object.defineProperty(global.window, 'api', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      const service = new AutoSaveService({ enabled: true, intervalMs: 1000 });
      
      const dirtyTab: Tab = {
        id: '1',
        filePath: '/test/file.js',
        fileName: 'file.js',
        isDirty: true,
        content: 'const x = 1;',
        language: 'javascript',
      };
      
      service.onGetDirtyTabs(() => [dirtyTab]);
      
      // Should not throw
      await expect(service.triggerAutoSave()).resolves.not.toThrow();
      
      service.stop();
      
      // Restore window.api for subsequent tests
      Object.defineProperty(global.window, 'api', {
        value: mockWindowApi,
        writable: true,
        configurable: true,
      });
    });
  });
});

