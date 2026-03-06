/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { Component } from '../../renderer/core/component';

class TestComponent extends Component {
  public mountCalled = false;
  public unmountCalled = false;
  public destroyCalled = false;

  constructor(tag?: string, className?: string) {
    super(tag, className);
  }

  protected onMount(): void { this.mountCalled = true; }
  protected onUnmount(): void { this.unmountCalled = true; }
  protected onDestroy(): void { this.destroyCalled = true; }

  /** Expose for testing */
  public addTestCleanup(fn: () => void): void {
    this.addCleanup(fn);
  }

  public addTestListener<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void
  ): void {
    this.listen(target, event, handler);
  }
}

describe('Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create element with specified tag', () => {
    const comp = new TestComponent('span');
    expect(comp.getElement().tagName).toBe('SPAN');
  });

  it('should default to div tag', () => {
    const comp = new TestComponent();
    expect(comp.getElement().tagName).toBe('DIV');
  });

  it('should apply className', () => {
    const comp = new TestComponent('div', 'my-class');
    expect(comp.getElement().className).toBe('my-class');
  });

  it('should mount into parent', () => {
    const comp = new TestComponent();
    comp.mount(container);
    expect(container.contains(comp.getElement())).toBe(true);
    expect(comp.isMounted()).toBe(true);
    expect(comp.mountCalled).toBe(true);
  });

  it('should not double-mount', () => {
    const comp = new TestComponent();
    comp.mount(container);
    comp.mountCalled = false;
    comp.mount(container);
    expect(comp.mountCalled).toBe(false);
  });

  it('should unmount from parent', () => {
    const comp = new TestComponent();
    comp.mount(container);
    comp.unmount();
    expect(container.contains(comp.getElement())).toBe(false);
    expect(comp.isMounted()).toBe(false);
    expect(comp.unmountCalled).toBe(true);
  });

  it('should not error on unmount when not mounted', () => {
    const comp = new TestComponent();
    expect(() => comp.unmount()).not.toThrow();
    expect(comp.unmountCalled).toBe(false);
  });

  it('should run cleanups on destroy', () => {
    const cleanup = jest.fn();
    const comp = new TestComponent();
    comp.addTestCleanup(cleanup);
    comp.mount(container);
    comp.destroy();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(comp.destroyCalled).toBe(true);
    expect(comp.isMounted()).toBe(false);
  });

  it('should remove event listeners on destroy', () => {
    const handler = jest.fn();
    const target = document.createElement('button');
    const comp = new TestComponent();
    comp.addTestListener(target, 'click', handler);
    target.click();
    expect(handler).toHaveBeenCalledTimes(1);

    comp.destroy();
    target.click();
    expect(handler).toHaveBeenCalledTimes(1); // no additional call
  });
});
