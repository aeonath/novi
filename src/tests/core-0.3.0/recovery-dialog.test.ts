/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Unit tests for Recovery Dialog Component
 */

import { RecoveryDialog } from '../../renderer/components/recovery-dialog';
import type { RecoveryFile } from '../../types/global';

// Mock window.api
const mockWindowApi = {
  getRecoveryFiles: jest.fn(),
  deleteRecoveryFile: jest.fn().mockResolvedValue({ success: true }),
  clearRecoveryFiles: jest.fn().mockResolvedValue({ success: true }),
};

describe('RecoveryDialog', () => {
  let originalWindowApi: typeof window.api | undefined;

  beforeAll(() => {
    originalWindowApi = global.window.api;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.api using Object.defineProperty
    Object.defineProperty(global.window, 'api', {
      value: mockWindowApi,
      writable: true,
      configurable: true,
    });
    
    // Clean up any existing recovery dialogs
    const existing = document.getElementById('recovery-dialog');
    if (existing) {
      existing.remove();
    }
  });

  afterEach(() => {
    // Clean up
    const dialog = document.getElementById('recovery-dialog');
    if (dialog) {
      dialog.remove();
    }
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
    it('should create recovery dialog element', () => {
      const dialog = new RecoveryDialog();
      expect(dialog).toBeDefined();
      
      const element = document.getElementById('recovery-dialog');
      expect(element).toBeTruthy();
      expect(element?.style.display).toBe('none');
      
      dialog.destroy();
    });
  });

  describe('show and hide', () => {
    it('should show dialog when recovery files exist', async () => {
      const mockRecoveryFiles: RecoveryFile[] = [
        {
          id: '1',
          originalPath: '/test/file1.js',
          timestamp: Date.now(),
          content: 'const x = 1;',
        },
      ];
      
      mockWindowApi.getRecoveryFiles.mockResolvedValueOnce(mockRecoveryFiles);
      
      const dialog = new RecoveryDialog();
      
      // Wait for show to complete
      await dialog.show();
      
      // Need to wait for next tick for rendering
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const element = document.getElementById('recovery-dialog');
      expect(element).toBeTruthy();
      expect(mockWindowApi.getRecoveryFiles).toHaveBeenCalled();
      
      // Check that content was rendered
      expect(element?.innerHTML).toContain('file1.js');
      
      dialog.destroy();
    });

    it('should not show dialog when no recovery files', async () => {
      mockWindowApi.getRecoveryFiles.mockResolvedValueOnce([]);
      
      const dialog = new RecoveryDialog();
      await dialog.show();
      
      const element = document.getElementById('recovery-dialog');
      expect(element?.style.display).toBe('none');
      
      dialog.destroy();
    });

    it('should hide dialog', async () => {
      const mockRecoveryFiles: RecoveryFile[] = [
        {
          id: '1',
          originalPath: '/test/file1.js',
          timestamp: Date.now(),
          content: 'const x = 1;',
        },
      ];
      
      mockWindowApi.getRecoveryFiles.mockResolvedValueOnce(mockRecoveryFiles);
      
      const dialog = new RecoveryDialog();
      await dialog.show();
      
      dialog.hide();
      
      const element = document.getElementById('recovery-dialog');
      expect(element?.style.display).toBe('none');
      
      dialog.destroy();
    });
  });

  describe('restore functionality', () => {
    it('should call restore callback when restore button clicked', async () => {
      const mockRecoveryFile: RecoveryFile = {
        id: '1',
        originalPath: '/test/file1.js',
        timestamp: Date.now(),
        content: 'const x = 1;',
      };
      
      mockWindowApi.getRecoveryFiles.mockResolvedValueOnce([mockRecoveryFile]);
      
      const dialog = new RecoveryDialog();
      
      let restoredFile: RecoveryFile | null = null;
      dialog.onRestore((file) => {
        restoredFile = file;
      });
      
      await dialog.show();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Find and click restore button
      const restoreBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent === 'Restore'
      );
      
      expect(restoreBtn).toBeTruthy();
      restoreBtn?.click();
      
      expect(restoredFile).toEqual(mockRecoveryFile);
      
      dialog.destroy();
    });
  });

  describe('discard functionality', () => {
    it('should call discard callback when discard button clicked', async () => {
      const mockRecoveryFile: RecoveryFile = {
        id: '1',
        originalPath: '/test/file1.js',
        timestamp: Date.now(),
        content: 'const x = 1;',
      };
      
      mockWindowApi.getRecoveryFiles.mockResolvedValueOnce([mockRecoveryFile]);
      
      const dialog = new RecoveryDialog();
      
      let discardedId: string | null = null;
      dialog.onDiscard((id) => {
        discardedId = id;
      });
      
      await dialog.show();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Find and click discard button
      const discardBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent === 'Discard' && btn.textContent.length === 'Discard'.length
      );
      
      expect(discardBtn).toBeTruthy();
      discardBtn?.click();
      
      expect(discardedId).toBe('1');
      
      dialog.destroy();
    });

    it('should call discard all callback when discard all button clicked', async () => {
      const mockRecoveryFiles: RecoveryFile[] = [
        {
          id: '1',
          originalPath: '/test/file1.js',
          timestamp: Date.now(),
          content: 'const x = 1;',
        },
        {
          id: '2',
          originalPath: '/test/file2.js',
          timestamp: Date.now(),
          content: 'const y = 2;',
        },
      ];
      
      mockWindowApi.getRecoveryFiles.mockResolvedValueOnce(mockRecoveryFiles);
      
      const dialog = new RecoveryDialog();
      
      let discardAllCalled = false;
      dialog.onDiscardAll(() => {
        discardAllCalled = true;
      });
      
      await dialog.show();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Find and click discard all button
      const discardAllBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent === 'Discard All'
      );
      
      expect(discardAllBtn).toBeTruthy();
      discardAllBtn?.click();
      
      expect(discardAllCalled).toBe(true);
      
      // Dialog should be hidden after discard all
      const element = document.getElementById('recovery-dialog');
      expect(element?.style.display).toBe('none');
      
      dialog.destroy();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      // Suppress console.error for this test to avoid polluting logger tests
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockWindowApi.getRecoveryFiles.mockRejectedValueOnce(new Error('API error'));
      
      const dialog = new RecoveryDialog();
      
      // Should not throw
      await expect(dialog.show()).resolves.not.toThrow();
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Recovery] Failed to load recovery files:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
      dialog.destroy();
    });

    it('should handle missing window.api', async () => {
      // Temporarily remove window.api
      Object.defineProperty(global.window, 'api', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      const dialog = new RecoveryDialog();
      
      // Should not throw
      await expect(dialog.show()).resolves.not.toThrow();
      
      dialog.destroy();
      
      // Restore window.api for subsequent tests
      Object.defineProperty(global.window, 'api', {
        value: mockWindowApi,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('file display', () => {
    it('should display file information correctly', async () => {
      const mockRecoveryFile: RecoveryFile = {
        id: '1',
        originalPath: '/test/path/file1.js',
        timestamp: Date.now() - 60000, // 1 minute ago
        content: 'const x = 1;',
      };
      
      mockWindowApi.getRecoveryFiles.mockResolvedValueOnce([mockRecoveryFile]);
      
      const dialog = new RecoveryDialog();
      await dialog.show();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const dialogElement = document.getElementById('recovery-dialog');
      expect(dialogElement?.textContent).toContain('file1.js');
      expect(dialogElement?.textContent).toContain('/test/path/file1.js');
      
      dialog.destroy();
    });

    it('should display multiple recovery files', async () => {
      const mockRecoveryFiles: RecoveryFile[] = [
        {
          id: '1',
          originalPath: '/test/file1.js',
          timestamp: Date.now(),
          content: 'const x = 1;',
        },
        {
          id: '2',
          originalPath: '/test/file2.js',
          timestamp: Date.now(),
          content: 'const y = 2;',
        },
      ];
      
      mockWindowApi.getRecoveryFiles.mockResolvedValueOnce(mockRecoveryFiles);
      
      const dialog = new RecoveryDialog();
      await dialog.show();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const dialogElement = document.getElementById('recovery-dialog');
      expect(dialogElement?.textContent).toContain('2 files');
      expect(dialogElement?.textContent).toContain('file1.js');
      expect(dialogElement?.textContent).toContain('file2.js');
      
      dialog.destroy();
    });
  });

  describe('destroy', () => {
    it('should remove dialog from DOM', () => {
      const dialog = new RecoveryDialog();
      expect(document.getElementById('recovery-dialog')).toBeTruthy();
      
      dialog.destroy();
      expect(document.getElementById('recovery-dialog')).toBeFalsy();
    });
  });
});

