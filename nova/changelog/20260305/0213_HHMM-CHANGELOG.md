# Changelog — 2026-03-05 02:13

## Ad hoc: Convert MSYS/git-bash POSIX paths to Windows paths

### Summary
Git-bash reports `$PWD` as POSIX paths via OSC 7 (e.g., `/c/Work`, `/usr`, `/`). These were passed raw to the file tree and tab titles, causing confusion: `/` showed as `//` in the prompt, `/usr` couldn't be resolved to a real Windows directory, and drive-letter-only paths like `/c/` displayed as just `c`. Added MSYS-to-Windows path conversion in the OSC 7 handler so all paths are proper Windows paths before reaching the renderer.

### Changes

| File | Change |
|------|--------|
| `src/main/main.ts` | Added `msysToWindows()` and `getGitRoot()` functions; imported `existsSync`; apply conversion to OSC 7 paths on Windows before sending `terminal-pwd` |
| `src/tests/core-0.7.0/msys-path.test.ts` | New: 15 tests covering drive letter conversion (`/c/Work` → `C:\Work`), MSYS root paths (`/` → Git root, `/usr` → Git root\usr), passthrough of Windows paths, and fallback without Git root |

### Conversion Rules
- `/c/Work` → `C:\Work` (drive letter prefix)
- `/c/` or `/c` → `C:\` (drive root)
- `/` → `C:\Program Files\Git` (Git installation root)
- `/usr`, `/etc`, `/tmp` → `C:\Program Files\Git\usr`, etc.
- `C:\Work` → `C:\Work` (already Windows, passthrough)

### Rationale
Git-bash uses MSYS2 path mapping internally. When reporting CWD via OSC 7, it sends POSIX paths. The file tree and tab system need Windows paths to resolve directories correctly. PowerShell already reports Windows paths and is unaffected.

### Test Results
- **620 tests passed**, 0 failed (15 new)
- Build compiles successfully

### Commit Hash
TBD
