/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Strips OSC sequences (ESC ] ... BEL-or-ST — window title, etc.) and CSI sequences
// (ESC [ ... letter, including "?"-prefixed private-mode ones like bracketed paste).
// Shells routinely interleave both with prompt text and typed-command echo.
const ANSI_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-9;?]*[a-zA-Z]/g;
// Matches a resting shell prompt of the form "user@host:cwd$ " or "user@host cwd % "
const PROMPT_RE = /([A-Za-z0-9_][A-Za-z0-9_.-]{0,63})@([A-Za-z0-9_][A-Za-z0-9_.-]{0,63})[:\s][^\r\n]{0,80}[#$%>]\s*$/;
// Finds a standalone "ssh" word anywhere in the line — NOT anchored to line-start,
// because the accumulated line buffer includes whatever the shell's prompt printed
// (prompts have no trailing newline of their own, e.g. custom "user@host:dir : ").
// We want the LAST such occurrence: the one the user actually just typed.
const SSH_TOKEN_RE = /(^|\s)ssh(?=\s|$)/g;
const EXIT_BANNER_RE = /(?:^|[\r\n])(?:Connection to [^\r\n]+ closed\.?|Connection closed by [^\r\n]+|logout)\s*$/i;

const MAX_CMD_LINE = 4096;
const MAX_SCAN_BUFFER = 400;

// ssh flags that consume a separate value argument (so it isn't mistaken for the destination)
const FLAGS_WITH_VALUE = new Set([
  '-p', '-l', '-i', '-o', '-F', '-c', '-D', '-L', '-R', '-W', '-w',
  '-J', '-B', '-b', '-E', '-e', '-m', '-O', '-Q', '-S',
]);

interface SshConfigMatch {
  isAlias: boolean;
  user: string | null;
}

/** Best-effort, non-recursive parse of ~/.ssh/config for an exact `Host <token>` block. */
function lookupSshConfigHost(token: string): SshConfigMatch {
  try {
    const configPath = path.join(os.homedir(), '.ssh', 'config');
    const content = fs.readFileSync(configPath, 'utf8');
    const lines = content.split(/\r?\n/);
    let inMatchingBlock = false;
    let user: string | null = null;
    let isAlias = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const hostMatch = /^Host\s+(.+)$/i.exec(line);
      if (hostMatch) {
        const patterns = hostMatch[1].split(/\s+/);
        inMatchingBlock = patterns.includes(token);
        if (inMatchingBlock) isAlias = true;
        continue;
      }
      if (inMatchingBlock) {
        const userMatch = /^User\s+(\S+)$/i.exec(line);
        if (userMatch && !user) user = userMatch[1];
      }
    }
    return { isAlias, user };
  } catch {
    return { isAlias: false, user: null };
  }
}

export type SshTitleEvent = { type: 'title'; value: string } | { type: 'ended' };

/**
 * Tracks an `ssh <alias>` invocation typed into a terminal tab and derives a
 * "user@host" tab title for it — purely by observing PTY bytes (typed-command
 * echo + the remote shell's own resting prompt). Never touches the ssh
 * invocation itself, so it can't affect connection behavior.
 */
export class SshTitleTracker {
  private cmdLineBuffer = '';
  private scanBuffer = '';
  private active = false;
  private user = '';
  private hostLabel = '';
  private isAlias = false;
  private readonly localUser: string;

  constructor() {
    try {
      this.localUser = os.userInfo().username;
    } catch {
      this.localUser = 'user';
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Feed a raw PTY data chunk. Returns a title update / end-of-session event, or null. */
  feed(data: string): SshTitleEvent | null {
    if (!this.active) {
      return this.scanForSshCommand(data);
    }
    return this.scanWhileActive(data);
  }

  /** Call when the LOCAL shell's own prompt has redrawn — signals ssh has ended (if it was active). */
  notifyLocalPrompt(): SshTitleEvent | null {
    if (!this.active) return null;
    this.active = false;
    this.scanBuffer = '';
    return { type: 'ended' };
  }

  private scanForSshCommand(data: string): SshTitleEvent | null {
    const clean = data.replace(ANSI_RE, '');
    for (const ch of clean) {
      if (ch === '\n') {
        const line = this.cmdLineBuffer.replace(/\r$/, '');
        this.cmdLineBuffer = '';
        const started = this.tryStartSsh(line);
        if (started) return { type: 'title', value: started };
      } else if (ch === '\x7f' || ch === '\b') {
        this.cmdLineBuffer = this.cmdLineBuffer.slice(0, -1);
      } else if (ch === '\r') {
        // Enter is usually followed by \n — handled above; ignore standalone CR.
      } else {
        this.cmdLineBuffer += ch;
        if (this.cmdLineBuffer.length > MAX_CMD_LINE) {
          this.cmdLineBuffer = this.cmdLineBuffer.slice(-MAX_CMD_LINE);
        }
      }
    }
    return null;
  }

  private tryStartSsh(rawLine: string): string | null {
    const line = rawLine.trimEnd();

    let lastTokenEnd = -1;
    let match: RegExpExecArray | null;
    SSH_TOKEN_RE.lastIndex = 0;
    while ((match = SSH_TOKEN_RE.exec(line)) !== null) {
      lastTokenEnd = match.index + match[0].length;
    }
    if (lastTokenEnd === -1) return null;
    const rest = line.slice(lastTokenEnd).trim();
    if (!rest) return null;

    const args = rest.split(/\s+/).filter(Boolean);
    let target: string | null = null;
    let explicitUser: string | null = null;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a.startsWith('-')) {
        if (a === '-l') explicitUser = args[i + 1] || explicitUser;
        if (FLAGS_WITH_VALUE.has(a)) i++;
        continue;
      }
      target = a;
      break; // destination is the first non-flag arg; anything after is a remote command
    }
    if (!target) return null;

    const atIdx = target.indexOf('@');
    if (atIdx !== -1) {
      explicitUser = target.slice(0, atIdx);
      target = target.slice(atIdx + 1);
    }
    if (!target) return null;

    const configMatch = lookupSshConfigHost(target);
    this.active = true;
    this.scanBuffer = '';
    this.isAlias = configMatch.isAlias;
    this.hostLabel = target;
    this.user = explicitUser || configMatch.user || this.localUser;
    return `${this.user}@${this.hostLabel}`;
  }

  private scanWhileActive(data: string): SshTitleEvent | null {
    this.scanBuffer += data;
    if (this.scanBuffer.length > MAX_SCAN_BUFFER) {
      this.scanBuffer = this.scanBuffer.slice(-MAX_SCAN_BUFFER);
    }
    const stripped = this.scanBuffer.replace(ANSI_RE, '');

    if (EXIT_BANNER_RE.test(stripped)) {
      this.active = false;
      this.scanBuffer = '';
      return { type: 'ended' };
    }

    const m = PROMPT_RE.exec(stripped);
    if (!m) return null;
    const [, promptUser, promptHost] = m;
    let changed = false;
    if (promptUser !== this.user) { this.user = promptUser; changed = true; }
    if (!this.isAlias && promptHost !== this.hostLabel) { this.hostLabel = promptHost; changed = true; }
    if (!changed) return null;
    return { type: 'title', value: `${this.user}@${this.hostLabel}` };
  }
}
