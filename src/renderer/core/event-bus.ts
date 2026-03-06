/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Typed event bus for cross-component communication.
 * Replaces React Context for decoupled publish/subscribe messaging.
 */

type Listener<T = unknown> = (data: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on<T = unknown>(event: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener);
    return () => set.delete(listener as Listener);
  }

  once<T = unknown>(event: string, listener: Listener<T>): () => void {
    const off = this.on<T>(event, (data) => {
      off();
      listener(data);
    });
    return off;
  }

  emit<T = unknown>(event: string, data: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      listener(data);
    }
  }

  off(event: string): void {
    this.listeners.delete(event);
  }

  clear(): void {
    this.listeners.clear();
  }
}

/** Global app-wide event bus instance */
export const bus = new EventBus();
