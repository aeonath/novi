/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * GitWatcher - Event-driven Git repository monitoring
 * Replaces polling with file system watching for better performance
 * Implements async queue to prevent git operation race conditions
 */

import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { appendFile, mkdir } from 'fs/promises';
import { join, relative } from 'path';

// Debug flag - set to true to enable verbose git operation logging
const DEBUG_GIT_OPERATIONS = false;

interface QueuedOperation<T> {
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  name: string;
}

/**
 * Async queue to serialize git operations
 * Prevents race conditions when multiple git commands run concurrently
 */
class AsyncQueue {
  private queue: QueuedOperation<any>[] = [];
  private processing = false;

  async enqueue<T>(name: string, operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject, name });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      if (DEBUG_GIT_OPERATIONS) {
        console.log(`[GitQueue] Processing: ${item.name}`);
      }

      try {
        const result = await item.operation();
        item.resolve(result);
      } catch (error) {
        console.error(`[GitQueue] Error in ${item.name}:`, error);
        item.reject(error as Error);
      }
    }

    this.processing = false;
  }

  get length(): number {
    return this.queue.length;
  }
}

/**
 * Git repository watcher
 * Monitors file changes and triggers git status updates on demand
 */
export class GitWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private watchedPath: string | null = null;
  private queue: AsyncQueue;
  private logPath: string;
  private changeDebounceTimer: NodeJS.Timeout | null = null;
  private changedFiles: Set<string> = new Set();

  constructor() {
    super();
    this.queue = new AsyncQueue();
    this.logPath = join(process.cwd(), 'logs', 'git-watcher.log');
    this.ensureLogDir();
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await mkdir(join(process.cwd(), 'logs'), { recursive: true });
    } catch (error) {
      console.error('[GitWatcher] Failed to create logs directory:', error);
    }
  }

  private async log(event: string, details: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${event}] ${details}\n`;
    
    try {
      await appendFile(this.logPath, entry);
    } catch (error) {
      console.error('[GitWatcher] Failed to write log:', error);
    }
  }

  /**
   * Start watching a repository directory
   */
  async watch(repoPath: string): Promise<void> {
    // Stop existing watcher if any
    if (this.watcher) {
      await this.unwatch();
    }

    this.watchedPath = repoPath;

    if (DEBUG_GIT_OPERATIONS) {
      console.log('[GitWatcher] Starting watch on:', repoPath);
    }
    await this.log('WATCH_START', repoPath);

    // Watch for file changes, ignoring .git directory and node_modules
    this.watcher = watch(repoPath, {
      ignored: [
        /(^|[\/\\])\../,           // Dot files/folders (except .git tracked below)
        /node_modules/,            // Node modules
        /\.git[\/\\](?!HEAD|refs|FETCH_HEAD|ORIG_HEAD)/, // .git except important files
        /dist/,                    // Build output
        /\.log$/,                  // Log files
      ],
      persistent: true,
      ignoreInitial: true,         // Don't fire events for existing files
      awaitWriteFinish: {          // Wait for file write to complete
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Handle file changes
    this.watcher.on('change', (path) => this.handleFileChange(path, 'modified'));
    this.watcher.on('add', (path) => this.handleFileChange(path, 'added'));
    this.watcher.on('unlink', (path) => this.handleFileChange(path, 'deleted'));

    // Handle errors
    this.watcher.on('error', (error: unknown) => {
      console.error('[GitWatcher] Watcher error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('ERROR', errorMsg);
      this.emit('error', error);
    });

    this.emit('watch-started', repoPath);
  }

  /**
   * Stop watching the current repository
   */
  async unwatch(): Promise<void> {
    const watcher = this.watcher;
    if (!watcher) return;

    if (DEBUG_GIT_OPERATIONS) {
      console.log('[GitWatcher] Stopping watch on:', this.watchedPath);
    }
    const pathToLog = this.watchedPath || 'unknown';
    this.watcher = null;
    this.watchedPath = null;
    this.changedFiles.clear();
    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer);
      this.changeDebounceTimer = null;
    }

    await this.log('WATCH_STOP', pathToLog);
    try {
      await watcher.close();
    } catch (err) {
      console.error('[GitWatcher] Error closing watcher:', err);
    }
    this.emit('watch-stopped');
  }

  /**
   * Handle file system change events
   */
  private handleFileChange(absolutePath: string, changeType: 'modified' | 'added' | 'deleted'): void {
    if (!this.watchedPath) return;

    // Get relative path from repo root
    const relativePath = relative(this.watchedPath, absolutePath);
    
    if (DEBUG_GIT_OPERATIONS) {
      console.log(`[GitWatcher] Change detected: ${changeType} - ${relativePath}`);
    }
    this.log('FILE_CHANGE', `${changeType}: ${relativePath}`);

    // Track changed file
    this.changedFiles.add(relativePath);

    // Emit immediate change event (for UI updates)
    this.emit('change', {
      type: changeType,
      path: relativePath,
      absolutePath,
    });

    // Debounce batch change event (for git status refresh)
    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer);
    }

    this.changeDebounceTimer = setTimeout(() => {
      const changes = Array.from(this.changedFiles);
      if (DEBUG_GIT_OPERATIONS) {
        console.log(`[GitWatcher] Batch change complete: ${changes.length} files`);
      }
      this.log('BATCH_CHANGE', `${changes.length} files: ${changes.join(', ')}`);
      
      this.emit('batch-change', changes);
      this.changedFiles.clear();
    }, 500); // 500ms debounce for batching rapid changes
  }

  /**
   * Enqueue a git operation to prevent race conditions
   * All git operations should go through this queue
   */
  async queueGitOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    return this.queue.enqueue(name, operation);
  }

  /**
   * Get current queue length (for monitoring)
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if currently watching a repository
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }

  /**
   * Get the currently watched path
   */
  getWatchedPath(): string | null {
    return this.watchedPath;
  }
}

// Singleton instance
export const gitWatcher = new GitWatcher();

