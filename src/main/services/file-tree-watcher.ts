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
  private watchedPathsKey: string = '';

  /**
   * Start watching only the root and currently expanded directories (no recursion into collapsed folders).
   * @param rootPath - Tree root directory
   * @param expandedPaths - Paths of expanded directories in the tree (direct children of root or deeper)
   */
  watch(rootPath: string, expandedPaths: string[] = []): void {
    // Don't watch empty, root, or drive root - avoids watching entire drive (noisy, EPERM on system dirs)
    const normalizedRoot = (rootPath || '').trim().replace(/\\/g, '/');
    if (!normalizedRoot || normalizedRoot === '/' || /^[A-Za-z]:\/?$/.test(normalizedRoot)) {
      this.stop();
      return;
    }

    // Only watch root + expanded dirs; each with depth 1 so we only see direct children (no recursion)
    const pathsToWatch = Array.from(new Set([rootPath, ...expandedPaths]));
    const pathsKey = pathsToWatch.slice().sort().join('\0');
    if (this.watcher && this.watchedPath === rootPath && this.watchedPathsKey === pathsKey) {
      return;
    }

    this.stop();
    this.watchedPath = rootPath;
    this.watchedPathsKey = pathsKey;

    console.log('[FileTreeWatcher] Starting watch (root + expanded only, depth 1):', pathsToWatch.length, 'paths');

    try {
      this.watcher = watch(pathsToWatch, {
        ignoreInitial: true,
        persistent: true,
        ignorePermissionErrors: true,
        depth: 1, // Only watch direct children of each path — no recursion into collapsed folders
        ignored: (path: string) => {
          const normalizedPath = path.replace(/\\/g, '/');
          const ignoredPatterns = [
            '/node_modules/',
            '/.git/',
            '/dist/',
            '/build/',
            '/.nova/',
          ];
          const ignoredFiles = ['.DS_Store', '.swp', '.swo'];
          for (const pattern of ignoredPatterns) {
            if (normalizedPath.includes(pattern)) return true;
          }
          const fileName = normalizedPath.split('/').pop() || '';
          for (const ignoredFile of ignoredFiles) {
            if (fileName.endsWith(ignoredFile)) return true;
          }
          if (fileName.startsWith('~') || fileName.match(/\.sw[op]$/)) return true;
          return false;
        },
      });

      this.watcher.on('add', (path: string) => {
        this.emit('change', { type: 'add', path });
      });

      this.watcher.on('unlink', (path: string) => {
        this.emit('change', { type: 'unlink', path });
      });

      this.watcher.on('addDir', (path: string) => {
        this.emit('change', { type: 'addDir', path });
      });

      this.watcher.on('unlinkDir', (path: string) => {
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
      this.watchedPathsKey = '';
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

