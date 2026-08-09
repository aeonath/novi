/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * GitStatusWorker - Runs isomorphic-git's statusMatrix() walk off the main thread.
 *
 * statusMatrix() walks the entire working tree and does CPU-bound JS work
 * (ignore-pattern matching, hashing) per file with no yield points. On a huge
 * repository that can occupy the JS thread for a long time; on the Electron
 * main process, that means every IPC call (menus, terminal input, file ops)
 * is starved for as long as the scan runs. Running it in a worker_thread keeps
 * the main thread free regardless of repo size, and lets GitService cancel a
 * stale scan by terminating this thread outright.
 */

import { parentPort, workerData } from 'node:worker_threads';
import git from 'isomorphic-git';
import * as fs from 'fs';
import { join } from 'path';

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'staged';
  staged: boolean;
}

interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
}

function parseStatusMatrix(matrix: [string, number, number, number][]): GitFileStatus[] {
  const files: GitFileStatus[] = [];

  for (const [filepath, head, workdir, stage] of matrix) {
    if (head === 1 && workdir === 1 && stage === 1) continue;

    if (head === 0 && workdir === 2 && stage === 0) {
      files.push({ path: filepath, status: 'untracked', staged: false });
      continue;
    }

    if (head === 0 && stage === 2) {
      files.push({ path: filepath, status: 'added', staged: true });
      if (workdir === 0) {
        files.push({ path: filepath, status: 'deleted', staged: false });
      }
      continue;
    }

    if (head === 1 && stage === 2) {
      files.push({ path: filepath, status: 'modified', staged: true });
    } else if (head === 1 && stage === 0) {
      files.push({ path: filepath, status: 'deleted', staged: true });
    }

    if (head === 1 && workdir === 2 && stage === 1) {
      files.push({ path: filepath, status: 'modified', staged: false });
    } else if (head === 1 && workdir === 0 && stage === 1) {
      files.push({ path: filepath, status: 'deleted', staged: false });
    }
  }

  return files;
}

/**
 * Crude binary sniff (same heuristic git itself uses): a NUL byte anywhere
 * in the first chunk means "don't treat this as text". Guards the CRLF
 * normalization below from ever being applied to genuinely different binary
 * content that might otherwise coincidentally look equal.
 */
function looksBinary(buf: Buffer): boolean {
  const len = Math.min(buf.length, 8000);
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

const normalizeEol = (buf: Buffer): string => buf.toString('utf8').replace(/\r\n/g, '\n');

/**
 * isomorphic-git's statusMatrix() compares the working tree file's raw bytes
 * against the committed blob with no `.gitattributes` awareness — it doesn't
 * apply `eol=lf`/`core.autocrlf` normalization the way native git's own
 * status/diff do. A repo with `* text eol=lf` checked out with CRLF-ended
 * files (a common outcome of editors/tools that don't respect
 * `.gitattributes` on Windows) is reported as "modified" by isomorphic-git
 * even though `git status`/`git diff` correctly show no real difference.
 * Confirmed directly: running statusMatrix() against a repo `git status`
 * called clean flagged 2 CRLF-checked-out files under an `eol=lf` policy.
 *
 * Re-verifies each unstaged "modified" entry by reading both the working
 * tree file and the HEAD blob, normalizing CRLF→LF, and comparing — if
 * they're equal once normalized, it's a false positive and gets dropped.
 * Only covers the working-tree-vs-HEAD case (`staged: false`), which is
 * what was reproduced; staged (index-vs-HEAD) modifications aren't touched.
 *
 * Gated on the repo actually signalling it cares about EOL normalization
 * (`core.autocrlf` set, or a `.gitattributes` file present) — otherwise a
 * repo with no such policy that has a genuine, intentional CRLF/LF-only
 * change would have it silently hidden, which is worse than the rare case
 * of it being over-cautious here.
 */
async function filterEolFalsePositives(cwd: string, files: GitFileStatus[]): Promise<GitFileStatus[]> {
  const candidates = files.filter(f => f.status === 'modified' && !f.staged);
  if (candidates.length === 0) return files;

  const autocrlf = await git.getConfig({ fs, dir: cwd, path: 'core.autocrlf' }).catch(() => undefined);
  const hasAttributes = fs.existsSync(join(cwd, '.gitattributes'));
  if (!autocrlf && !hasAttributes) return files;

  let headOid: string;
  try {
    headOid = await git.resolveRef({ fs, dir: cwd, ref: 'HEAD' });
  } catch {
    return files; // no HEAD (e.g. brand new repo) — nothing to compare against
  }

  const falsePositives = new Set<string>();
  for (const candidate of candidates) {
    try {
      const [{ blob }, workdirBuf] = await Promise.all([
        git.readBlob({ fs, dir: cwd, oid: headOid, filepath: candidate.path }),
        fs.promises.readFile(join(cwd, candidate.path)),
      ]);
      const headBuf = Buffer.from(blob);
      if (looksBinary(headBuf) || looksBinary(workdirBuf)) continue;
      if (normalizeEol(headBuf) === normalizeEol(workdirBuf)) {
        falsePositives.add(candidate.path);
      }
    } catch {
      // Can't verify (deleted mid-scan, unreadable, etc.) — err toward keeping it visible.
    }
  }

  if (falsePositives.size === 0) return files;
  return files.filter(f => !(f.status === 'modified' && !f.staged && falsePositives.has(f.path)));
}

async function getAheadBehind(cwd: string, branch: string | null): Promise<{ ahead: number; behind: number }> {
  if (!branch) return { ahead: 0, behind: 0 };

  try {
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

async function run(): Promise<void> {
  const { cwd } = workerData as { cwd: string };

  try {
    const gitDir = join(cwd, '.git');
    if (!fs.existsSync(gitDir)) {
      const status: GitStatus = { isRepo: false, branch: null, files: [], ahead: 0, behind: 0 };
      parentPort?.postMessage({ ok: true, status });
      return;
    }

    const branch = await git.currentBranch({ fs, dir: cwd }) || null;
    const matrix = await git.statusMatrix({ fs, dir: cwd });
    const files = await filterEolFalsePositives(cwd, parseStatusMatrix(matrix));
    const { ahead, behind } = await getAheadBehind(cwd, branch);

    const status: GitStatus = { isRepo: true, branch, files, ahead, behind };
    parentPort?.postMessage({ ok: true, status });
  } catch (error) {
    parentPort?.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

// Only auto-execute inside an actual worker thread. Guarding this lets the
// pure functions above be imported and unit tested directly (workerData is
// null outside a worker, so destructuring it in run() would otherwise throw
// the moment this module loads).
if (parentPort) {
  void run();
}

export { parseStatusMatrix, filterEolFalsePositives, looksBinary, normalizeEol };
