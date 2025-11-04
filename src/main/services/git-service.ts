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

const execAsync = promisify(exec);

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
  }

  private parseGitStatus(output: string): GitFileStatus[] {
    const files: GitFileStatus[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.length < 4) continue;

      const statusCode = line.substring(0, 2);
      const filePath = line.substring(3);

      let status: GitFileStatus['status'] = 'modified';
      let staged = false;

      // Parse status codes
      if (statusCode === '??') {
        status = 'untracked';
      } else if (statusCode[0] === 'A' || statusCode[1] === 'A') {
        status = 'added';
        staged = statusCode[0] !== ' ';
      } else if (statusCode[0] === 'D' || statusCode[1] === 'D') {
        status = 'deleted';
        staged = statusCode[0] !== ' ';
      } else if (statusCode[0] === 'R' || statusCode[1] === 'R') {
        status = 'renamed';
        staged = statusCode[0] !== ' ';
      } else if (statusCode[0] === 'M' || statusCode[1] === 'M') {
        status = 'modified';
        staged = statusCode[0] !== ' ';
      } else {
        staged = statusCode[0] !== ' ' && statusCode[0] !== '?';
      }

      files.push({ path: filePath, status, staged });
    }

    return files;
  }

  async stageFile(cwd: string, filePath: string): Promise<boolean> {
    try {
      await execAsync(`git add "${filePath}"`, { cwd });
      await this.log('stageFile', filePath, true);
      return true;
    } catch (error) {
      await this.log('stageFile', `Error: ${error}`, false);
      return false;
    }
  }

  async unstageFile(cwd: string, filePath: string): Promise<boolean> {
    try {
      await execAsync(`git reset HEAD "${filePath}"`, { cwd });
      await this.log('unstageFile', filePath, true);
      return true;
    } catch (error) {
      await this.log('unstageFile', `Error: ${error}`, false);
      return false;
    }
  }

  async commit(cwd: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const escapedMessage = message.replace(/"/g, '\\"');
      await execAsync(`git commit -m "${escapedMessage}"`, { cwd });
      await this.log('commit', `Message: "${message}"`, true);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      await this.log('commit', `Error: ${errorMsg}`, false);
      return { success: false, error: errorMsg };
    }
  }

  async push(cwd: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await execAsync('git push', { cwd });
      await this.log('push', result.stdout || 'Success', true);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      await this.log('push', `Error: ${errorMsg}`, false);
      return { success: false, error: errorMsg };
    }
  }

  async pull(cwd: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await execAsync('git pull', { cwd });
      await this.log('pull', result.stdout || 'Success', true);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      await this.log('pull', `Error: ${errorMsg}`, false);
      return { success: false, error: errorMsg };
    }
  }

  async getDiff(cwd: string, filePath?: string): Promise<string> {
    try {
      const cmd = filePath ? `git diff "${filePath}"` : 'git diff';
      const result = await execAsync(cmd, { cwd });
      await this.log('getDiff', filePath || 'all files', true);
      return result.stdout;
    } catch (error) {
      await this.log('getDiff', `Error: ${error}`, false);
      return '';
    }
  }
}

export const gitService = new GitService();

