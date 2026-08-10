# Changelog — 2026-08-10 17:57

## Ad hoc: Surface file-open failures to the user instead of failing silently

### Summary
User's runtime log showed `EPERM: operation not permitted, open
'C:\Users\Aeonath\Application Data'` (a legacy Windows junction to
`AppData\Roaming`) being logged by the main process's `read-file` handler —
but nothing appeared in the app itself. Traced this to the renderer: every
`window.api.readFile()` call site either only did `console.error` (invisible
unless DevTools was open) or, in the session-restore path, silently
`catch { /* skip */ }`ed with no logging at all. A file the user can't open —
permission-denied, missing, or (as here) a path that was saved as an "open
file" from a previous session but isn't actually a readable file — looked
like nothing happened.

### Fix
Added `App.describeFileOpenError(error, filePath)`, a small helper that maps
a failed `readFile` rejection to a short, specific status-bar message
(`Permission denied: <name>`, `File not found: <name>`, `<name> is a
directory`, or a generic `Failed to open <name>` fallback) based on the
error's `code` (`EPERM`/`EACCES`/`ENOENT`/`EISDIR`). Wired it into every
`readFile` failure path that previously gave no user-facing feedback:

- **Session restore** (`loadWorkspace`'s open-files loop): previously
  `catch { /* skip */ }` with zero logging. Now logs each failure to the
  console and collects them; if any files failed to restore, shows either
  the single message or `N files could not be restored` in the status bar
  once the loop finishes.
- **File tree → open file** (`onFileTreeFileOpen`): now also sets the status
  bar, in addition to the existing `console.error`.
- **CLI file open** (`openFileFromPath`, used by `#novi <file>`): same.
- **File → Open... dialog** (`onOpenFile`): same — `filePath` is now
  declared before the `try` so the catch block can still reference it for
  the message; falls back to a generic message if the failure happened
  before a path was even picked.

The two existing reload-from-disk flows (`reloadFileFromDisk`,
`handleExternalFileChange`'s Reload button) already showed `'Reload failed'`
in the status bar on failure and were left as-is — they already followed the
established convention (`__statusBarAPI?.setStatus(...)`, same pattern as
"Save failed" / "Git refresh failed" elsewhere in `App.ts`), which the fixed
call sites now also follow. No new status-bar/toast component was needed.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | Added `describeFileOpenError()`; wired it into the session-restore open-files loop, `onFileTreeFileOpen`, `openFileFromPath`, and `onOpenFile`'s catch blocks (all previously silent or console-only) |

### Test Results
- 57 suites passed, 0 failed (868 tests — unchanged; `App.ts` has no
  existing dedicated unit test file in this codebase — it's the top-level
  orchestrator class with a large DOM/IPC-mocking cost that no other test
  attempts — so no new test was added for this string-mapping helper,
  consistent with that existing gap)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
