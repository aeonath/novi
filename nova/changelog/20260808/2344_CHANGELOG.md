# Changelog — 2026-08-08 23:44

## Ad hoc: Fix file tree stuck spinning and terminal tabs showing stale names after workspace restore

### Summary
User reported that restoring a session with an editor tab active left the
file tree spinning forever and the terminal tab just showing generic
"bash" instead of its real cwd. Confirmed both root causes precisely by
tracing the actual restore sequence (not guessed).

**File tree deadlock**: `App` sets `this.fileTree.loading = true`
immediately after constructing `FileTree`. In the default (non-
`singlefiletree`) mode, the *only* place that ever clears it back to
`false` is the `terminalOnPwd` IPC handler — because the file tree is
normally driven by whichever terminal's cwd the active tab reports.
`updateFileTreeDisplayRoot()` has a guard, `if (this.fileTree &&
!this.fileTree.isLoading) this.fileTree.displayRoot = root;`, that skips
setting the tree's root entirely while `loading` is still true. But PTYs
are created lazily — only for whichever tab is actually active
(`Terminal.set isActive` → `initPhase1()` only runs `if (active)`) — so if
the workspace's last-active tab was a *file*, no terminal ever activates,
no PTY ever spins up for *any* restored terminal, `terminalOnPwd` never
fires for anyone, and `loading` never clears. The guard then permanently
blocks `displayRoot` from ever being set, even though `this.workspaceRoot`
itself *is* restored correctly and synchronously — the sidebar just spins
forever with a perfectly good root sitting unused in memory.

Fix: the `loading` gate only makes sense while genuinely waiting on the
*active terminal's* PTY to report its cwd. For any other active tab type
(file, image, settings, none) the root is already known synchronously, so
`updateFileTreeDisplayRoot()` now clears `loading` unconditionally in that
case before deciding whether to apply `displayRoot`.

**Terminal tab stuck on a stale/generic name**: restored non-active
terminal tabs never get a PTY either, for the same lazy-activation reason —
so they never fire `terminalOnPwd`, which is the *only* code that ever
renames a tab from its cwd. They were left showing whatever `ti.name || 'bash'`
was captured at save time. Since the cwd itself *is* saved alongside the
name, the fix derives the tab's initial display name from the saved cwd
directly (reusing the exact same folder-name logic `terminalOnPwd`
already used) rather than trusting a possibly-stale saved label — so a
restored tab shows the right name immediately, with no PTY required.
Extracted that shared logic into a new `deriveTerminalTabName()` helper,
also de-duplicating an identical inline copy that existed in the SSH-title
handler.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | `updateFileTreeDisplayRoot()` now clears `fileTree.loading` whenever the active tab isn't a terminal, instead of only ever clearing it from `terminalOnPwd`; added `deriveTerminalTabName(cwd)` helper (used by `terminalOnPwd`, the SSH-title handler, and now workspace restore) to render a tab's name from a cwd; terminal restore now derives the initial tab name from the saved `cwd` instead of trusting the saved `name` string |

### Test Results
- 49 suites passed, 0 failed (744 tests — one `settings.test.ts` failure on the first run turned out to be the same pre-existing order-dependent flake identified earlier this session; a clean re-run passed all 744). No new test: this is App.ts orchestration logic with no existing test harness in this codebase (constructing a full `App` instance would need extensive `window.api` mocking disproportionate to the fix), consistent with how prior App.ts-level changes tonight were handled — relying on the full suite plus manual verification.
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
