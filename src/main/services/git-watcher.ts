/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * GitWatcher - Event-driven Git repository monitoring
 *
 * Watches ONLY .git/ internals (HEAD, index, refs/, FETCH_HEAD, ORIG_HEAD)
 * to detect git state changes. Does NOT watch working tree files — that would
 * react to gitignored build artifacts, temp files, and OS-level phantom events,
 * causing unnecessary statusMatrix() scans and memory spikes.
 *
 * When .git internals change (commit, checkout, merge, rebase, stage, etc.),
 * emits a debounced 'change' event so the renderer can refresh git status.
 *
 * Implements an async queue to prevent git operation race conditions.
 */

import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { appendFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
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
 * Monitors .git/ internals and emits change events for status refresh
 */
export class GitWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private watchedPath: string | null = null;
  private queue: AsyncQueue;
  private logPath: string;
  private changeDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.queue = new AsyncQueue();
    this.logPath = join(homedir(), '.novi', 'logs', 'git-watcher.log');
    this.ensureLogDir();
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await mkdir(join(homedir(), '.novi', 'logs'), { recursive: true });
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
   * Start watching a repository's .git/ internals.
   * Only watches HEAD, index, refs/, FETCH_HEAD, ORIG_HEAD — the minimal set
   * needed to detect git state changes (commit, checkout, stage, merge, etc.).
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

    const gitDir = join(repoPath, '.git');

    // Watch only the specific .git/ files that change on git operations:
    //   HEAD       — branch switch, checkout
    //   index      — stage, unstage, commit
    //   refs/      — commit, push, pull, fetch, merge
    //   FETCH_HEAD — fetch, pull
    //   ORIG_HEAD  — merge, rebase
    const watchPaths = [
      join(gitDir, 'HEAD'),
      join(gitDir, 'index'),
      join(gitDir, 'refs'),
      join(gitDir, 'FETCH_HEAD'),
      join(gitDir, 'ORIG_HEAD'),
    ];

    this.watcher = watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      ignorePermissionErrors: true,
      // No awaitWriteFinish — .git files are written atomically by git
    });

    // Any change to .git internals → debounced 'change' event
    const handler = (path: string) => this.handleGitInternalChange(path);
    this.watcher.on('change', handler);
    this.watcher.on('add', handler);
    this.watcher.on('unlink', handler);

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
   * Handle .git/ internal file changes.
   * Debounced — git operations often touch multiple files (e.g. commit updates
   * both index and refs/), so we wait 500ms for the dust to settle before
   * emitting a single 'change' event.
   */
  private handleGitInternalChange(absolutePath: string): void {
    if (!this.watchedPath) return;

    const relativePath = relative(this.watchedPath, absolutePath);

    if (DEBUG_GIT_OPERATIONS) {
      console.log(`[GitWatcher] .git change detected: ${relativePath}`);
    }
    this.log('GIT_CHANGE', relativePath);

    // Debounce: git operations touch multiple .git files in rapid succession
    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer);
    }

    this.changeDebounceTimer = setTimeout(() => {
      this.changeDebounceTimer = null;
      this.emit('change', { type: 'git-internal', path: relativePath });
    }, 500);
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
