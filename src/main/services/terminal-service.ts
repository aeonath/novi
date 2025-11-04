/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Terminal Service - Manages terminal sessions using node-pty
 * Provides full pseudo-terminal support for interactive shells and TUI applications
 */

import * as pty from '@lydell/node-pty';
import { existsSync } from 'node:fs';
import { logInfo, logError } from '../logger';

export interface TerminalSession {
  id: string;
  pty: pty.IPty;
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
   * Create a new terminal session with PTY
   */
  createSession(cwd?: string, cols = 120, rows = 30, customId?: string): string {
    const id = customId || `terminal-${this.nextId++}`;
    const shellPath = this.getBashPath();
    const cwdPath = cwd || process.cwd();

    logInfo(`[TerminalService] Creating PTY session ${id} with shell: ${shellPath}, cwd: ${cwdPath}, dimensions: ${cols}x${rows}`);

    // Spawn PTY process
    const ptyProcess = pty.spawn(shellPath, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwdPath,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        COLUMNS: String(cols),
        LINES: String(rows),
      },
    });

    const session: TerminalSession = {
      id,
      pty: ptyProcess,
      cols,
      rows,
      cwd,
    };

    this.sessions.set(id, session);

    // Handle process exit
    ptyProcess.onExit((e) => {
      logInfo(`[TerminalService] Terminal ${id} exited with code ${e.exitCode}, signal ${e.signal}`);
      this.sessions.delete(id);
    });

    logInfo(`[TerminalService] PTY session ${id} created successfully (PID: ${ptyProcess.pid})`);
    return id;
  }

  /**
   * Write data to terminal input
   */
  writeToTerminal(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (!session) {
      logError(`[TerminalService] Terminal ${id} not found`);
      return false;
    }

    try {
      session.pty.write(data);
      return true;
    } catch (error) {
      logError(`[TerminalService] Failed to write to terminal ${id}:`, error);
      return false;
    }
  }

  /**
   * Resize terminal (full PTY support)
   */
  resizeTerminal(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session) {
      logError(`[TerminalService] Terminal ${id} not found`);
      return false;
    }

    try {
      // Resize the PTY (sends SIGWINCH to shell)
      session.pty.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      return true;
    } catch (error) {
      logError(`[TerminalService] Failed to resize terminal ${id}:`, error);
      return false;
    }
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
      session.pty.kill();
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
        session.pty.kill();
      } catch (error) {
        logError(`[TerminalService] Error killing terminal ${id}:`, error);
      }
    }
    this.sessions.clear();
  }
}

export const terminalService = new TerminalService();

