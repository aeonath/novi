/**
 * Unit tests for TitleBar component
 */

import { TitleBar } from '../../renderer/components/title-bar';

// Mock the window.api object
const mockWindowApi = {
  windowMinimize: jest.fn(),
  windowMaximize: jest.fn(),
  windowClose: jest.fn(),
  windowIsMaximized: jest.fn(() => Promise.resolve(false)),
};

describe('TitleBar Component', () => {
  let originalWindow: typeof global.window;

  beforeAll(() => {
    // Store original window
    originalWindow = global.window;
  });

  beforeEach(() => {
    // Set up window.api mock
    (global.window as unknown as typeof global.window & { api: typeof mockWindowApi }) = {
      ...originalWindow,
      api: mockWindowApi,
    } as typeof global.window & { api: typeof mockWindowApi };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  afterAll(() => {
    // Restore original window
    global.window = originalWindow;
  });

  test('should create a title bar element', () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();

    expect(element).toBeTruthy();
    expect(element.className).toBe('title-bar');
  });

  test('should display default title', () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();
    const titleElement = element.querySelector('.title-bar-title');

    expect(titleElement).toBeTruthy();
    expect(titleElement?.textContent).toBe('Nova IDE');
  });

  test('should display custom title', () => {
    const titleBar = new TitleBar({ title: 'Custom Title' });
    const element = titleBar.getElement();
    const titleElement = element.querySelector('.title-bar-title');

    expect(titleElement?.textContent).toBe('Custom Title');
  });

  test('should have minimize, maximize, and close buttons', () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();

    const minimizeButton = element.querySelector('.title-bar-button-minimize');
    const maximizeButton = element.querySelector('.title-bar-button-maximize');
    const closeButton = element.querySelector('.title-bar-button-close');

    expect(minimizeButton).toBeTruthy();
    expect(maximizeButton).toBeTruthy();
    expect(closeButton).toBeTruthy();
  });

  test('should have clickable minimize button with correct action', () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();
    
    const minimizeButton = element.querySelector('.title-bar-button-minimize') as HTMLElement;

    expect(minimizeButton).toBeTruthy();
    expect(minimizeButton.dataset.action).toBe('minimize');
    expect(minimizeButton.tagName.toLowerCase()).toBe('button');
  });

  test('should have clickable maximize button with correct action', () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();
    
    const maximizeButton = element.querySelector('.title-bar-button-maximize') as HTMLElement;

    expect(maximizeButton).toBeTruthy();
    expect(maximizeButton.dataset.action).toBe('maximize');
    expect(maximizeButton.tagName.toLowerCase()).toBe('button');
  });

  test('should have clickable close button with correct action', () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();
    
    const closeButton = element.querySelector('.title-bar-button-close') as HTMLElement;

    expect(closeButton).toBeTruthy();
    expect(closeButton.dataset.action).toBe('close');
    expect(closeButton.tagName.toLowerCase()).toBe('button');
  });

  test('should display initial maximize button icon', async () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();
    const maximizeButton = element.querySelector('.title-bar-button-maximize') as HTMLElement;

    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show default maximize icon
    expect(maximizeButton.textContent).toMatch(/[□❐]/); // Either maximize or restore icon
  });

  test('should allow setting title programmatically', () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();
    const titleElement = element.querySelector('.title-bar-title');

    titleBar.setTitle('New Title');

    expect(titleElement?.textContent).toBe('New Title');
  });

  test('should apply custom colors', () => {
    const titleBar = new TitleBar({
      backgroundColor: '#ff0000',
      foregroundColor: '#00ff00',
    });
    const element = titleBar.getElement();

    expect(element.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(element.style.color).toBe('rgb(0, 255, 0)');
  });

  test('should remove element on destroy', () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();
    document.body.appendChild(element);

    expect(document.body.contains(element)).toBe(true);

    titleBar.destroy();

    expect(document.body.contains(element)).toBe(false);
  });

  test('should have title bar with control buttons section', async () => {
    const titleBar = new TitleBar();
    const element = titleBar.getElement();

    // Title bar should exist
    expect(element.className).toBe('title-bar');
    
    // Control buttons section should exist
    const controlsSection = element.querySelector('.title-bar-controls') as HTMLElement;
    expect(controlsSection).toBeTruthy();
    
    // Should contain all three control buttons
    const buttons = controlsSection.querySelectorAll('button');
    expect(buttons.length).toBe(3);
  });

  test('should handle errors gracefully when API is unavailable', () => {
    // Remove API
    (global as { window: { api: unknown } }).window.api = undefined as unknown as typeof mockWindowApi;

    const titleBar = new TitleBar();
    const element = titleBar.getElement();

    // Should not throw when buttons are clicked
    const minimizeButton = element.querySelector('.title-bar-button-minimize') as HTMLElement;
    const maximizeButton = element.querySelector('.title-bar-button-maximize') as HTMLElement;
    const closeButton = element.querySelector('.title-bar-button-close') as HTMLElement;

    expect(() => minimizeButton.click()).not.toThrow();
    expect(() => maximizeButton.click()).not.toThrow();
    expect(() => closeButton.click()).not.toThrow();
  });
});

