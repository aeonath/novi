# Changelog — 2026-08-09 16:19

## Ad hoc: Bump version to 0.8.8

### Summary
User requested a version bump. Ran `npm version 0.8.8 --no-git-tag-version`
(no auto-commit/tag, so the change flows through the normal changelog +
commit workflow) to update `package.json` and `package-lock.json` together.
`getAppVersion()` in `src/main/main.ts` reads `package.json` at runtime, so
no other source files reference the version string.

### Files Changed

| File | Change |
|------|--------|
| `package.json` | `version`: `0.8.7` → `0.8.8` |
| `package-lock.json` | top-level `version` and root package `version`: `0.8.7` → `0.8.8` |

### Test Results
- 53 suites passed, 0 failed (785 tests)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully, build output confirms `novi@0.8.8`

### Commit
TBD
