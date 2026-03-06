/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * EditorFileWatcher - Watches files open in the editor for external changes.
 * Completely independent of the file tree watcher.
 * Uses fs.watch() to monitor individual file paths.
 */

import { watch, FSWatcher } from 'fs';
import { EventEmitter } from 'events';

export class EditorFileWatcher extends EventEmitter {
  private watchers = new Map<string, FSWatcher>();
  /** Tracks our own saves so we can ignore the resulting fs event */
  private recentSaves = new Set<string>();

  /**
   * Start watching a file for external changes.
   */
  watchFile(filePath: string): void {
    const normalized = filePath.replace(/\\/g, '/');
    if (this.watchers.has(normalized)) return;

    try {
      const watcher = watch(filePath, { persistent: false }, (eventType) => {
        if (eventType === 'change') {
          // Skip if this change was triggered by our own save
          if (this.recentSaves.has(normalized)) return;
          this.emit('file-changed', filePath);
        }
      });

      watcher.on('error', (err) => {
        console.error('[EditorFileWatcher] Error watching', filePath, err.message);
        this.unwatchFile(filePath);
      });

      this.watchers.set(normalized, watcher);
    } catch (err) {
      console.error('[EditorFileWatcher] Failed to watch', filePath, err);
    }
  }

  /**
   * Stop watching a file.
   */
  unwatchFile(filePath: string): void {
    const normalized = filePath.replace(/\\/g, '/');
    const watcher = this.watchers.get(normalized);
    if (watcher) {
      watcher.close();
      this.watchers.delete(normalized);
    }
    this.recentSaves.delete(normalized);
  }

  /**
   * Mark a file as being saved by us, so the next fs event is ignored.
   * The suppression clears after a short delay.
   */
  markSaved(filePath: string): void {
    const normalized = filePath.replace(/\\/g, '/');
    this.recentSaves.add(normalized);
    setTimeout(() => {
      this.recentSaves.delete(normalized);
    }, 2000);
  }

  /**
   * Stop all watchers.
   */
  stopAll(): void {
    for (const [, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.recentSaves.clear();
  }
}

export const editorFileWatcher = new EditorFileWatcher();
