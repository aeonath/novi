/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * FileTreeWatcher - File system monitoring for FileTree
 * Watches workspace directory and notifies renderer of file changes
 */

import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';

export class FileTreeWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private watchedPath: string | null = null;

  /**
   * Start watching a directory
   */
  watch(dirPath: string): void {
    if (this.watchedPath === dirPath && this.watcher) {
      console.log('[FileTreeWatcher] Already watching:', dirPath);
      return;
    }

    // Don't watch drive root (C:\, D:\) - causes EPERM on system dirs
    const normalized = dirPath.replace(/\\/g, '/');
    if (/^[A-Za-z]:\/?$/.test(normalized)) {
      this.stop();
      return;
    }

    // Stop existing watcher
    this.stop();

    console.log('[FileTreeWatcher] Starting watch:', dirPath);
    this.watchedPath = dirPath;

    try {
      this.watcher = watch(dirPath, {
        ignoreInitial: true,
        persistent: true,
        ignorePermissionErrors: true,
        ignored: (path: string) => {
          // Normalize path to use forward slashes
          const normalizedPath = path.replace(/\\/g, '/');
          
          // Check if path contains any ignored patterns
          const ignoredPatterns = [
            '/node_modules/',
            '/.git/',
            '/dist/',
            '/build/',
            '/.nova/',
          ];
          
          // Also ignore specific files
          const ignoredFiles = [
            '.DS_Store',
            '.swp',
            '.swo',
          ];
          
          // Check if path contains any ignored directory
          for (const pattern of ignoredPatterns) {
            if (normalizedPath.includes(pattern)) {
              return true;
            }
          }
          
          // Check if filename matches ignored files
          const fileName = normalizedPath.split('/').pop() || '';
          for (const ignoredFile of ignoredFiles) {
            if (fileName.endsWith(ignoredFile)) {
              return true;
            }
          }
          
          // Check for vim swap files
          if (fileName.startsWith('~') || fileName.match(/\.sw[op]$/)) {
            return true;
          }
          
          return false;
        },
        depth: 10, // Reasonable depth limit
      });

      this.watcher.on('add', (path: string) => {
        console.log('[FileTreeWatcher] File added:', path);
        this.emit('change', { type: 'add', path });
      });

      this.watcher.on('unlink', (path: string) => {
        console.log('[FileTreeWatcher] File removed:', path);
        this.emit('change', { type: 'unlink', path });
      });

      this.watcher.on('addDir', (path: string) => {
        console.log('[FileTreeWatcher] Directory added:', path);
        this.emit('change', { type: 'addDir', path });
      });

      this.watcher.on('unlinkDir', (path: string) => {
        console.log('[FileTreeWatcher] Directory removed:', path);
        this.emit('change', { type: 'unlinkDir', path });
      });

      this.watcher.on('change', () => {
        // We don't need to refresh tree on file content changes
        // Only on add/remove operations
      });

      this.watcher.on('error', (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[FileTreeWatcher] Error:', errorMessage);
        this.emit('error', error);
      });

      console.log('[FileTreeWatcher] Watch started successfully');
    } catch (error) {
      console.error('[FileTreeWatcher] Failed to start watching:', error);
      this.emit('error', error);
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher) {
      console.log('[FileTreeWatcher] Stopping watch:', this.watchedPath);
      this.watcher.close();
      this.watcher = null;
      this.watchedPath = null;
    }
  }

  /**
   * Get currently watched path
   */
  getWatchedPath(): string | null {
    return this.watchedPath;
  }
}

// Singleton instance
export const fileTreeWatcher = new FileTreeWatcher();

