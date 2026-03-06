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
import { appendFile, mkdir } from 'fs/promises';
import { gitCredentialHelper } from './git-credential-helper.js';

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

  constructor() {
    this.logPath = join(process.cwd(), 'logs', 'git.log');
    this.ensureLogDir();
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await mkdir(join(process.cwd(), 'logs'), { recursive: true });
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

  async getStatus(cwd: string): Promise<GitStatus> {
    try {
      // Only operate if .git is directly in the cwd — never walk parents
      const gitDir = join(cwd, '.git');
      if (!fs.existsSync(gitDir)) {
        return { isRepo: false, branch: null, files: [], ahead: 0, behind: 0 };
      }

      const branch = await git.currentBranch({ fs, dir: cwd }) || null;

      // statusMatrix returns [filepath, HEAD, WORKDIR, STAGE] tuples
      // HEAD: 0=absent, 1=present
      // WORKDIR: 0=absent, 2=present
      // STAGE: 0=absent, 1=matches HEAD, 2=differs from HEAD, 3=matches WORKDIR
      const matrix = await git.statusMatrix({ fs, dir: cwd });
      const files = this.parseStatusMatrix(matrix);

      const { ahead, behind } = await this.getAheadBehind(cwd, branch);

      await this.log('getStatus', `Branch: ${branch}, Files: ${files.length}`, true);
      return { isRepo: true, branch, files, ahead, behind };
    } catch (error) {
      await this.log('getStatus', `Error: ${error}`, false);
      return { isRepo: false, branch: null, files: [], ahead: 0, behind: 0 };
    }
  }

  private parseStatusMatrix(matrix: [string, number, number, number][]): GitFileStatus[] {
    const files: GitFileStatus[] = [];

    for (const [filepath, head, workdir, stage] of matrix) {
      // Skip unmodified files
      if (head === 1 && workdir === 1 && stage === 1) continue;

      // Untracked: not in HEAD, present in workdir, not staged
      if (head === 0 && workdir === 2 && stage === 0) {
        files.push({ path: filepath, status: 'untracked', staged: false });
        continue;
      }

      // Staged new file: not in HEAD, staged
      if (head === 0 && stage === 2) {
        files.push({ path: filepath, status: 'added', staged: true });
        // Also unstaged changes if workdir differs from stage
        if (workdir === 0) {
          files.push({ path: filepath, status: 'deleted', staged: false });
        }
        continue;
      }

      // Staged changes (file exists in HEAD)
      if (head === 1 && stage === 2) {
        files.push({ path: filepath, status: 'modified', staged: true });
      } else if (head === 1 && stage === 0) {
        files.push({ path: filepath, status: 'deleted', staged: true });
      }

      // Unstaged changes (workdir differs from stage or HEAD)
      if (head === 1 && workdir === 2 && stage === 1) {
        files.push({ path: filepath, status: 'modified', staged: false });
      } else if (head === 1 && workdir === 0 && stage === 1) {
        files.push({ path: filepath, status: 'deleted', staged: false });
      }
    }

    return files;
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

  private async getAheadBehind(cwd: string, branch: string | null): Promise<{ ahead: number; behind: number }> {
    if (!branch) return { ahead: 0, behind: 0 };

    try {
      // Get the remote tracking branch
      const remote = await git.getConfig({ fs, dir: cwd, path: `branch.${branch}.remote` });
      const merge = await git.getConfig({ fs, dir: cwd, path: `branch.${branch}.merge` });
      if (!remote || !merge) return { ahead: 0, behind: 0 };

      const remoteBranch = merge.replace('refs/heads/', '');
      const remoteRef = `refs/remotes/${remote}/${remoteBranch}`;

      let localOid: string;
      let remoteOid: string;
      try {
        localOid = await git.resolveRef({ fs, dir: cwd, ref: branch });
        remoteOid = await git.resolveRef({ fs, dir: cwd, ref: remoteRef });
      } catch {
        return { ahead: 0, behind: 0 };
      }

      if (localOid === remoteOid) return { ahead: 0, behind: 0 };

      // Count commits ahead/behind by walking logs
      const [localLog, remoteLog] = await Promise.all([
        git.log({ fs, dir: cwd, ref: branch, depth: 100 }),
        git.log({ fs, dir: cwd, ref: remoteRef, depth: 100 }),
      ]);

      const remoteOids = new Set(remoteLog.map(c => c.oid));
      const localOids = new Set(localLog.map(c => c.oid));

      const ahead = localLog.filter(c => !remoteOids.has(c.oid)).length;
      const behind = remoteLog.filter(c => !localOids.has(c.oid)).length;

      return { ahead, behind };
    } catch {
      return { ahead: 0, behind: 0 };
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
