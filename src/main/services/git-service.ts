/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * GitService - Main process Git operations using isomorphic-git
 * Pure JavaScript git implementation — no dependency on git CLI
 */

import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import * as fs from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { appendFile, mkdir } from 'fs/promises';
import { Worker } from 'worker_threads';
import { gitCredentialHelper } from './git-credential-helper.js';

const EMPTY_STATUS: GitStatus = { isRepo: false, branch: null, files: [], ahead: 0, behind: 0 };

// Debug flag - set to true to enable verbose git operation logging
const DEBUG_GIT_OPERATIONS = false;

export interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'staged';
  staged: boolean;
}

class GitService {
  private logPath: string;
  private activeStatusRequest: { worker: Worker; resolve: (status: GitStatus) => void } | null = null;

  constructor() {
    this.logPath = join(homedir(), '.novi', 'logs', 'git.log');
    this.ensureLogDir();
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await mkdir(join(homedir(), '.novi', 'logs'), { recursive: true });
    } catch (error) {
      console.error('[GitService] Failed to create logs directory:', error);
    }
  }

  private async log(operation: string, details: string, success: boolean): Promise<void> {
    const timestamp = new Date().toISOString();
    const status = success ? 'SUCCESS' : 'FAILURE';
    const entry = `[${timestamp}] [${status}] ${operation}: ${details}\n`;

    try {
      await appendFile(this.logPath, entry);
    } catch (error) {
      console.error('[GitService] Failed to write log:', error);
    }
  }

  /**
   * Find the git repo root for a given directory, walking up parent dirs.
   * Returns null if not inside a git repository.
   */
  async findRoot(cwd: string): Promise<string | null> {
    try {
      return await git.findRoot({ fs, filepath: cwd });
    } catch {
      return null;
    }
  }

  /**
   * Runs the statusMatrix() walk in a worker thread so a huge repository can
   * never block the main process (menus, IPC, terminal input all stay responsive
   * regardless of scan duration). Only one scan runs at a time — a new request
   * (e.g. rapid `cd` in a terminal) terminates the previous one outright rather
   * than letting it keep burning CPU for a directory we no longer care about.
   */
  async getStatus(cwd: string): Promise<GitStatus> {
    // Only operate if .git is directly in the cwd — never walk parents
    const gitDir = join(cwd, '.git');
    if (!fs.existsSync(gitDir)) {
      return EMPTY_STATUS;
    }

    this.cancelActiveStatus();

    return new Promise<GitStatus>((resolve) => {
      const worker = new Worker(join(__dirname, 'git-status-worker.js'), { workerData: { cwd } });

      const settle = (status: GitStatus) => {
        if (this.activeStatusRequest?.worker === worker) this.activeStatusRequest = null;
        resolve(status);
      };

      this.activeStatusRequest = { worker, resolve: settle };

      worker.once('message', (msg: { ok: boolean; status?: GitStatus; error?: string }) => {
        void worker.terminate();
        if (msg.ok && msg.status) {
          void this.log('getStatus', `Branch: ${msg.status.branch}, Files: ${msg.status.files.length}`, true);
          settle(msg.status);
        } else {
          void this.log('getStatus', `Error: ${msg.error}`, false);
          settle(EMPTY_STATUS);
        }
      });

      worker.once('error', (err) => {
        void this.log('getStatus', `Worker error: ${err.message}`, false);
        settle(EMPTY_STATUS);
      });
    });
  }

  /**
   * Cancels any in-flight statusMatrix() scan, terminating its worker thread
   * immediately (true preemption — unlike a promise cancellation, this stops
   * a scan mid-walk instead of waiting for it to finish). Used both when a
   * newer status request supersedes an older one, and when git support is
   * toggled off in Settings so a running scan doesn't keep the app busy.
   */
  cancelActiveStatus(): void {
    const stale = this.activeStatusRequest;
    if (!stale) return;
    this.activeStatusRequest = null;
    stale.resolve(EMPTY_STATUS);
    void stale.worker.terminate();
  }

  /**
   * Lightweight fetch of just the current branch's remote ref.
   * Updates refs/remotes/origin/<branch> so ahead/behind is accurate after push/pull.
   */
  private async fetchRemoteRef(dir: string): Promise<void> {
    try {
      const branch = await git.currentBranch({ fs, dir });
      if (!branch) return;
      const remote = await git.getConfig({ fs, dir, path: `branch.${branch}.remote` });
      if (!remote) return;
      await git.fetch({
        fs,
        http,
        dir,
        remote,
        ref: branch,
        singleBranch: true,
        onAuth: (url) => this.handleAuth(url, dir),
      });
    } catch {
      // Non-critical — status will just show stale ahead/behind
    }
  }

  async stageFile(cwd: string, filePath: string): Promise<boolean> {
    try {
      const root = await this.findRoot(cwd) || cwd;
      if (DEBUG_GIT_OPERATIONS) {
        console.log(`[GitService] Staging file: ${filePath} in ${root}`);
      }

      // Check if file exists — if not, it's a delete that needs to be staged
      const fullPath = join(root, filePath);
      if (fs.existsSync(fullPath)) {
        await git.add({ fs, dir: root, filepath: filePath });
      } else {
        await git.remove({ fs, dir: root, filepath: filePath });
      }

      await this.log('stageFile', filePath, true);
      return true;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`[GitService] Failed to stage ${filePath}:`, errorMsg);
      await this.log('stageFile', `Error for ${filePath}: ${errorMsg}`, false);
      return false;
    }
  }

  async unstageFile(cwd: string, filePath: string): Promise<boolean> {
    try {
      const root = await this.findRoot(cwd) || cwd;
      if (DEBUG_GIT_OPERATIONS) {
        console.log(`[GitService] Unstaging file: ${filePath} in ${root}`);
      }

      // Reset the file in the index to match HEAD
      await git.resetIndex({ fs, dir: root, filepath: filePath });

      await this.log('unstageFile', filePath, true);
      return true;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`[GitService] Failed to unstage ${filePath}:`, errorMsg);
      await this.log('unstageFile', `Error for ${filePath}: ${errorMsg}`, false);
      return false;
    }
  }

  async commit(cwd: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const root = await this.findRoot(cwd) || cwd;
      const name = await git.getConfig({ fs, dir: root, path: 'user.name' }) || 'Unknown';
      const email = await git.getConfig({ fs, dir: root, path: 'user.email' }) || 'unknown@unknown';

      await git.commit({
        fs,
        dir: root,
        message: message || '',
        author: { name, email },
      });

      await this.log('commit', message ? `Message: "${message}"` : 'Empty message commit', true);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      await this.log('commit', `Error: ${errorMsg}`, false);
      return { success: false, error: errorMsg };
    }
  }

  async push(cwd: string): Promise<{ success: boolean; error?: string }> {
    try {
      const root = await this.findRoot(cwd) || cwd;
      await git.push({
        fs,
        http,
        dir: root,
        onAuth: (url) => this.handleAuth(url, root),
        onAuthFailure: (url) => this.handleAuthRetry(url, root),
      });

      // Update remote tracking ref so ahead/behind counts refresh
      await this.fetchRemoteRef(root);

      await this.log('push', 'Success', true);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error('[GitService] Push failed:', errorMsg);
      await this.log('push', `Error: ${errorMsg}`, false);
      return { success: false, error: errorMsg };
    }
  }

  async pull(cwd: string): Promise<{ success: boolean; error?: string }> {
    try {
      const root = await this.findRoot(cwd) || cwd;
      const name = await git.getConfig({ fs, dir: root, path: 'user.name' }) || 'Unknown';
      const email = await git.getConfig({ fs, dir: root, path: 'user.email' }) || 'unknown@unknown';

      await git.pull({
        fs,
        http,
        dir: root,
        author: { name, email },
        onAuth: (url) => this.handleAuth(url, root),
        onAuthFailure: (url) => this.handleAuthRetry(url, root),
      });

      await this.log('pull', 'Success', true);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error('[GitService] Pull failed:', errorMsg);
      await this.log('pull', `Error: ${errorMsg}`, false);
      return { success: false, error: errorMsg };
    }
  }

  async getDiff(_cwd: string, _filePath?: string): Promise<string> {
    // Diff not implemented yet — will be added in a future sprint
    return '';
  }

  // --- Authentication ---

  private async handleAuth(url: string, cwd: string): Promise<{ username: string; password?: string } | { cancel: true }> {
    try {
      // Try to get stored credentials or config-based auth
      const remoteUrl = await git.getConfig({ fs, dir: cwd, path: 'remote.origin.url' }) || url;

      // For SSH URLs, provide username 'git'
      if (remoteUrl.startsWith('git@') || remoteUrl.startsWith('ssh://')) {
        return { username: 'git' };
      }

      // For HTTPS, try without credentials first (credential manager may handle it)
      return { username: 'git' };
    } catch {
      return { username: 'git' };
    }
  }

  private async handleAuthRetry(url: string, _cwd: string): Promise<{ username: string; password: string } | { cancel: true }> {
    try {
      const host = this.extractHost(url);

      const credentials = await gitCredentialHelper.requestCredentials({
        type: 'password',
        prompt: host,
        host,
      });

      if (credentials.cancelled || !credentials.password) {
        return { cancel: true };
      }

      return {
        username: credentials.username || 'git',
        password: credentials.password,
      };
    } catch {
      return { cancel: true };
    }
  }

  private extractHost(url: string): string {
    try {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        return new URL(url).host;
      }
      if (url.startsWith('git@')) {
        const match = url.match(/^[^@]+@([^:]+):/);
        return match ? match[1] : 'remote repository';
      }
      if (url.startsWith('ssh://')) {
        return new URL(url).host;
      }
      return 'remote repository';
    } catch {
      return 'remote repository';
    }
  }
}

export const gitService = new GitService();
