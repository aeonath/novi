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

interface GitFileStatus {
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
    const files = parseStatusMatrix(matrix);
    const { ahead, behind } = await getAheadBehind(cwd, branch);

    const status: GitStatus = { isRepo: true, branch, files, ahead, behind };
    parentPort?.postMessage({ ok: true, status });
  } catch (error) {
    parentPort?.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

void run();
