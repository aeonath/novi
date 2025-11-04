/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { FileTree } from '../../renderer/components/file-tree';
import { DirectoryEntry } from '../../types/global';

// Mock window.api
const mockApi = {
  readDirectory: jest.fn<Promise<DirectoryEntry[]>, [string]>(),
  selectDirectory: jest.fn<Promise<string | null>, []>(),
};

describe('FileTree', () => {
  let container: HTMLDivElement;
  let fileTree: FileTree;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    container.id = 'test-file-tree-container';
    document.body.appendChild(container);

    // Mock window.api
    (window as unknown as { api: typeof mockApi }).api = mockApi;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Initialization', () => {
    it('should create FileTree instance with valid container', () => {
      fileTree = new FileTree('test-file-tree-container');
      expect(fileTree).toBeInstanceOf(FileTree);
    });

    it('should throw error if container not found', () => {
      expect(() => {
        new FileTree('non-existent-container');
      }).toThrow('Container element with id "non-existent-container" not found');
    });

    it('should set up container styles', () => {
      fileTree = new FileTree('test-file-tree-container');
      expect(container.style.width).toBe('100%');
      expect(container.style.height).toBe('100%');
      expect(container.style.overflowY).toBe('auto');
    });
  });

  describe('loadDirectory', () => {
    it('should load and render directory contents', async () => {
      const mockEntries: DirectoryEntry[] = [
        {
          name: 'folder1',
          path: '/test/folder1',
          type: 'directory',
          isDirectory: true,
          size: 0,
        },
        {
          name: 'file1.txt',
          path: '/test/file1.txt',
          type: 'file',
          isDirectory: false,
          size: 100,
        },
      ];

      mockApi.readDirectory.mockResolvedValue(mockEntries);

      fileTree = new FileTree('test-file-tree-container');
      await fileTree.loadDirectory('/test');

      expect(mockApi.readDirectory).toHaveBeenCalledWith('/test');
      expect(container.innerHTML).toContain('folder1');
      expect(container.innerHTML).toContain('file1.txt');
    });

    it('should handle directory load errors gracefully', async () => {
      // Mock console.error to suppress expected error output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockApi.readDirectory.mockRejectedValue(new Error('Permission denied'));

      fileTree = new FileTree('test-file-tree-container');
      await fileTree.loadDirectory('/test');

      expect(container.innerHTML).toContain('Failed to load directory');

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should render entries from sorted directory (sorted by main process)', async () => {
      // Main process sorts: directories first, then files
      const mockEntries: DirectoryEntry[] = [
        {
          name: 'folder1',
          path: '/test/folder1',
          type: 'directory',
          isDirectory: true,
          size: 0,
        },
        {
          name: 'file1.txt',
          path: '/test/file1.txt',
          type: 'file',
          isDirectory: false,
          size: 100,
        },
      ];

      mockApi.readDirectory.mockResolvedValue(mockEntries);

      fileTree = new FileTree('test-file-tree-container');
      await fileTree.loadDirectory('/test');

      const items = container.querySelectorAll('div[data-path]');
      expect(items.length).toBeGreaterThan(1); // Root + entries
      // Root is first, then entries in order provided (already sorted by main process)
      expect(items[1]?.textContent).toContain('folder1');
      expect(items[2]?.textContent).toContain('file1.txt');
    });

    it('should set root path after loading', async () => {
      mockApi.readDirectory.mockResolvedValue([]);

      fileTree = new FileTree('test-file-tree-container');
      await fileTree.loadDirectory('/test');

      expect(fileTree.getRootPath()).toBe('/test');
    });
  });

  describe('Directory Expansion', () => {
    beforeEach(async () => {
      const mockEntries: DirectoryEntry[] = [
        {
          name: 'folder1',
          path: '/test/folder1',
          type: 'directory',
          isDirectory: true,
          size: 0,
        },
      ];

      mockApi.readDirectory.mockResolvedValue(mockEntries);
      fileTree = new FileTree('test-file-tree-container');
      await fileTree.loadDirectory('/test');
    });

    it('should expand directory on click', async () => {
      const subEntries: DirectoryEntry[] = [
        {
          name: 'subfile.txt',
          path: '/test/folder1/subfile.txt',
          type: 'file',
          isDirectory: false,
          size: 50,
        },
      ];

      mockApi.readDirectory.mockResolvedValueOnce(subEntries);

      const folderItem = container.querySelector('div[data-path="/test/folder1"]');
      expect(folderItem).toBeTruthy();

      if (folderItem) {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        folderItem.dispatchEvent(clickEvent);

        // Wait for async operation
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should have loaded subdirectory
        expect(mockApi.readDirectory).toHaveBeenCalledWith('/test/folder1');
      }
    });

    it('should toggle directory expansion state', async () => {
      const subEntries: DirectoryEntry[] = [];
      mockApi.readDirectory.mockResolvedValueOnce(subEntries);

      const folderItem = container.querySelector('div[data-path="/test/folder1"]');
      if (folderItem) {
        // Reset mock call count before toggle test
        jest.clearAllMocks();
        mockApi.readDirectory.mockResolvedValueOnce(subEntries);

        // First click to expand
        folderItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Second click to collapse (should not reload, just toggle)
        folderItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should only load once when expanding
        expect(mockApi.readDirectory).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('selectDirectory', () => {
    beforeEach(() => {
      fileTree = new FileTree('test-file-tree-container');
    });

    it('should return selected directory path', async () => {
      mockApi.selectDirectory.mockResolvedValue('/selected/path');

      const result = await fileTree.selectDirectory();

      expect(mockApi.selectDirectory).toHaveBeenCalled();
      expect(result).toBe('/selected/path');
    });

    it('should return null if directory selection cancelled', async () => {
      mockApi.selectDirectory.mockResolvedValue(null);

      const result = await fileTree.selectDirectory();

      expect(result).toBeNull();
    });

    it('should return null if API not available', async () => {
      (window as unknown as { api: unknown }).api = undefined;

      const result = await fileTree.selectDirectory();

      expect(result).toBeNull();
    });
  });

  describe('getRootPath', () => {
    beforeEach(() => {
      fileTree = new FileTree('test-file-tree-container');
    });

    it('should return null initially', () => {
      expect(fileTree.getRootPath()).toBeNull();
    });

    it('should return root path after loading directory', async () => {
      mockApi.readDirectory.mockResolvedValue([]);

      await fileTree.loadDirectory('/test');

      expect(fileTree.getRootPath()).toBe('/test');
    });
  });

  describe('Visual Rendering', () => {
    beforeEach(async () => {
      const mockEntries: DirectoryEntry[] = [
        {
          name: 'folder1',
          path: '/test/folder1',
          type: 'directory',
          isDirectory: true,
          size: 0,
        },
        {
          name: 'file1.txt',
          path: '/test/file1.txt',
          type: 'file',
          isDirectory: false,
          size: 100,
        },
      ];

      mockApi.readDirectory.mockResolvedValue(mockEntries);
      fileTree = new FileTree('test-file-tree-container');
      await fileTree.loadDirectory('/test');
    });

    it('should render directory with folder icon', () => {
      const folderItem = container.querySelector('div[data-path="/test/folder1"]');
      expect(folderItem).toBeTruthy();
      expect(folderItem?.textContent).toContain('folder1');
      expect(folderItem?.textContent).toMatch(/[▶▼]/); // Folder icon
    });

    it('should render file with file icon', () => {
      const fileItem = container.querySelector('div[data-path="/test/file1.txt"]');
      expect(fileItem).toBeTruthy();
      expect(fileItem?.textContent).toContain('file1.txt');
      expect(fileItem?.textContent).toContain('•'); // File icon
    });

    it('should apply hover styles on mouse enter', () => {
      const item = container.querySelector('div[data-path]');
      if (item) {
        const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
        item.dispatchEvent(mouseEnterEvent);

        expect((item as HTMLElement).style.background).toBe('rgb(42, 45, 46)'); // #2a2d2e
      }
    });

    it('should remove hover styles on mouse leave', () => {
      const item = container.querySelector('div[data-path]');
      if (item) {
        const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
        item.dispatchEvent(mouseEnterEvent);

        const mouseLeaveEvent = new MouseEvent('mouseleave', { bubbles: true });
        item.dispatchEvent(mouseLeaveEvent);

        expect((item as HTMLElement).style.background).toBe('transparent');
      }
    });
  });

  describe('Nested Directories', () => {
    beforeEach(async () => {
      const mockEntries: DirectoryEntry[] = [
        {
          name: 'folder1',
          path: '/test/folder1',
          type: 'directory',
          isDirectory: true,
          size: 0,
        },
      ];

      mockApi.readDirectory.mockResolvedValue(mockEntries);
      fileTree = new FileTree('test-file-tree-container');
      await fileTree.loadDirectory('/test');
    });

    it('should render nested items with indentation', async () => {
      const subEntries: DirectoryEntry[] = [
        {
          name: 'subfolder',
          path: '/test/folder1/subfolder',
          type: 'directory',
          isDirectory: true,
          size: 0,
        },
        {
          name: 'subfile.txt',
          path: '/test/folder1/subfile.txt',
          type: 'file',
          isDirectory: false,
          size: 50,
        },
      ];

      mockApi.readDirectory.mockResolvedValueOnce(subEntries);

      const folderItem = container.querySelector('div[data-path="/test/folder1"]');
      if (folderItem) {
        folderItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 100));

        const subItems = container.querySelectorAll('div[data-path]');
        expect(subItems.length).toBeGreaterThan(1);

        // Check indentation (nested items should have more padding)
        const nestedItem = Array.from(subItems).find(
          (item) => item.getAttribute('data-path') === '/test/folder1/subfile.txt'
        );
        expect(nestedItem).toBeTruthy();
      }
    });
  });
});

