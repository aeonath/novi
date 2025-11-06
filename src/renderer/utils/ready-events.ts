/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Event-driven readiness system for component initialization
 * Eliminates the need for setTimeout by using proper event signaling
 */

export type ReadyEventType = 
  | 'monaco-ready'
  | 'tabbar-ready'
  | 'filetree-ready'
  | 'terminal-ready'
  | 'statusbar-ready';

/**
 * Wait for a component to signal it's ready
 * Returns a promise that resolves when the event fires
 */
export function waitForReady(eventType: ReadyEventType, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    const handler = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      window.removeEventListener(eventType, handler);
      console.log(`[ReadyEvents] Received: ${eventType}`);
      resolve();
    };

    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener(eventType, handler);
      console.warn(`[ReadyEvents] Timeout waiting for ${eventType} after ${timeoutMs}ms`);
      reject(new Error(`Timeout waiting for ${eventType} after ${timeoutMs}ms`));
    }, timeoutMs);

    window.addEventListener(eventType, handler, { once: true });
  });
}

/**
 * Wait for multiple components to be ready
 * Returns a promise that resolves when all events have fired
 */
export async function waitForMultipleReady(
  eventTypes: ReadyEventType[],
  timeoutMs = 5000
): Promise<void> {
  // Use ensureReady to handle case where events already fired
  await Promise.all(eventTypes.map(type => ensureReady(type, timeoutMs)));
}

/**
 * Signal that a component is ready
 */
export function signalReady(eventType: ReadyEventType, detail?: any): void {
  console.log(`[ReadyEvents] Signaling: ${eventType}`, detail || '');
  window.dispatchEvent(new CustomEvent(eventType, { detail }));
}

/**
 * Check if a component has already signaled ready
 * Uses a global registry to track ready state
 */
const readyStates = new Set<ReadyEventType>();

export function markReady(eventType: ReadyEventType): void {
  // Only signal if not already marked ready (prevents duplicate signals)
  if (!readyStates.has(eventType)) {
    readyStates.add(eventType);
    signalReady(eventType);
    console.log(`[ReadyEvents] Marked ready: ${eventType}`);
  } else {
    console.log(`[ReadyEvents] Already ready (skipping duplicate): ${eventType}`);
  }
}

export function isReady(eventType: ReadyEventType): boolean {
  return readyStates.has(eventType);
}

export function clearReady(eventType: ReadyEventType): void {
  readyStates.delete(eventType);
}

/**
 * Wait for a component to be ready, or resolve immediately if already ready
 */
export async function ensureReady(eventType: ReadyEventType, timeoutMs = 5000): Promise<void> {
  if (isReady(eventType)) {
    console.log(`[ReadyEvents] ${eventType} already ready`);
    return Promise.resolve();
  }
  return waitForReady(eventType, timeoutMs);
}

