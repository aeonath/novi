/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Regression test: isomorphic-git's statusMatrix() does raw byte comparison
 * with no `.gitattributes` awareness, so a repo with an `eol=lf` policy
 * whose tracked file is checked out with CRLF line endings gets reported as
 * "modified" even though `git status`/`git diff` correctly show no real
 * difference (confirmed by running statusMatrix() directly against a real
 * repository `git status` called clean — see nova/changelog/20260808 for
 * the investigation). This builds a real git repo with native `git` (not
 * mocked) to reproduce the exact scenario and verify
 * filterEolFalsePositives() suppresses the false positive while still
 * reporting a genuine content change, and that the fix is gated off for
 * repos with no EOL-normalization policy at all.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import git from 'isomorphic-git';
import { parseStatusMatrix, filterEolFalsePositives } from '../../main/services/git-status-worker';

function run(cwd: string, args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'pipe' });
}

function initRepo(withAttributes: boolean): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novi-git-eol-test-'));
  run(dir, ['init', '-q']);
  run(dir, ['config', 'user.email', 'test@example.com']);
  run(dir, ['config', 'user.name', 'Test']);

  if (withAttributes) {
    fs.writeFileSync(path.join(dir, '.gitattributes'), '* text eol=lf\n');
    run(dir, ['add', '.gitattributes']);
  }

  fs.writeFileSync(path.join(dir, 'tracked.md'), 'line one\nline two\nline three\n');
  fs.writeFileSync(path.join(dir, 'other.md'), 'unrelated content\n');
  run(dir, ['add', 'tracked.md', 'other.md']);
  run(dir, ['commit', '-q', '-m', 'initial commit']);

  return dir;
}

async function getStatus(dir: string) {
  const matrix = await git.statusMatrix({ fs, dir });
  return filterEolFalsePositives(dir, parseStatusMatrix(matrix));
}

describe('git-status-worker EOL false-positive filtering', () => {
  const dirs: string[] = [];

  afterAll(() => {
    for (const d of dirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('drops a CRLF-only working-tree change in a repo with .gitattributes eol=lf', async () => {
    const dir = initRepo(true);
    dirs.push(dir);

    // Rewrite with CRLF line endings but otherwise identical content — no real change.
    fs.writeFileSync(path.join(dir, 'tracked.md'), 'line one\r\nline two\r\nline three\r\n');

    const files = await getStatus(dir);
    expect(files.find(f => f.path === 'tracked.md')).toBeUndefined();
  }, 20000);

  it('still reports a genuinely modified file in the same repo', async () => {
    const dir = initRepo(true);
    dirs.push(dir);

    fs.writeFileSync(path.join(dir, 'tracked.md'), 'line one\r\nline two\r\nCHANGED CONTENT\r\n');

    const files = await getStatus(dir);
    const entry = files.find(f => f.path === 'tracked.md');
    expect(entry).toBeDefined();
    expect(entry?.status).toBe('modified');
  }, 20000);

  it('leaves an untouched file unlisted', async () => {
    const dir = initRepo(true);
    dirs.push(dir);

    fs.writeFileSync(path.join(dir, 'tracked.md'), 'line one\r\nline two\r\nline three\r\n');

    const files = await getStatus(dir);
    expect(files.find(f => f.path === 'other.md')).toBeUndefined();
  }, 20000);

  it('does NOT suppress a CRLF-only change in a repo with no EOL policy at all', async () => {
    const dir = initRepo(false);
    dirs.push(dir);

    fs.writeFileSync(path.join(dir, 'tracked.md'), 'line one\r\nline two\r\nline three\r\n');

    const files = await getStatus(dir);
    // No .gitattributes and no core.autocrlf set locally — the filter should
    // stay out of the way rather than risk hiding an intentional EOL change.
    expect(files.find(f => f.path === 'tracked.md')).toBeDefined();
  }, 20000);
});
