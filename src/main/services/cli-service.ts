/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { BrowserWindow } from 'electron';
import { logInfo, logError } from '../logger';

type CliCommand =
  | { cmd: 'ping' }
  | { cmd: 'new-file' }
  | { cmd: 'open-file'; path: string }
  | { cmd: 'open-terminal'; cwd: string };

type CliResponse = { ok: true } | { ok: false; error: string };

export interface OpenFromCliPayload {
  newFile?: boolean;
  filePath?: string;
  openTerminal?: boolean;
  cwd?: string;
}

export function getPipePath(): string {
  if (process.platform === 'win32') {
    // Windows has no reliable AF_UNIX support (creating a filesystem-path socket
    // can fail with EACCES and a bogus "WSL not installed" message depending on
    // filesystem/ACL/provider config). Named pipes are the native, always-available
    // IPC mechanism on Windows and require no WSL or afunix.sys support.
    return '\\\\.\\pipe\\novi-editor';
  }
  return path.join(os.homedir(), '.novi', 'novi-editor.sock');
}

export function parseStartupArgs(argv: string[]): OpenFromCliPayload | null {
  // Never process startup flags when running as the CLI client
  if (argv.includes('--novi-cli')) return null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--novi-new-file') {
      return { newFile: true };
    }

    if (arg.startsWith('--novi-open-file=')) {
      const filePath = arg.slice('--novi-open-file='.length);
      return filePath ? { filePath } : null;
    }

    if (arg === '--novi-open-terminal') {
      const cwdArg = argv.find((a) => a.startsWith('--novi-cwd='));
      const cwd = cwdArg ? cwdArg.slice('--novi-cwd='.length) : undefined;
      return { openTerminal: true, ...(cwd ? { cwd } : {}) };
    }
  }

  return null;
}

class CliService {
  private server: net.Server | null = null;

  start(getWindow: () => BrowserWindow | null): void {
    const sockPath = getPipePath();

    // Windows named pipes live in the OS pipe namespace, not on disk — no
    // directory to create and no stale file to clean up.
    if (process.platform !== 'win32') {
      fs.mkdirSync(path.dirname(sockPath), { recursive: true });

      if (fs.existsSync(sockPath)) {
        try {
          fs.unlinkSync(sockPath);
        } catch {
          // ignore — may not exist by the time we unlink
        }
      }
    }

    this.server = net.createServer((socket) => {
      let data = '';

      socket.setTimeout(5000);
      socket.on('timeout', () => socket.destroy());

      socket.on('data', (chunk) => {
        data += chunk.toString();
      });

      socket.on('end', () => {
        let response: CliResponse;
        try {
          const cmd = JSON.parse(data.trim()) as CliCommand;
          response = this.handleCommand(cmd, getWindow);
        } catch {
          response = { ok: false, error: 'Invalid command' };
        }
        socket.end(JSON.stringify(response) + '\n');
      });

      socket.on('error', (err) => {
        logError('CliService socket error', err as Error);
      });
    });

    this.server.listen(sockPath, () => {
      logInfo(`CliService listening on ${sockPath}`);
    });

    this.server.on('error', (err) => {
      logError('CliService server error', err as Error);
    });
  }

  private handleCommand(cmd: CliCommand, getWindow: () => BrowserWindow | null): CliResponse {
    const win = getWindow();
    if (!win || win.isDestroyed()) {
      return { ok: false, error: 'Window not available' };
    }

    switch (cmd.cmd) {
      case 'ping':
        return { ok: true };

      case 'new-file':
        win.webContents.send('open-from-cli', { newFile: true });
        this.focusWindow(win);
        return { ok: true };

      case 'open-file':
        win.webContents.send('open-from-cli', { filePath: cmd.path });
        this.focusWindow(win);
        return { ok: true };

      case 'open-terminal':
        win.webContents.send('open-from-cli', { openTerminal: true, cwd: cmd.cwd });
        this.focusWindow(win);
        return { ok: true };

      default: {
        const unknown = (cmd as { cmd: string }).cmd;
        return { ok: false, error: `Unknown command: ${unknown}` };
      }
    }
  }

  private focusWindow(win: BrowserWindow): void {
    if (win.isMinimized()) win.restore();
    if (process.platform === 'win32') {
      win.setAlwaysOnTop(true);
      win.focus();
      win.setAlwaysOnTop(false);
    } else {
      win.focus();
    }
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (process.platform === 'win32') return;
    const sockPath = getPipePath();
    try {
      if (fs.existsSync(sockPath)) {
        fs.unlinkSync(sockPath);
      }
    } catch {
      // ignore
    }
  }
}

export const cliService = new CliService();
