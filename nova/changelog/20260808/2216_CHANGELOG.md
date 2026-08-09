# Changelog — 2026-08-08 22:16

## Ad hoc: Wire up Help -> Report Issue

### Summary
`Help > Report Issue` had no handler at all — the command fell through to
the "Unknown menu command" default case, a silent no-op. Added a case
matching Documentation's exact pattern, opening
`https://miranova.studio/contact.html` in the default browser.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | Added `case 'report-issue': window.open('https://miranova.studio/contact.html', '_blank'); break;` |

### Test Results
- 48 suites passed, 0 failed (724 tests — no new test for a one-line `window.open()` addition, same as the Documentation URL fix)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
