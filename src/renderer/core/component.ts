/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Minimal base class for vanilla DOM components.
 * Provides mount/unmount lifecycle and automatic cleanup of event subscriptions.
 */

export abstract class Component {
  protected el: HTMLElement;
  private cleanups: (() => void)[] = [];
  private mounted = false;

  constructor(tag: string = 'div', className?: string) {
    this.el = document.createElement(tag);
    if (className) this.el.className = className;
  }

  /** Mount this component into a parent container */
  mount(parent: HTMLElement): void {
    if (this.mounted) return;
    parent.appendChild(this.el);
    this.mounted = true;
    this.onMount();
  }

  /** Remove from DOM and run cleanup */
  unmount(): void {
    if (!this.mounted) return;
    this.onUnmount();
    this.el.remove();
    this.mounted = false;
  }

  /** Full teardown — unmount + dispose all resources */
  destroy(): void {
    this.unmount();
    for (const fn of this.cleanups) fn();
    this.cleanups.length = 0;
    this.onDestroy();
  }

  /** Register a cleanup function to run on destroy */
  protected addCleanup(fn: () => void): void {
    this.cleanups.push(fn);
  }

  /** Add an event listener with automatic cleanup */
  protected listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window | Document,
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(event, handler as EventListener, options);
    this.addCleanup(() => target.removeEventListener(event, handler as EventListener, options));
  }

  /** Get the root DOM element */
  getElement(): HTMLElement {
    return this.el;
  }

  isMounted(): boolean {
    return this.mounted;
  }

  /** Override in subclasses for mount-time setup */
  protected onMount(): void {}

  /** Override in subclasses for unmount-time cleanup */
  protected onUnmount(): void {}

  /** Override in subclasses for final teardown */
  protected onDestroy(): void {}
}
