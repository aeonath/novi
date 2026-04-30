/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import * as net from 'net';
import * as path from 'path';
import { spawn } from 'child_process';
import { app } from 'electron';
import { getPipePath } from './services/cli-service';

type CliCommand =
  | { cmd: 'new-file' }
  | { cmd: 'open-file'; path: string }
  | { cmd: 'open-terminal'; cwd: string };

/**
 * Parses the user-visible arguments that follow --novi-cli into a typed command.
 * Exported for unit testing.
 */
export function parseCliModeArgs(argv: string[], cwd: string): CliCommand {
  const cliIdx = argv.indexOf('--novi-cli');
  const userArgs = cliIdx >= 0 ? argv.slice(cliIdx + 1) : [];

  if (userArgs.length === 0) {
    return { cmd: 'new-file' };
  }

  if (userArgs[0] === '-t') {
    return { cmd: 'open-terminal', cwd };
  }

  // Anything else is treated as a file path, resolved against the caller's cwd
  return { cmd: 'open-file', path: path.resolve(cwd, userArgs[0]) };
}

function startupFlagsFor(cmd: CliCommand): string[] {
  switch (cmd.cmd) {
    case 'new-file':      return ['--novi-new-file'];
    case 'open-file':     return [`--novi-open-file=${cmd.path}`];
    case 'open-terminal': return ['--novi-open-terminal', `--novi-cwd=${cmd.cwd}`];
  }
}

function spawnNoviEditor(extraArgs: string[]): void {
  const bin = process.execPath;
  // In dev: execPath is the Electron binary; the app directory must be passed as the first arg.
  // In packaged builds: execPath is NoviEditor itself; no extra base arg needed.
  const baseArgs = app.isPackaged ? [] : [app.getAppPath()];
  spawn(bin, [...baseArgs, ...extraArgs], { detached: true, stdio: 'ignore' }).unref();
}

/**
 * Runs the headless CLI client mode.
 * Connects to the running NoviEditor socket, sends the command, and exits.
 * If NoviEditor is not running, spawns it with the appropriate startup flags instead.
 * Always calls app.exit(0) when done — no window is ever created.
 */
export async function runCliMode(argv: string[], cwd: string): Promise<void> {
  const cmd = parseCliModeArgs(argv, cwd);
  const sockPath = getPipePath();

  await new Promise<void>((resolve) => {
    let connected = false;
    const socket = net.connect(sockPath);

    socket.on('connect', () => {
      connected = true;
      // Write command and half-close so the server's 'end' event fires
      socket.end(JSON.stringify(cmd) + '\n');
    });

    socket.on('data', () => {
      // Response received — command delivered; socket closes naturally after this
    });

    socket.on('close', () => resolve());

    socket.on('error', () => {
      if (!connected) {
        // `novi` with no args + no running instance: just launch normally (restore last session)
        const flags = cmd.cmd === 'new-file' ? [] : startupFlagsFor(cmd);
        spawnNoviEditor(flags);
      }
      resolve();
    });

    // Safety timeout: give up after 3 seconds regardless
    socket.setTimeout(3000);
    socket.on('timeout', () => {
      socket.destroy();
      resolve();
    });
  });

  app.exit(0);
}
