# Changelog — 2026-08-08 22:11

## Ad hoc: Fix Help -> Documentation URL

### Summary
`Help > Documentation` opened `https://lyric-lang.org/novi.html` — stale/
wrong. Updated to `https://miranova.studio/projects/novi.html`.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | `case 'documentation'`'s `window.open()` URL updated |

### Test Results
- 48 suites passed, 0 failed (724 tests — no new test for a one-line URL string change)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
