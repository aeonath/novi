/**
 * Unit tests for FileViewer component
 */

import { FileViewer } from '../../renderer/components/file-viewer';
import type { FileData } from '../../types/global';

// Mock window.api
const mockWindowApi = {
  readFile: jest.fn(),
  openFile: jest.fn(),
};

describe('FileViewer Component', () => {
  let originalWindowApi: typeof window.api | undefined;

  beforeAll(() => {
    originalWindowApi = global.window.api;
  });

  beforeEach(() => {
    // Set up window.api mock using Object.defineProperty
    Object.defineProperty(global.window, 'api', {
      value: mockWindowApi,
      writable: true,
      configurable: true,
    });

    // Clear mocks
    jest.clearAllMocks();

    // Clear document body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  afterAll(() => {
    // Restore original window.api
    if (originalWindowApi) {
      Object.defineProperty(global.window, 'api', {
        value: originalWindowApi,
        writable: true,
        configurable: true,
      });
    } else {
      delete (global.window as { api?: unknown }).api;
    }
  });

  describe('Initialization', () => {
    test('should create file viewer element', () => {
      const viewer = new FileViewer();
      const element = document.querySelector('.file-viewer');

      expect(element).toBeTruthy();
      expect(viewer).toBeDefined();
    });

    test('should be hidden by default', () => {
      new FileViewer();
      const element = document.querySelector('.file-viewer') as HTMLElement;

      expect(element.style.display).toBe('none');
    });

    test('should create with custom container', () => {
      const container = document.createElement('div');
      container.id = 'custom-container';
      document.body.appendChild(container);

      new FileViewer({ container });
      const element = container.querySelector('.file-viewer');

      expect(element).toBeTruthy();
    });

    test('should have header with file info', () => {
      new FileViewer();
      const header = document.querySelector('.file-viewer-header');
      const fileName = document.querySelector('.file-viewer-name');
      const filePath = document.querySelector('.file-viewer-path');

      expect(header).toBeTruthy();
      expect(fileName).toBeTruthy();
      expect(filePath).toBeTruthy();
    });

    test('should have content area with line numbers', () => {
      new FileViewer();
      const lineNumbers = document.querySelector('.file-viewer-line-numbers');
      const content = document.querySelector('.file-viewer-content');

      expect(lineNumbers).toBeTruthy();
      expect(content).toBeTruthy();
    });

    test('should have close button', () => {
      new FileViewer();
      const controls = document.querySelector('.file-viewer-controls');

      expect(controls).toBeTruthy();
      expect(controls?.children.length).toBeGreaterThan(0);
    });
  });

  describe('File Operations', () => {
    test('should open and display a file', async () => {
      const mockFileData: FileData = {
        path: '/test/file.txt',
        content: 'Hello World\nLine 2\nLine 3',
        size: 100,
        modified: new Date(),
      };

      mockWindowApi.readFile.mockResolvedValue(mockFileData);

      const viewer = new FileViewer();
      await viewer.openFile('/test/file.txt');

      expect(mockWindowApi.readFile).toHaveBeenCalledWith('/test/file.txt');
      expect(viewer.isVisible()).toBe(true);
      expect(viewer.getCurrentFile()).toEqual(mockFileData);
    });

    test('should display file name and path', async () => {
      const mockFileData: FileData = {
        path: '/test/example.txt',
        content: 'Test content',
        size: 100,
        modified: new Date(),
      };

      mockWindowApi.readFile.mockResolvedValue(mockFileData);

      const viewer = new FileViewer();
      await viewer.openFile('/test/example.txt');

      const fileName = document.querySelector('.file-viewer-name');
      const filePath = document.querySelector('.file-viewer-path');

      expect(fileName?.textContent).toBe('example.txt');
      expect(filePath?.textContent).toBe('/test/example.txt');
    });

    test('should display file content', async () => {
      const mockFileData: FileData = {
        path: '/test/file.txt',
        content: 'Line 1\nLine 2\nLine 3',
        size: 100,
        modified: new Date(),
      };

      mockWindowApi.readFile.mockResolvedValue(mockFileData);

      const viewer = new FileViewer();
      await viewer.openFile('/test/file.txt');

      const content = document.querySelector('.file-viewer-content');
      expect(content?.textContent).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should generate line numbers', async () => {
      const mockFileData: FileData = {
        path: '/test/file.txt',
        content: 'Line 1\nLine 2\nLine 3',
        size: 100,
        modified: new Date(),
      };

      mockWindowApi.readFile.mockResolvedValue(mockFileData);

      const viewer = new FileViewer();
      await viewer.openFile('/test/file.txt');

      const lineNumbers = document.querySelector('.file-viewer-line-numbers');
      expect(lineNumbers?.textContent).toBe('1\n2\n3');
    });

    test('should handle file read error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWindowApi.readFile.mockRejectedValue(new Error('File not found'));

      const viewer = new FileViewer();
      await viewer.openFile('/test/nonexistent.txt');

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test('should reload current file', async () => {
      const mockFileData: FileData = {
        path: '/test/file.txt',
        content: 'Original content',
        size: 100,
        modified: new Date(),
      };

      const updatedFileData: FileData = {
        ...mockFileData,
        content: 'Updated content',
      };

      mockWindowApi.readFile.mockResolvedValueOnce(mockFileData).mockResolvedValueOnce(updatedFileData);

      const viewer = new FileViewer();
      await viewer.openFile('/test/file.txt');
      
      const contentBefore = document.querySelector('.file-viewer-content')?.textContent;
      expect(contentBefore).toBe('Original content');

      await viewer.reload();

      const contentAfter = document.querySelector('.file-viewer-content')?.textContent;
      expect(contentAfter).toBe('Updated content');
      expect(mockWindowApi.readFile).toHaveBeenCalledTimes(2);
    });

    test('should warn when reloading with no file open', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const viewer = new FileViewer();
      await viewer.reload();

      expect(consoleWarnSpy).toHaveBeenCalledWith('No file to reload');
      consoleWarnSpy.mockRestore();
    });

    test('should close file', async () => {
      const mockFileData: FileData = {
        path: '/test/file.txt',
        content: 'Test content',
        size: 100,
        modified: new Date(),
      };

      mockWindowApi.readFile.mockResolvedValue(mockFileData);

      const viewer = new FileViewer();
      await viewer.openFile('/test/file.txt');

      expect(viewer.isVisible()).toBe(true);
      expect(viewer.getCurrentFile()).toBeTruthy();

      viewer.close();

      expect(viewer.isVisible()).toBe(false);
      expect(viewer.getCurrentFile()).toBeNull();
    });

    test('should call onClose callback when closing', async () => {
      const onClose = jest.fn();
      const mockFileData: FileData = {
        path: '/test/file.txt',
        content: 'Test content',
        size: 100,
        modified: new Date(),
      };

      mockWindowApi.readFile.mockResolvedValue(mockFileData);

      const viewer = new FileViewer({ onClose });
      await viewer.openFile('/test/file.txt');
      viewer.close();

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visibility', () => {
    test('should show viewer', () => {
      const viewer = new FileViewer();
      viewer.show();

      expect(viewer.isVisible()).toBe(true);
    });

    test('should hide viewer', () => {
      const viewer = new FileViewer();
      viewer.show();
      expect(viewer.isVisible()).toBe(true);

      viewer.hide();
      expect(viewer.isVisible()).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should destroy viewer', () => {
      const viewer = new FileViewer();
      const element = document.querySelector('.file-viewer');

      expect(element).toBeTruthy();

      viewer.destroy();

      const elementAfter = document.querySelector('.file-viewer');
      expect(elementAfter).toBeNull();
      expect(viewer.getCurrentFile()).toBeNull();
    });
  });

  describe('Current File', () => {
    test('should return null when no file is open', () => {
      const viewer = new FileViewer();
      expect(viewer.getCurrentFile()).toBeNull();
    });

    test('should return current file data', async () => {
      const mockFileData: FileData = {
        path: '/test/file.txt',
        content: 'Test content',
        size: 100,
        modified: new Date(),
      };

      mockWindowApi.readFile.mockResolvedValue(mockFileData);

      const viewer = new FileViewer();
      await viewer.openFile('/test/file.txt');

      expect(viewer.getCurrentFile()).toEqual(mockFileData);
    });
  });

  describe('API Availability', () => {
    test('should handle missing API when opening file', async () => {
      // Temporarily remove window.api
      Object.defineProperty(global.window, 'api', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const viewer = new FileViewer();
      await viewer.openFile('/test/file.txt');

      expect(consoleErrorSpy).toHaveBeenCalledWith('API not available');
      consoleErrorSpy.mockRestore();
      
      // Restore window.api for subsequent tests
      Object.defineProperty(global.window, 'api', {
        value: mockWindowApi,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('Close Button', () => {
    test('should close viewer when close button is clicked', async () => {
      const mockFileData: FileData = {
        path: '/test/file.txt',
        content: 'Test content',
        size: 100,
        modified: new Date(),
      };

      mockWindowApi.readFile.mockResolvedValue(mockFileData);

      const viewer = new FileViewer();
      await viewer.openFile('/test/file.txt');

      expect(viewer.isVisible()).toBe(true);

      const closeButton = document.querySelector('.file-viewer-controls button') as HTMLElement;
      closeButton.click();

      expect(viewer.isVisible()).toBe(false);
    });
  });
});

