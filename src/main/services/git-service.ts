/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * GitService - Main process Git operations wrapper
 * Executes Git commands and logs all operations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { gitWatcher } from './git-watcher.js';
import { gitCredentialHelper } from './git-credential-helper.js';

const execAsync = promisify(exec);

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

  async getStatus(cwd: string): Promise<GitStatus> {
    return gitWatcher.queueGitOperation('get-status', async () => {
      try {
      // Check if it's a git repo
      const isRepoResult = await execAsync('git rev-parse --is-inside-work-tree', { cwd });
      const isRepo = isRepoResult.stdout.trim() === 'true';

      if (!isRepo) {
        await this.log('getStatus', `Not a git repository: ${cwd}`, true);
        return { isRepo: false, branch: null, files: [], ahead: 0, behind: 0 };
      }

      // Get current branch
      const branchResult = await execAsync('git branch --show-current', { cwd });
      const branch = branchResult.stdout.trim();

      // Get ahead/behind count
      let ahead = 0;
      let behind = 0;
      try {
        const trackingResult = await execAsync('git rev-list --left-right --count @{u}...HEAD', { cwd });
        const [behindStr, aheadStr] = trackingResult.stdout.trim().split('\t');
        behind = parseInt(behindStr, 10) || 0;
        ahead = parseInt(aheadStr, 10) || 0;
      } catch {
        // No upstream or tracking branch
      }

      // Get file status
      const statusResult = await execAsync('git status --porcelain', { cwd });
      const files = this.parseGitStatus(statusResult.stdout);

      await this.log('getStatus', `Branch: ${branch}, Files: ${files.length}`, true);
      
        return { isRepo: true, branch, files, ahead, behind };
      } catch (error) {
        await this.log('getStatus', `Error: ${error}`, false);
        return { isRepo: false, branch: null, files: [], ahead: 0, behind: 0 };
      }
    });
  }

  private parseGitStatus(output: string): GitFileStatus[] {
    const files: GitFileStatus[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.length < 4) continue;

      const statusCode = line.substring(0, 2);
      let filePath = line.substring(3);

      // Git may wrap paths with quotes if they contain spaces or special chars
      // Remove surrounding quotes if present
      if (filePath.startsWith('"') && filePath.endsWith('"')) {
        filePath = filePath.substring(1, filePath.length - 1);
        // Unescape any escaped characters (e.g., \" becomes ")
        filePath = filePath.replace(/\\(.)/g, '$1');
      }

      // Git status codes: XY where X=index (staged), Y=worktree (unstaged)
      const indexStatus = statusCode[0]; // Staged changes
      const worktreeStatus = statusCode[1]; // Unstaged changes

      // Handle untracked files
      if (statusCode === '??') {
        files.push({ path: filePath, status: 'untracked', staged: false });
        continue;
      }

      // Check if file has staged changes (index)
      if (indexStatus !== ' ' && indexStatus !== '?') {
        let stagedStatus: GitFileStatus['status'] = 'modified';
        if (indexStatus === 'A') stagedStatus = 'added';
        else if (indexStatus === 'D') stagedStatus = 'deleted';
        else if (indexStatus === 'R') stagedStatus = 'renamed';
        else if (indexStatus === 'M') stagedStatus = 'modified';
        
        files.push({ path: filePath, status: stagedStatus, staged: true });
      }

      // Check if file has unstaged changes (worktree)
      if (worktreeStatus !== ' ' && worktreeStatus !== '?') {
        let unstagedStatus: GitFileStatus['status'] = 'modified';
        if (worktreeStatus === 'A') unstagedStatus = 'added';
        else if (worktreeStatus === 'D') unstagedStatus = 'deleted';
        else if (worktreeStatus === 'R') unstagedStatus = 'renamed';
        else if (worktreeStatus === 'M') unstagedStatus = 'modified';
        
        files.push({ path: filePath, status: unstagedStatus, staged: false });
      }
    }

    return files;
  }

  async stageFile(cwd: string, filePath: string): Promise<boolean> {
    return gitWatcher.queueGitOperation('stage-file', async () => {
      try {
        // Use -- separator to indicate end of options and start of paths
        // This handles special characters and spaces more reliably
        if (DEBUG_GIT_OPERATIONS) {
          console.log(`[GitService] Staging file: ${filePath} in ${cwd}`);
        }
        await execAsync(`git add -- "${filePath}"`, { cwd });
        
        // Verify the file was actually staged by checking git status
        // We need to check both diff (for modified) and status (for new files)
        const statusResult = await execAsync(`git status --porcelain -- "${filePath}"`, { cwd });
        const statusLines = statusResult.stdout.trim().split('\n').filter(line => line.trim());
        
        if (statusLines.length === 0) {
          // File is not in git status at all - might already be committed
          if (DEBUG_GIT_OPERATIONS) {
            console.log(`[GitService] File not in git status (may be unchanged): ${filePath}`);
          }
          await this.log('stageFile', filePath, true);
          return true;
        }
        
        // Check if the file is staged (first character should not be space or ?)
        const firstStatusLine = statusLines[0];
        const statusCode = firstStatusLine.substring(0, 2);
        const isStaged = statusCode[0] !== ' ' && statusCode[0] !== '?';
        
        if (!isStaged) {
          console.warn(`[GitService] File appears not to be staged (status: ${statusCode}): ${filePath}`);
          await this.log('stageFile', `WARNING: File may not be staged (${statusCode}): ${filePath}`, false);
          return false;
        }
        
        await this.log('stageFile', filePath, true);
        if (DEBUG_GIT_OPERATIONS) {
          console.log(`[GitService] Successfully staged (${statusCode}): ${filePath}`);
        }
        return true;
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        console.error(`[GitService] Failed to stage ${filePath}:`, errorMsg);
        await this.log('stageFile', `Error for ${filePath}: ${errorMsg}`, false);
        return false;
      }
    });
  }

  async unstageFile(cwd: string, filePath: string): Promise<boolean> {
    return gitWatcher.queueGitOperation('unstage-file', async () => {
      try {
        if (DEBUG_GIT_OPERATIONS) {
          console.log(`[GitService] Unstaging file: ${filePath} in ${cwd}`);
        }
        await execAsync(`git reset HEAD -- "${filePath}"`, { cwd });
        await this.log('unstageFile', filePath, true);
        if (DEBUG_GIT_OPERATIONS) {
          console.log(`[GitService] Successfully unstaged: ${filePath}`);
        }
        return true;
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        console.error(`[GitService] Failed to unstage ${filePath}:`, errorMsg);
        await this.log('unstageFile', `Error for ${filePath}: ${errorMsg}`, false);
        return false;
      }
    });
  }

  /**
   * Pre-commit sanity check
   * Verifies repository state before allowing commit
   */
  async preCommitCheck(cwd: string): Promise<{ 
    canCommit: boolean; 
    stagedFiles: number; 
    unstagedFiles: number; 
    error?: string 
  }> {
    return gitWatcher.queueGitOperation('pre-commit-check', async () => {
      try {
        // Check if there are staged changes
        const statusResult = await execAsync('git diff --cached --name-only', { cwd });
        const stagedFiles = statusResult.stdout.trim().split('\n').filter(f => f).length;

        // Check for unstaged changes
        const unstagedResult = await execAsync('git diff --name-only', { cwd });
        const unstagedFiles = unstagedResult.stdout.trim().split('\n').filter(f => f).length;

        await this.log('preCommitCheck', `Staged: ${stagedFiles}, Unstaged: ${unstagedFiles}`, true);

        return {
          canCommit: stagedFiles > 0,
          stagedFiles,
          unstagedFiles,
        };
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        await this.log('preCommitCheck', `Error: ${errorMsg}`, false);
        return {
          canCommit: false,
          stagedFiles: 0,
          unstagedFiles: 0,
          error: errorMsg,
        };
      }
    });
  }

  async commit(cwd: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Run pre-commit check first
    const preCheck = await this.preCommitCheck(cwd);
    
    if (!preCheck.canCommit) {
      const error = preCheck.error || 'No staged changes to commit';
      await this.log('commit', `Pre-commit check failed: ${error}`, false);
      return { success: false, error };
    }

    if (DEBUG_GIT_OPERATIONS) {
      console.log('[Git] Pre-commit check passed, proceeding with commit');
    }

    return gitWatcher.queueGitOperation('commit', async () => {
      try {
        // Commit messages are optional per studio policy
        // Use --allow-empty-message flag when message is empty
        let commitCmd: string;
        if (message.trim() === '') {
          commitCmd = 'git commit --allow-empty-message -m ""';
          if (DEBUG_GIT_OPERATIONS) {
            console.log('[Git] Committing with empty message (per studio policy)');
          }
        } else {
          const escapedMessage = message.replace(/"/g, '\\"');
          commitCmd = `git commit -m "${escapedMessage}"`;
        }
        
        await execAsync(commitCmd, { cwd });
        await this.log('commit', message ? `Message: "${message}"` : 'Empty message commit', true);
        return { success: true };
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        await this.log('commit', `Error: ${errorMsg}`, false);
        return { success: false, error: errorMsg };
      }
    });
  }

  private isAuthenticationError(error: string): boolean {
    const authErrors = [
      'Authentication failed',
      'authentication',
      'Permission denied',
      'could not read Username',
      'could not read Password',
      'fatal: could not read',
      'Invalid username or password',
      'remote: Invalid credentials',
    ];
    const errorLower = error.toLowerCase();
    return authErrors.some(msg => errorLower.includes(msg.toLowerCase()));
  }

  private async getRemoteUrl(cwd: string): Promise<string | null> {
    try {
      const result = await execAsync('git remote get-url origin', { cwd });
      return result.stdout.trim();
    } catch {
      return null;
    }
  }

  private isHttpsRemote(remoteUrl: string): boolean {
    return remoteUrl.startsWith('https://') || remoteUrl.startsWith('http://');
  }

  private isSshRemote(remoteUrl: string): boolean {
    return remoteUrl.startsWith('git@') || remoteUrl.startsWith('ssh://');
  }

  private async getGitUsername(cwd: string): Promise<string> {
    try {
      // Try to get username from git config
      const result = await execAsync('git config user.name', { cwd });
      return result.stdout.trim() || 'git';
    } catch {
      // Fall back to 'git' as default
      return 'git';
    }
  }

  private async pushWithCredentials(cwd: string, password: string): Promise<void> {
    const remoteUrl = await this.getRemoteUrl(cwd);
    if (!remoteUrl) {
      throw new Error('No remote repository configured');
    }

    if (this.isHttpsRemote(remoteUrl)) {
      // For HTTPS, inject credentials into URL
      const username = await this.getGitUsername(cwd);
      const url = new URL(remoteUrl);
      url.username = encodeURIComponent(username);
      url.password = encodeURIComponent(password);
      const authUrl = url.toString();

      await execAsync(`git push "${authUrl}"`, { 
        cwd,
        env: { ...process.env, ...gitCredentialHelper.getCredentialEnvironment() }
      });
    } else if (this.isSshRemote(remoteUrl)) {
      // For SSH, use sshpass or expect the password to be the SSH key passphrase
      // We'll use GIT_SSH_COMMAND with setsid and pass the passphrase via stdin
      await execAsync('git push', {
        cwd,
        env: {
          ...process.env,
          GIT_SSH_COMMAND: `ssh -o StrictHostKeyChecking=no`,
          SSH_ASKPASS_REQUIRE: 'never',
          GIT_TERMINAL_PROMPT: '0',
        },
      });
    } else {
      throw new Error('Unsupported remote URL format');
    }
  }

  async push(cwd: string): Promise<{ success: boolean; error?: string; needsAuth?: boolean }> {
    return gitWatcher.queueGitOperation('push', async () => {
      try {
        // First attempt without credentials
        const result = await execAsync('git push', { 
          cwd,
          env: { ...process.env, ...gitCredentialHelper.getCredentialEnvironment() }
        });
        await this.log('push', result.stdout || 'Success', true);
        return { success: true };
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        
        // Check if this is an authentication error
        if (this.isAuthenticationError(errorMsg)) {
          if (DEBUG_GIT_OPERATIONS) {
            console.log('[Git] Push failed with authentication error, requesting credentials');
          }
          await this.log('push', 'Authentication required', false);
          
          try {
            // Request credentials from user via Nova UI
            const remoteUrl = await this.getRemoteUrl(cwd);
            const host = remoteUrl ? new URL(remoteUrl).host : 'remote repository';
            
            const credentials = await gitCredentialHelper.requestCredentials({
              type: 'password',
              prompt: `Enter credentials for ${host}`,
              host,
            });

            if (credentials.cancelled || !credentials.password) {
              await this.log('push', 'Authentication cancelled by user', false);
              return { success: false, error: 'Authentication cancelled' };
            }

            // Retry push with credentials
            await this.pushWithCredentials(cwd, credentials.password);
            await this.log('push', 'Success (with authentication)', true);
            return { success: true };
            
          } catch (retryError: any) {
            const retryErrorMsg = retryError.message || String(retryError);
            console.error('[Git] Push failed after authentication:', retryErrorMsg);
            await this.log('push', `Auth retry failed: ${retryErrorMsg}`, false);
            return { success: false, error: 'Authentication failed: ' + retryErrorMsg };
          }
        }
        
        // Not an auth error, just fail normally
        await this.log('push', `Error: ${errorMsg}`, false);
        return { success: false, error: errorMsg };
      }
    });
  }

  private async pullWithCredentials(cwd: string, password: string): Promise<void> {
    const remoteUrl = await this.getRemoteUrl(cwd);
    if (!remoteUrl) {
      throw new Error('No remote repository configured');
    }

    if (this.isHttpsRemote(remoteUrl)) {
      // For HTTPS, inject credentials into URL
      const username = await this.getGitUsername(cwd);
      const url = new URL(remoteUrl);
      url.username = encodeURIComponent(username);
      url.password = encodeURIComponent(password);
      const authUrl = url.toString();

      await execAsync(`git pull "${authUrl}"`, { 
        cwd,
        env: { ...process.env, ...gitCredentialHelper.getCredentialEnvironment() }
      });
    } else if (this.isSshRemote(remoteUrl)) {
      // For SSH, just try the pull (assuming ssh-agent has keys)
      await execAsync('git pull', {
        cwd,
        env: {
          ...process.env,
          GIT_SSH_COMMAND: `ssh -o StrictHostKeyChecking=no`,
          SSH_ASKPASS_REQUIRE: 'never',
          GIT_TERMINAL_PROMPT: '0',
        },
      });
    } else {
      throw new Error('Unsupported remote URL format');
    }
  }

  async pull(cwd: string): Promise<{ success: boolean; error?: string }> {
    return gitWatcher.queueGitOperation('pull', async () => {
      try {
        const result = await execAsync('git pull', { 
          cwd,
          env: { ...process.env, ...gitCredentialHelper.getCredentialEnvironment() }
        });
        await this.log('pull', result.stdout || 'Success', true);
        return { success: true };
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        
        // Check if this is an authentication error
        if (this.isAuthenticationError(errorMsg)) {
          if (DEBUG_GIT_OPERATIONS) {
            console.log('[Git] Pull failed with authentication error, requesting credentials');
          }
          await this.log('pull', 'Authentication required', false);
          
          try {
            const remoteUrl = await this.getRemoteUrl(cwd);
            const host = remoteUrl ? new URL(remoteUrl).host : 'remote repository';
            
            const credentials = await gitCredentialHelper.requestCredentials({
              type: 'password',
              prompt: `Enter credentials for ${host}`,
              host,
            });

            if (credentials.cancelled || !credentials.password) {
              await this.log('pull', 'Authentication cancelled by user', false);
              return { success: false, error: 'Authentication cancelled' };
            }

            await this.pullWithCredentials(cwd, credentials.password);
            await this.log('pull', 'Success (with authentication)', true);
            return { success: true };
            
          } catch (retryError: any) {
            const retryErrorMsg = retryError.message || String(retryError);
            console.error('[Git] Pull failed after authentication:', retryErrorMsg);
            await this.log('pull', `Auth retry failed: ${retryErrorMsg}`, false);
            return { success: false, error: 'Authentication failed: ' + retryErrorMsg };
          }
        }
        
        await this.log('pull', `Error: ${errorMsg}`, false);
        return { success: false, error: errorMsg };
      }
    });
  }

  async getDiff(cwd: string, filePath?: string): Promise<string> {
    return gitWatcher.queueGitOperation('get-diff', async () => {
      try {
        const cmd = filePath ? `git diff "${filePath}"` : 'git diff';
        const result = await execAsync(cmd, { cwd });
        await this.log('getDiff', filePath || 'all files', true);
        return result.stdout;
      } catch (error) {
        await this.log('getDiff', `Error: ${error}`, false);
        return '';
      }
    });
  }
}

export const gitService = new GitService();

