/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Terminal Service - Manages terminal sessions using child_process
 * Uses bash.exe from Git for Windows as fallback since node-pty requires native compilation
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'node:fs';
import { logInfo, logError } from '../logger';

export interface TerminalSession {
  id: string;
  process: ChildProcess;
  cols: number;
  rows: number;
  cwd?: string;
}

class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private nextId = 1;

  /**
   * Get bash.exe path - try Git for Windows first, then fallback to system bash
   */
  private getBashPath(): string {
    // Try Git for Windows bash first (as per task requirements)
    const gitBashPaths = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    ];

    for (const path of gitBashPaths) {
      if (existsSync(path)) {
        logInfo(`[TerminalService] Using Git bash: ${path}`);
        return path;
      }
    }

    // Fallback to system bash or cmd.exe
    if (existsSync('C:\\Windows\\System32\\bash.exe')) {
      logInfo('[TerminalService] Using system bash');
      return 'C:\\Windows\\System32\\bash.exe';
    }

    // Last resort: use cmd.exe
    logInfo('[TerminalService] Using cmd.exe as fallback');
    return 'C:\\Windows\\System32\\cmd.exe';
  }

  /**
   * Create a new terminal session
   */
  createSession(cwd?: string, cols = 80, rows = 24): string {
    const id = `terminal-${this.nextId++}`;
    const bashPath = this.getBashPath();

    logInfo(`[TerminalService] Creating terminal session ${id} with cwd: ${cwd || 'default'}`);

    // Spawn bash/cmd process
    const cwdPath = cwd || process.cwd();
    
    // Determine shell arguments
    const shellArgs: string[] = [];
    const isCmdExe = bashPath.toLowerCase().includes('cmd.exe');
    
    if (!isCmdExe) {
      // For bash: use -i for interactive mode
      shellArgs.push('-i');
    }
    
    const childProcess = spawn(bashPath, shellArgs, {
      cwd: cwdPath,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        PS1: '$ ', // Simple prompt for bash
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    const session: TerminalSession = {
      id,
      process: childProcess,
      cols,
      rows,
      cwd,
    };

    this.sessions.set(id, session);

    // Handle process exit
    childProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      logInfo(`[TerminalService] Terminal ${id} exited with code ${code}, signal ${signal}`);
      this.sessions.delete(id);
    });

    // Handle errors
    childProcess.on('error', (error: Error) => {
      logError(`[TerminalService] Terminal ${id} error:`, error);
      this.sessions.delete(id);
    });

    return id;
  }

  /**
   * Write data to terminal input
   */
  writeToTerminal(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (!session || !session.process.stdin) {
      logError(`[TerminalService] Terminal ${id} not found or stdin unavailable`);
      return false;
    }

    try {
      session.process.stdin.write(data);
      return true;
    } catch (error) {
      logError(`[TerminalService] Failed to write to terminal ${id}:`, error);
      return false;
    }
  }

  /**
   * Resize terminal
   */
  resizeTerminal(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session) {
      logError(`[TerminalService] Terminal ${id} not found`);
      return false;
    }

    session.cols = cols;
    session.rows = rows;

    // Note: child_process.spawn doesn't support resize on Windows the same way PTY does
    // This is a limitation, but the terminal will still function
    logInfo(`[TerminalService] Terminal ${id} resize requested: ${cols}x${rows}`);
    return true;
  }

  /**
   * Kill terminal session
   */
  killSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) {
      logError(`[TerminalService] Terminal ${id} not found`);
      return false;
    }

    try {
      session.process.kill();
      this.sessions.delete(id);
      logInfo(`[TerminalService] Terminal ${id} killed`);
      return true;
    } catch (error) {
      logError(`[TerminalService] Failed to kill terminal ${id}:`, error);
      return false;
    }
  }

  /**
   * Get terminal session
   */
  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup all sessions
   */
  cleanup(): void {
    logInfo(`[TerminalService] Cleaning up ${this.sessions.size} terminal sessions`);
    for (const [id, session] of this.sessions.entries()) {
      try {
        session.process.kill();
      } catch (error) {
        logError(`[TerminalService] Error killing terminal ${id}:`, error);
      }
    }
    this.sessions.clear();
  }
}

export const terminalService = new TerminalService();

