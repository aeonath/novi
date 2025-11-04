/**
 * Unit tests for DiagnosticsPanel component
 */

import { DiagnosticsPanel } from '../../renderer/components/diagnostics-panel';

// Mock window.api and navigator.clipboard
const mockWindowApi = {
  copyDiagnostics: jest.fn(),
};

const mockClipboard = {
  writeText: jest.fn(),
};

describe('DiagnosticsPanel Component', () => {
  let originalWindowApi: typeof window.api | undefined;
  let originalClipboard: typeof navigator.clipboard;

  beforeAll(() => {
    originalWindowApi = global.window.api;
    originalClipboard = navigator.clipboard;
  });

  beforeEach(() => {
    // Set up window.api mock
    Object.defineProperty(global.window, 'api', {
      value: mockWindowApi,
      writable: true,
      configurable: true,
    });

    // Set up navigator.clipboard mock
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
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
    // Restore originals
    if (originalWindowApi) {
      Object.defineProperty(global.window, 'api', {
        value: originalWindowApi,
        writable: true,
        configurable: true,
      });
    } else {
      delete (global.window as { api?: unknown }).api;
    }

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  describe('Initialization', () => {
    test('should create diagnostics panel element', () => {
      const panel = new DiagnosticsPanel();
      const element = document.querySelector('.diagnostics-panel');
      const overlay = document.querySelector('.diagnostics-overlay');

      expect(element).toBeTruthy();
      expect(overlay).toBeTruthy();
      expect(panel).toBeDefined();
    });

    test('should be hidden by default', () => {
      new DiagnosticsPanel();
      const element = document.querySelector('.diagnostics-panel') as HTMLElement;
      const overlay = document.querySelector('.diagnostics-overlay') as HTMLElement;

      expect(element.style.display).toBe('none');
      expect(overlay.style.display).toBe('none');
    });

    test('should create with custom container', () => {
      const container = document.createElement('div');
      container.id = 'custom-container';
      document.body.appendChild(container);

      new DiagnosticsPanel(container);
      const element = container.querySelector('.diagnostics-panel');
      const overlay = container.querySelector('.diagnostics-overlay');

      expect(element).toBeTruthy();
      expect(overlay).toBeTruthy();
    });

    test('should have header with title', () => {
      new DiagnosticsPanel();
      const header = document.querySelector('.diagnostics-header');
      const title = header?.querySelector('h2');

      expect(header).toBeTruthy();
      expect(title?.textContent).toBe('System Diagnostics');
    });

    test('should have content area with table', () => {
      new DiagnosticsPanel();
      const content = document.querySelector('.diagnostics-content');
      const table = document.querySelector('.diagnostics-table');

      expect(content).toBeTruthy();
      expect(table).toBeTruthy();
    });

    test('should have footer with Copy button', () => {
      new DiagnosticsPanel();
      const footer = document.querySelector('.diagnostics-footer');
      const copyButton = footer?.querySelector('[data-action="copy"]');

      expect(footer).toBeTruthy();
      expect(copyButton).toBeTruthy();
      expect(copyButton?.textContent).toBe('Copy Info');
    });

    test('should have close button', () => {
      new DiagnosticsPanel();
      const header = document.querySelector('.diagnostics-header');
      const closeButton = header?.querySelector('button[title="Close"]');

      expect(closeButton).toBeTruthy();
    });
  });

  describe('Loading Diagnostics', () => {
    test('should load and display diagnostics data', async () => {
      const mockDiagnostics = `Nova Crash Report
=================

Timestamp: 2025-11-04T12:00:00.000Z

Error:
  Name: Unknown
  Message: Diagnostics information

Environment:
  Platform: win32
  Architecture: x64
  Node.js Version: 20.10.0
  Electron Version: 38.2.2
  App Version: 0.0.1
`;

      mockWindowApi.copyDiagnostics.mockResolvedValue(mockDiagnostics);

      const panel = new DiagnosticsPanel();
      await panel.show();

      expect(mockWindowApi.copyDiagnostics).toHaveBeenCalled();
      expect(panel.visible()).toBe(true);

      const table = document.querySelector('.diagnostics-table') as HTMLTableElement;
      expect(table.rows.length).toBeGreaterThan(0);
    });

    test('should parse and display all diagnostics fields', async () => {
      const mockDiagnostics = `Nova Crash Report
=================

Timestamp: 2025-11-04T12:00:00.000Z

Error:
  Name: Unknown
  Message: Diagnostics information

Environment:
  Platform: win32
  Architecture: x64
  Node.js Version: 20.10.0
  Electron Version: 38.2.2
  App Version: 0.0.1
`;

      mockWindowApi.copyDiagnostics.mockResolvedValue(mockDiagnostics);

      const panel = new DiagnosticsPanel();
      await panel.show();

      const table = document.querySelector('.diagnostics-table') as HTMLTableElement;
      const cells = Array.from(table.querySelectorAll('td'));
      const cellText = cells.map((cell) => cell.textContent);

      expect(cellText).toContain('Application Version');
      expect(cellText).toContain('0.0.1');
      expect(cellText).toContain('Electron Version');
      expect(cellText).toContain('38.2.2');
      expect(cellText).toContain('Node.js Version');
      expect(cellText).toContain('20.10.0');
      expect(cellText).toContain('Platform');
      expect(cellText).toContain('win32');
      expect(cellText).toContain('Architecture');
      expect(cellText).toContain('x64');
    });

    test('should handle API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWindowApi.copyDiagnostics.mockRejectedValue(new Error('API error'));

      const panel = new DiagnosticsPanel();
      await panel.show();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test('should handle missing API', async () => {
      Object.defineProperty(global.window, 'api', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const panel = new DiagnosticsPanel();
      await panel.loadDiagnostics();

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

  describe('Copy Functionality', () => {
    test('should copy diagnostics to clipboard', async () => {
      const mockDiagnostics = 'Test diagnostics info';
      mockWindowApi.copyDiagnostics.mockResolvedValue(mockDiagnostics);
      mockClipboard.writeText.mockResolvedValue(undefined);

      const panel = new DiagnosticsPanel();
      await panel.show();

      const copyButton = document.querySelector('[data-action="copy"]') as HTMLElement;
      copyButton.click();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockWindowApi.copyDiagnostics).toHaveBeenCalledTimes(2); // Once for show, once for copy
      expect(mockClipboard.writeText).toHaveBeenCalledWith(mockDiagnostics);
    });

    test('should show success feedback after copying', async () => {
      const mockDiagnostics = 'Test diagnostics info';
      mockWindowApi.copyDiagnostics.mockResolvedValue(mockDiagnostics);
      mockClipboard.writeText.mockResolvedValue(undefined);

      const panel = new DiagnosticsPanel();
      await panel.show();

      const copyButton = document.querySelector('[data-action="copy"]') as HTMLElement;
      const originalText = copyButton.textContent;

      copyButton.click();

      // Wait for feedback
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(copyButton.textContent).toBe('Copied!');

      // Wait for reset
      await new Promise((resolve) => setTimeout(resolve, 2100));

      expect(copyButton.textContent).toBe(originalText);
    });

    test('should handle copy errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWindowApi.copyDiagnostics.mockResolvedValue('test');
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

      const panel = new DiagnosticsPanel();
      await panel.show();

      const copyButton = document.querySelector('[data-action="copy"]') as HTMLElement;
      copyButton.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Visibility Controls', () => {
    test('should show panel when show() is called', async () => {
      mockWindowApi.copyDiagnostics.mockResolvedValue('test');

      const panel = new DiagnosticsPanel();
      await panel.show();

      const element = document.querySelector('.diagnostics-panel') as HTMLElement;
      const overlay = document.querySelector('.diagnostics-overlay') as HTMLElement;

      expect(element.style.display).toBe('flex');
      expect(overlay.style.display).toBe('block');
      expect(panel.visible()).toBe(true);
    });

    test('should hide panel when hide() is called', async () => {
      mockWindowApi.copyDiagnostics.mockResolvedValue('test');

      const panel = new DiagnosticsPanel();
      await panel.show();
      panel.hide();

      const element = document.querySelector('.diagnostics-panel') as HTMLElement;
      const overlay = document.querySelector('.diagnostics-overlay') as HTMLElement;

      expect(element.style.display).toBe('none');
      expect(overlay.style.display).toBe('none');
      expect(panel.visible()).toBe(false);
    });

    test('should hide panel when close button is clicked', async () => {
      mockWindowApi.copyDiagnostics.mockResolvedValue('test');

      const panel = new DiagnosticsPanel();
      await panel.show();

      const closeButton = document.querySelector('button[title="Close"]') as HTMLElement;
      closeButton.click();

      expect(panel.visible()).toBe(false);
    });

    test('should hide panel when overlay is clicked', async () => {
      mockWindowApi.copyDiagnostics.mockResolvedValue('test');

      const panel = new DiagnosticsPanel();
      await panel.show();

      const overlay = document.querySelector('.diagnostics-overlay') as HTMLElement;
      overlay.click();

      expect(panel.visible()).toBe(false);
    });

    test('should return correct visibility state', async () => {
      mockWindowApi.copyDiagnostics.mockResolvedValue('test');

      const panel = new DiagnosticsPanel();
      
      expect(panel.visible()).toBe(false);
      
      await panel.show();
      expect(panel.visible()).toBe(true);
      
      panel.hide();
      expect(panel.visible()).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should destroy panel and remove elements', async () => {
      mockWindowApi.copyDiagnostics.mockResolvedValue('test');

      const panel = new DiagnosticsPanel();
      await panel.show();

      const elementBefore = document.querySelector('.diagnostics-panel');
      const overlayBefore = document.querySelector('.diagnostics-overlay');

      expect(elementBefore).toBeTruthy();
      expect(overlayBefore).toBeTruthy();

      panel.destroy();

      const elementAfter = document.querySelector('.diagnostics-panel');
      const overlayAfter = document.querySelector('.diagnostics-overlay');

      expect(elementAfter).toBeNull();
      expect(overlayAfter).toBeNull();
      expect(panel.visible()).toBe(false);
    });
  });
});

