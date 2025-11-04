/**
 * Unit tests for StatusBar component
 */

import { StatusBar } from '../../renderer/components/status-bar';

describe('StatusBar Component', () => {
  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  test('should create a status bar element', () => {
    const statusBar = new StatusBar();
    const element = statusBar.getElement();

    expect(element).toBeTruthy();
    expect(element.className).toBe('status-bar');
  });

  test('should have three sections: left, center, and right', () => {
    const statusBar = new StatusBar();
    const element = statusBar.getElement();

    const leftSection = element.querySelector('.status-bar-left');
    const centerSection = element.querySelector('.status-bar-center');
    const rightSection = element.querySelector('.status-bar-right');

    expect(leftSection).toBeTruthy();
    expect(centerSection).toBeTruthy();
    expect(rightSection).toBeTruthy();
  });

  test('should display default "Ready" status', () => {
    const statusBar = new StatusBar();
    const element = statusBar.getElement();

    const statusItem = element.querySelector('#status-item-main-status');
    expect(statusItem).toBeTruthy();
    expect(statusItem?.textContent).toBe('Ready');
  });

  test('should allow setting custom status', () => {
    const statusBar = new StatusBar();
    
    const element = statusBar.getElement();
    let statusItem = element.querySelector('#status-item-main-status');
    expect(statusItem?.textContent).toBe('Ready'); // Initially Ready

    statusBar.setStatus('Loading...');
    statusItem = element.querySelector('#status-item-main-status');

    expect(statusItem?.textContent).toBe('Loading...');
  });

  test('should add items to left section', () => {
    const statusBar = new StatusBar();
    statusBar.addItem({ id: 'test-item', text: 'Test' }, 'left');

    const element = statusBar.getElement();
    const leftSection = element.querySelector('.status-bar-left');
    const testItem = leftSection?.querySelector('#status-item-test-item');

    expect(testItem).toBeTruthy();
    expect(testItem?.textContent).toBe('Test');
  });

  test('should add items to center section', () => {
    const statusBar = new StatusBar();
    statusBar.addItem({ id: 'test-item', text: 'Test' }, 'center');

    const element = statusBar.getElement();
    const centerSection = element.querySelector('.status-bar-center');
    const testItem = centerSection?.querySelector('#status-item-test-item');

    expect(testItem).toBeTruthy();
    expect(testItem?.textContent).toBe('Test');
  });

  test('should add items to right section by default', () => {
    const statusBar = new StatusBar();
    statusBar.addItem({ id: 'test-item', text: 'Test' });

    const element = statusBar.getElement();
    const rightSection = element.querySelector('.status-bar-right');
    const testItem = rightSection?.querySelector('#status-item-test-item');

    expect(testItem).toBeTruthy();
    expect(testItem?.textContent).toBe('Test');
  });

  test('should support tooltips on items', () => {
    const statusBar = new StatusBar();
    statusBar.addItem({ id: 'test-item', text: 'Test', tooltip: 'Test Tooltip' });

    const element = statusBar.getElement();
    const testItem = element.querySelector('#status-item-test-item') as HTMLElement;

    expect(testItem.title).toBe('Test Tooltip');
  });

  test('should order items by priority', () => {
    const statusBar = new StatusBar();

    statusBar.addItem({ id: 'item1', text: 'Item 1', priority: 10 }, 'right');
    statusBar.addItem({ id: 'item2', text: 'Item 2', priority: 20 }, 'right');
    statusBar.addItem({ id: 'item3', text: 'Item 3', priority: 15 }, 'right');

    const element = statusBar.getElement();
    const rightSection = element.querySelector('.status-bar-right');
    const items = Array.from(rightSection?.children || []);

    expect(items[0].id).toBe('status-item-item2'); // priority 20
    expect(items[1].id).toBe('status-item-item3'); // priority 15
    expect(items[2].id).toBe('status-item-item1'); // priority 10
  });

  test('should update existing items', () => {
    const statusBar = new StatusBar();
    statusBar.addItem({ id: 'test-item', text: 'Original' });

    const element = statusBar.getElement();
    let testItem = element.querySelector('#status-item-test-item');
    expect(testItem?.textContent).toBe('Original');

    statusBar.updateItem('test-item', 'Updated');
    testItem = element.querySelector('#status-item-test-item');
    expect(testItem?.textContent).toBe('Updated');
  });

  test('should update item tooltips', () => {
    const statusBar = new StatusBar();
    statusBar.addItem({ id: 'test-item', text: 'Test', tooltip: 'Original Tooltip' });

    const element = statusBar.getElement();
    let testItem = element.querySelector('#status-item-test-item') as HTMLElement;
    expect(testItem.title).toBe('Original Tooltip');

    statusBar.updateItem('test-item', 'Test', 'Updated Tooltip');
    testItem = element.querySelector('#status-item-test-item') as HTMLElement;
    expect(testItem.title).toBe('Updated Tooltip');
  });

  test('should remove items', () => {
    const statusBar = new StatusBar();
    statusBar.addItem({ id: 'test-item', text: 'Test' });

    const element = statusBar.getElement();
    let testItem = element.querySelector('#status-item-test-item');
    expect(testItem).toBeTruthy();

    statusBar.removeItem('test-item');
    testItem = element.querySelector('#status-item-test-item');
    expect(testItem).toBeNull();
  });

  test('should replace existing items when adding with same ID', () => {
    const statusBar = new StatusBar();
    // Clear default items first
    statusBar.clearAll();
    
    statusBar.addItem({ id: 'test-item', text: 'Original' });

    const element = statusBar.getElement();
    const rightSection = element.querySelector('.status-bar-right');

    // Should have one item
    expect(rightSection?.children.length).toBe(1);

    statusBar.addItem({ id: 'test-item', text: 'Replaced' });

    // Should still have one item, but with new text
    expect(rightSection?.children.length).toBe(1);
    const testItem = element.querySelector('#status-item-test-item');
    expect(testItem?.textContent).toBe('Replaced');
  });

  test('should clear section', () => {
    const statusBar = new StatusBar();
    // Clear defaults first
    statusBar.clearAll();
    
    statusBar.addItem({ id: 'item1', text: 'Item 1' }, 'right');
    statusBar.addItem({ id: 'item2', text: 'Item 2' }, 'right');

    const element = statusBar.getElement();
    const rightSection = element.querySelector('.status-bar-right');
    expect(rightSection?.children.length).toBe(2);

    statusBar.clearSection('right');
    expect(rightSection?.children.length).toBe(0);
  });

  test('should clear all sections', () => {
    const statusBar = new StatusBar();
    statusBar.addItem({ id: 'item1', text: 'Item 1' }, 'left');
    statusBar.addItem({ id: 'item2', text: 'Item 2' }, 'center');
    statusBar.addItem({ id: 'item3', text: 'Item 3' }, 'right');

    const element = statusBar.getElement();
    // Should have 4 items: main-status (created by constructor) + 3 new items
    // but addItem('item1', 'left') replaces main-status since it's also in left section
    expect(element.querySelectorAll('.status-bar-item').length).toBeGreaterThanOrEqual(3);

    statusBar.clearAll();
    expect(element.querySelectorAll('.status-bar-item').length).toBe(0);
  });

  test('should apply custom colors', () => {
    const statusBar = new StatusBar({
      backgroundColor: '#ff0000',
      foregroundColor: '#00ff00',
    });
    const element = statusBar.getElement();

    expect(element.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(element.style.color).toBe('rgb(0, 255, 0)');
  });

  test('should apply custom height', () => {
    const statusBar = new StatusBar({ height: 30 });
    const element = statusBar.getElement();

    expect(element.style.height).toBe('30px');
  });

  test('should remove element on destroy', () => {
    const statusBar = new StatusBar();
    const element = statusBar.getElement();
    document.body.appendChild(element);

    expect(document.body.contains(element)).toBe(true);

    statusBar.destroy();

    expect(document.body.contains(element)).toBe(false);
  });

  test('should handle updating non-existent items gracefully', () => {
    const statusBar = new StatusBar();

    // Should not throw when updating non-existent item
    expect(() => {
      statusBar.updateItem('non-existent', 'New Text');
    }).not.toThrow();
  });

  test('should handle removing non-existent items gracefully', () => {
    const statusBar = new StatusBar();

    // Should not throw when removing non-existent item
    expect(() => {
      statusBar.removeItem('non-existent');
    }).not.toThrow();
  });
});

