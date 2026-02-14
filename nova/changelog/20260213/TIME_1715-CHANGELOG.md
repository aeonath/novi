# Ad hoc — Novi open-file: MSYS path → Windows path on Windows — 20260213.1715

## Summary
When opening a file via `novi <file>` from a terminal (e.g. Git Bash), the CWD can be in MSYS form (`/c/Work/miranova.studio`). Joining that with the filename produced paths like `/c/Work/.../README.md`, which Node on Windows interpreted as `C:\c\Work\...` and caused ENOENT. We now convert such paths to Windows form (`C:\Work\...`) before calling `readFile`.

## Reason
User ran `novi README.md` in `miranova.studio/` and got: `Error: ENOENT: no such file or directory, open 'C:\c\Work\miranova.studio\README.md'`. Root cause: MSYS-style CWD was used as-is when building the full path sent to the main process.

## Files Changed

### Created
- **nova/changelog/20260213/TIME_1715-CHANGELOG.md** — This file.

### Modified
- **src/renderer/components/App.tsx**
  - Added `toWindowsPathIfNeeded(p)`: if `p` matches `/^\/[a-zA-Z]\/(.*)$/` (e.g. `/c/Work/...`), returns `C:\Work\...` (drive letter + `:\` + rest with `/` → `\`); otherwise returns `p` unchanged.
  - In the novi open-file handler, after computing `fullPath` from CWD + `novi.path`, set `fullPath = toWindowsPathIfNeeded(fullPath)` before calling `window.api.readFile(fullPath)`.

## User-facing impact
`novi README.md` (and any relative path) from Git Bash in a repo (e.g. `miranova.studio/`) now opens the correct file instead of ENOENT.

## Git Commit Hash
`161a9cc` — Ad hoc: novi open-file MSYS→Windows path fix

## Status
✅ Completed
