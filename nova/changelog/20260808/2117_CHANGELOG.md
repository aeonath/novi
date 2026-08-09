# Changelog — 2026-08-08 21:17

## Ad hoc: Fix root cause of false-positive git coloring (isomorphic-git EOL mismatch) + git-button visibility

### Summary
User reported `content/` still showing as changed on `miranova.studio` with
`git status` reporting clean, and no git-toggle button in the file tree
header despite git support being enabled. Rather than another refresh-timing
fix, reproduced the underlying data source directly: ran isomorphic-git's
`statusMatrix()` against the repo by hand and it independently flagged the
same 2 files (`content/journal/20260726_1752_POST.md`,
`content/journal/20260807_1419_POST.md`) as modified — a genuine bug in the
data isomorphic-git returns, not a stale-refresh problem. `gitService`'s
worker was correctly fetching fresh data every time; that data itself was
wrong.

Root cause: this repo has `.gitattributes` with `* text eol=lf` and both
files are checked out on disk with CRLF line endings. Native git normalizes
line endings per `.gitattributes` before comparing content, correctly
finding no real difference. isomorphic-git's `statusMatrix()` does a raw
byte comparison of the working-tree file against the committed blob with no
`.gitattributes` awareness at all — a known limitation, not something any
amount of App.ts refresh-timing logic could ever paper over.

Fix (`git-status-worker.ts`): added `filterEolFalsePositives()`, which
re-verifies every unstaged "modified" entry statusMatrix reports by reading
both the working-tree file and the HEAD blob, normalizing CRLF→LF on each,
and comparing — entries that are equal once normalized get dropped as false
positives. Gated on the repo actually signalling it cares about EOL
normalization (`core.autocrlf` set, or a `.gitattributes` file present), so
a repo with no such policy that has a genuine, intentional CRLF/LF-only
change doesn't get it silently hidden. Verified directly against the real
`miranova.studio` repo: both flagged files normalize as byte-identical to
their HEAD blobs.

Separately fixed the missing git-toggle button: `FileTree.renderHeader()`
gated the button on finding a literal `.git` entry in the *loaded directory
listing* — but `.git` is a dotfile, hidden by default (`showhiddenfiles`
setting defaults to `false`), so the button silently vanished whenever
hidden files weren't shown, regardless of whether the root is actually a
repo. Switched the check to `appState.gitStatus?.isRepo`, the same reliable
signal already driving the file-tree coloring itself (kept in sync with the
displayed root by the last two fixes), which doesn't depend on
directory-listing visibility at all.

Made `git-status-worker.ts`'s auto-run guarded on `parentPort` (only
executes inside an actual worker thread) and exported its pure functions,
so the new logic could be unit tested directly rather than only
theorized about.

### Files Changed

| File | Change |
|------|--------|
| `src/main/services/git-status-worker.ts` | Added `filterEolFalsePositives()` (with `looksBinary`/`normalizeEol` helpers), applied to the file list before returning status; guarded `run()`'s auto-invocation behind `if (parentPort)`; exported `parseStatusMatrix`/`filterEolFalsePositives`/`looksBinary`/`normalizeEol` and the `GitFileStatus` interface for testing |
| `src/renderer/components/FileTree.ts` | Git-toggle button visibility now checks `appState.gitStatus?.isRepo` instead of scanning the loaded tree for a `.git` entry; removed the now-stale comment about that old check |
| `src/tests/core-0.8.0/git-status-worker-eol.test.ts` | New: builds real git repos with native `git` (not mocked) to reproduce the exact CRLF/`eol=lf` scenario — verifies the false positive is dropped, a genuine content change still reports, an untouched file stays unlisted, and the fix is inert in a repo with no EOL-normalization policy at all |

### Test Results
- 45 suites passed, 0 failed (707 tests, 4 new)
- Manually confirmed the primary EOL test fails when `filterEolFalsePositives` is bypassed, then passes with the fix restored
- Directly verified against the real `miranova.studio` repo (not just the test fixture) that both previously-false-flagged files now normalize as equal to HEAD
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
