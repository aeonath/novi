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

export interface CreateSessionOptions {
  /** Reserved for future use; we do not modify the user's PATH */
  _reserved?: unknown;
}

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
   * Get shell path - platform-aware detection
   */
  private getShellPath(): string {
    if (process.platform !== 'win32') {
      // Linux / macOS: prefer $SHELL, then common paths
      const userShell = process.env.SHELL;
      if (userShell && existsSync(userShell)) {
        logInfo(`[TerminalService] Using user shell: ${userShell}`);
        return userShell;
      }
      for (const sh of ['/bin/bash', '/usr/bin/bash', '/bin/sh']) {
        if (existsSync(sh)) {
          logInfo(`[TerminalService] Using fallback shell: ${sh}`);
          return sh;
        }
      }
      logInfo('[TerminalService] Using /bin/sh as last resort');
      return '/bin/sh';
    }

    // Windows: try Git for Windows bash first
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

    if (existsSync('C:\\Windows\\System32\\bash.exe')) {
      logInfo('[TerminalService] Using system bash');
      return 'C:\\Windows\\System32\\bash.exe';
    }

    logInfo('[TerminalService] Using cmd.exe as fallback');
    return 'C:\\Windows\\System32\\cmd.exe';
  }

  /**
   * Create a new terminal session with PTY
   */
  createSession(cwd?: string, cols = 120, rows = 30, customId?: string, _options?: CreateSessionOptions): string {
    const id = customId || `terminal-${this.nextId++}`;
    const shellPath = this.getShellPath();
    const cwdPath = cwd || process.cwd();

    const baseEnv = { ...process.env };
    // Use OSC 7 to report CWD — an invisible escape sequence that xterm.js
    // silently consumes, unlike the old 'echo' approach which produced visible
    // text that had to be regex-stripped and left orphaned ConPTY cursor
    // sequences that corrupted vim/TUI screen restoration.
    const promptCommand = 'printf "\\033]7;file://localhost%s\\007" "$PWD"';

    logInfo(`[TerminalService] Creating PTY session ${id} with shell: ${shellPath}, cwd: ${cwdPath}, dimensions: ${cols}x${rows}`);

    const ptyProcess = pty.spawn(shellPath, ['--login', '-i'], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwdPath,
      env: {
        ...baseEnv,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
        LC_CTYPE: 'C.UTF-8',
        LESSCHARSET: 'utf-8',
        PROMPT_COMMAND: promptCommand,
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

    logInfo(`[TerminalService] PTY session ${id} created successfully (PID: ${ptyProcess.pid}, dimensions: ${cols}x${rows})`);
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

