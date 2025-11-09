/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Unit tests for WorkspaceManager
 */

import { WorkspaceManager, WorkspaceState } from '../../main/services/workspace-service';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs modules
jest.mock('fs/promises');
jest.mock('fs');

describe('WorkspaceManager', () => {
  let workspaceManager: WorkspaceManager;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create new instance
    workspaceManager = new WorkspaceManager();
  });

  describe('saveWorkspace', () => {
    it('should save workspace state to file', async () => {
      const mockState: WorkspaceState = {
        workspaceRoot: '/test/workspace',
        openFiles: [
          { filePath: '/test/file1.ts', content: 'test content', isDirty: false },
        ],
        openTerminals: [],
        openNovaPrompts: [],
        activeTabId: 'tab-1',
        activeTabType: 'file',
        layout: {
          showGitPanel: false,
        },
        lastSaved: '2025-11-04T12:00:00.000Z',
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await workspaceManager.saveWorkspace(mockState);

      expect(writeFile).toHaveBeenCalled();
      const savedData = (writeFile as jest.Mock).mock.calls[0][1];
      expect(savedData).toContain('workspaceRoot=/test/workspace');
      expect(savedData).toContain('openFiles=/test/file1.ts');
      expect(savedData).toContain('lastSaved=');
    });

    it('should create config directory if it does not exist', async () => {
      const mockState: WorkspaceState = {
        workspaceRoot: null,
        openFiles: [],
        openTerminals: [],
        openNovaPrompts: [],
        activeTabId: null,
        activeTabType: null,
        layout: {
          showGitPanel: false,
        },
        lastSaved: '2025-11-04T12:00:00.000Z',
      };

      (existsSync as jest.Mock).mockReturnValue(false);
      (mkdir as jest.Mock).mockResolvedValue(undefined);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await workspaceManager.saveWorkspace(mockState);

      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalled();
    });

    it('should throw error if save fails', async () => {
      const mockState: WorkspaceState = {
        workspaceRoot: null,
        openFiles: [],
        openTerminals: [],
        openNovaPrompts: [],
        activeTabId: null,
        activeTabType: null,
        layout: {
          showGitPanel: false,
        },
        lastSaved: '2025-11-04T12:00:00.000Z',
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      // Mock console.error to suppress expected error log
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(workspaceManager.saveWorkspace(mockState)).rejects.toThrow('Write failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadWorkspace', () => {
    it('should load workspace state from file', async () => {
      const mockConfig = `workspaceRoot=/test/workspace
activeTabId=tab-1
activeTabType=file
showGitPanel=true
lastSaved=2025-11-04T12:00:00.000Z
openFiles=/test/file1.ts
openFilesDirty=0
openTerminals=
openNovaPrompts=`;

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockResolvedValue(mockConfig);

      const result = await workspaceManager.loadWorkspace();

      expect(readFile).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.workspaceRoot).toBe('/test/workspace');
      expect(result?.openFiles).toHaveLength(1);
      expect(result?.layout.showGitPanel).toBe(true);
    });

    it('should return null if workspace file does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = await workspaceManager.loadWorkspace();

      expect(result).toBeNull();
      expect(readFile).not.toHaveBeenCalled();
    });

    it('should return null if load fails', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockRejectedValue(new Error('Read failed'));

      // Mock console.error to suppress expected error log
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await workspaceManager.loadWorkspace();

      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid config format gracefully', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockResolvedValue('invalid format without equals signs');

      const result = await workspaceManager.loadWorkspace();

      // Should still parse but with empty data
      expect(result).not.toBeNull();
      expect(result?.openFiles).toHaveLength(0);
    });
  });

  describe('clearWorkspace', () => {
    it('should clear workspace by writing empty object', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await workspaceManager.clearWorkspace();

      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '',
        'utf-8'
      );
    });

    it('should not write if file does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await workspaceManager.clearWorkspace();

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should throw error if clear fails', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      // Mock console.error to suppress expected error log
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(workspaceManager.clearWorkspace()).rejects.toThrow('Write failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getWorkspaceFilePath', () => {
    it('should return workspace file path', () => {
      const path = workspaceManager.getWorkspaceFilePath();
      
      expect(path).toBeDefined();
      expect(path).toContain('.nova');
      expect(path).toContain('workspacerc.json');
    });
  });

  describe('workspace state structure', () => {
    it('should handle workspace with multiple open files', async () => {
      const mockState: WorkspaceState = {
        workspaceRoot: '/test/workspace',
        openFiles: [
          { filePath: '/test/file1.ts', content: 'content1', isDirty: false },
          { filePath: '/test/file2.ts', content: 'content2', isDirty: true },
          { filePath: '/test/file3.ts', content: 'content3', isDirty: false },
        ],
        openTerminals: [
          { id: 'terminal-1', name: 'bash' },
        ],
        openNovaPrompts: [
          { id: 'prompt-1', name: 'nova>' },
        ],
        activeTabId: 'tab-2',
        activeTabType: 'file',
        layout: {
          showGitPanel: true,
        },
        lastSaved: '2025-11-04T12:00:00.000Z',
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await workspaceManager.saveWorkspace(mockState);

      expect(writeFile).toHaveBeenCalled();
      const savedData = (writeFile as jest.Mock).mock.calls[0][1];
      
      expect(savedData).toContain('openFiles=/test/file1.ts|/test/file2.ts|/test/file3.ts');
      expect(savedData).toContain('openTerminals=terminal-1');
      expect(savedData).toContain('openNovaPrompts=prompt-1');
      expect(savedData).toContain('activeTabId=tab-2');
      expect(savedData).toContain('activeTabType=file');
    });

    it('should handle empty workspace', async () => {
      const mockState: WorkspaceState = {
        workspaceRoot: null,
        openFiles: [],
        openTerminals: [],
        openNovaPrompts: [],
        activeTabId: null,
        activeTabType: null,
        layout: {
          showGitPanel: false,
        },
        lastSaved: '2025-11-04T12:00:00.000Z',
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await workspaceManager.saveWorkspace(mockState);

      expect(writeFile).toHaveBeenCalled();
      const savedData = (writeFile as jest.Mock).mock.calls[0][1];
      
      expect(savedData).toContain('openFiles=');
      expect(savedData).toContain('workspaceRoot=');
      expect(savedData).toContain('activeTabId=');
    });
  });
});

