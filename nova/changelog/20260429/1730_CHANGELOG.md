# Changelog — Ad hoc: Single DEBUG flag via src/debug.ts

**Date**: 20260429.1730  
**Commit**: TBD

---

## Summary

Replaced the two duplicate `const DEBUG = false` constants (one in main process, one in renderer) with a single shared module `src/debug.ts`. Both processes now import `DEBUG` from the same source.

## Files Changed

| File | Change |
|------|--------|
| `src/debug.ts` | New — exports `const DEBUG = false` |
| `src/main/main.ts` | Import `DEBUG` from `../debug`; remove local constant |
| `src/renderer/index.ts` | Import `DEBUG` from `../debug.js`; remove local constant |
| `README.md` | Added "Debug Mode" section under Development |

## Test Results

666/666 passing — no regressions.
