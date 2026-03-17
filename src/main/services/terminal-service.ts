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
import { homedir } from 'node:os';
import { basename } from 'node:path';
import { logInfo, logError } from '../logger';

export type ShellType = 'gitbash' | 'cmd' | 'powershell' | 'wsl' | 'linux';

export const DEFAULT_GITBASH_PATH = 'C:\\Program Files\\Git\\bin\\bash.exe';

export interface CreateSessionOptions {
  /** Override the shell for this session */
  shellType?: ShellType;
  shellPath?: string;
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
  private configuredShellType: ShellType = 'gitbash';
  private configuredShellPath: string = DEFAULT_GITBASH_PATH;
  private shellFallbackCallback?: (type: ShellType, path: string) => void;

  /**
   * Set the configured shell for new terminals
   */
  setShell(type: ShellType, path?: string): void {
    this.configuredShellType = type;
    if (path) this.configuredShellPath = path;
    logInfo(`[TerminalService] Shell configured: type=${type}, path=${path || '(default)'}`);
  }

  /**
   * Register a callback invoked when the shell falls back to a different type
   * (e.g. git bash not found → PowerShell). Allows the caller to persist the
   * effective shell settings so subsequent sessions use the correct type.
   */
  onShellFallback(cb: (type: ShellType, path: string) => void): void {
    this.shellFallbackCallback = cb;
  }

  getShellType(): ShellType { return this.configuredShellType; }
  getShellPathConfig(): string { return this.configuredShellPath; }

  /**
   * Resolve shell executable path from type
   */
  resolveShellPath(type?: ShellType, customPath?: string): string {
    const shellType = type || this.configuredShellType;

    if (process.platform !== 'win32' || shellType === 'linux') {
      // Linux: use custom path if provided, otherwise detect
      const linuxPath = customPath || this.configuredShellPath;
      if (shellType === 'linux' && linuxPath && existsSync(linuxPath)) {
        logInfo(`[TerminalService] Using configured Linux shell: ${linuxPath}`);
        return linuxPath;
      }
      const userShell = process.env.SHELL;
      if (userShell && existsSync(userShell)) {
        logInfo(`[TerminalService] Using user shell: ${userShell}`);
        return userShell;
      }
      for (const sh of ['/bin/bash', '/usr/bin/bash', '/bin/zsh', '/bin/sh']) {
        if (existsSync(sh)) {
          logInfo(`[TerminalService] Using fallback shell: ${sh}`);
          return sh;
        }
      }
      logInfo('[TerminalService] Using /bin/sh as last resort');
      return '/bin/sh';
    }

    switch (shellType) {
      case 'cmd':
        return 'C:\\Windows\\System32\\cmd.exe';
      case 'powershell':
        return 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
      case 'wsl':
        return 'C:\\Windows\\System32\\bash.exe';
      case 'gitbash':
      default: {
        const path = customPath || this.configuredShellPath;
        if (existsSync(path)) return path;
        // Fallback detection
        const fallbacks = [
          DEFAULT_GITBASH_PATH,
          'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        ];
        for (const fb of fallbacks) {
          if (existsSync(fb)) {
            logInfo(`[TerminalService] Git bash fallback: ${fb}`);
            return fb;
          }
        }
        const fallbackPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
        logInfo('[TerminalService] Git bash not found, falling back to PowerShell');
        this.configuredShellType = 'powershell';
        this.configuredShellPath = fallbackPath;
        if (this.shellFallbackCallback) {
          this.shellFallbackCallback('powershell', fallbackPath);
        }
        return fallbackPath;
      }
    }
  }

  /**
   * Get shell args based on type
   */
  private getShellArgs(shellType: ShellType): string[] {
    switch (shellType) {
      case 'cmd': return [];
      case 'powershell': return ['-NoLogo'];
      case 'wsl': return [];
      case 'linux': return ['--login', '-i'];
      case 'gitbash':
      default: return ['--login', '-i'];
    }
  }

  /**
   * Create a new terminal session with PTY
   */
  createSession(cwd?: string, cols = 120, rows = 30, customId?: string, options?: CreateSessionOptions): string {
    const id = customId || `terminal-${this.nextId++}`;
    const shellType = options?.shellType || this.configuredShellType;
    const shellPath = this.resolveShellPath(shellType, options?.shellPath);
    // If resolveShellPath returned a different executable than the requested
    // shell type (e.g. gitbash requested but PowerShell returned as fallback),
    // choose shell args based on the actual executable to avoid passing
    // bash-specific args to PowerShell which will cause parse errors.
    let effectiveShellType = shellType;
    const shellBase = basename(shellPath).toLowerCase();
    if (shellBase.includes('powershell') || shellBase === 'pwsh.exe') {
      effectiveShellType = 'powershell';
    } else if (shellBase === 'bash.exe' || shellBase === 'sh' || shellBase === 'bash') {
      // keep as bash-like
      effectiveShellType = shellType === 'wsl' ? 'wsl' : 'gitbash';
    }

    const shellArgs = this.getShellArgs(effectiveShellType);
    const cwdPath = cwd || homedir();

    const baseEnv = { ...process.env };
    // Use OSC 7 to report CWD — an invisible escape sequence that xterm.js
    // silently consumes, unlike the old 'echo' approach which produced visible
    // text that had to be regex-stripped and left orphaned ConPTY cursor
    // sequences that corrupted vim/TUI screen restoration.
    const isBashLike = effectiveShellType === 'gitbash' || effectiveShellType === 'wsl' || effectiveShellType === 'linux';
    const envOverrides: Record<string, string> = {
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      LC_CTYPE: 'C.UTF-8',
      LESSCHARSET: 'utf-8',
    };
    if (isBashLike) {
      envOverrides.PROMPT_COMMAND = 'printf "\\033]7;file://localhost%s\\007" "$PWD"';
    }

    logInfo(`[TerminalService] Creating PTY session ${id} with shell: ${shellPath} (${shellType}), cwd: ${cwdPath}, dimensions: ${cols}x${rows}`);

    const ptyProcess = pty.spawn(shellPath, shellArgs, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwdPath,
      env: { ...baseEnv, ...envOverrides },
    });

    const session: TerminalSession = {
      id,
      pty: ptyProcess,
      cols,
      rows,
      cwd,
    };

    this.sessions.set(id, session);

    // Handle process exit — only delete if this is still the active session
    // (a restart may have replaced it with a new session under the same ID)
    ptyProcess.onExit((e) => {
      logInfo(`[TerminalService] Terminal ${id} exited with code ${e.exitCode}, signal ${e.signal}`);
      const current = this.sessions.get(id);
      if (current && current.pty === ptyProcess) {
        this.sessions.delete(id);
      }
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
      // Skip if dimensions are unchanged — avoids unnecessary SIGWINCH
      if (session.cols === cols && session.rows === rows) {
        return true;
      }
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

