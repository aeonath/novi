# Changelog — 2026-08-10 19:07

## Ad hoc: Silence test output — no console noise on a passing run

### Summary
User ran `./testit.sh` and got pages of `console.error` spam even though
every suite passed — mostly repeated jsdom "Not implemented:
HTMLCanvasElement.prototype.getContext" errors from `terminal-*.test.ts`
files, plus a deliberately-triggered `[Terminal] xterm dispose threw
(ignored):` log. Asked for the suite to be silent unless something actually
fails.

### Root cause
1. **jsdom canvas noise**: `@xterm/xterm` and `@xterm/addon-webgl` both probe
   for a 2D canvas context at module-load time (for color/gradient
   utilities), wrapped in their own `try`/`if (ctx)` that already handles a
   failed probe gracefully. jsdom doesn't implement
   `HTMLCanvasElement.getContext` (that needs the native `canvas` npm
   package) — it doesn't throw, but it does emit a `'jsdomError'` on its
   virtual console for every call, which Jest's jsdom environment forwards
   straight to `console.error`. Every test file that imports `Terminal.ts`
   (which imports `@xterm/xterm`/`@xterm/addon-webgl`) triggered this twice.
2. **Intentional dispose-error log**: `terminal-dispose-guard.test.ts`
   deliberately mocks xterm's `dispose()` to throw, to verify
   `Terminal.disposeXterm()`'s catch-and-ignore guard actually works. That
   guard logs via `console.error` by design — correct in production (so a
   real dispose failure isn't silently invisible), but noisy for a test
   that's *supposed* to hit that branch and pass.

`src/tests/setup.ts` already suppresses `console.log`/`info`/`warn`
globally but deliberately leaves `console.error` alone "so we can see actual
test failures" — that's the right call to keep, so the fix targets each
noise source specifically rather than blanket-suppressing all `console.error`
suite-wide (which would also hide genuine future failures logged that way).

### Fix
- `src/tests/setup.ts`: stub `HTMLCanvasElement.prototype.getContext` to
  return `null` (via `jest.fn`) instead of letting jsdom's real
  (unimplemented) version run. This is behaviorally identical from the
  calling code's point of view — both xterm's probe and jsdom's real
  `getContext` end up giving it nothing usable — just without the console
  spam. No test in this suite exercises real canvas pixel operations under
  Jest (`image-crop.test.ts` etc. are explicitly documented as
  renderer-only/manually-verified for that), so nothing relies on a working
  canvas context here.
- `src/tests/core-0.8.0/terminal-dispose-guard.test.ts`: added a
  `beforeEach`/`afterEach` that spies on and mocks `console.error` for just
  this file's tests, restoring it afterward. Scoped locally rather than
  globally, so `console.error` still surfaces normally everywhere else.

### Files Changed

| File | Change |
|------|--------|
| `src/tests/setup.ts` | Added a global `HTMLCanvasElement.prototype.getContext` stub returning `null`, eliminating jsdom's "Not implemented" console-error spam from `@xterm/xterm`/`@xterm/addon-webgl`'s module-load-time canvas probing |
| `src/tests/core-0.8.0/terminal-dispose-guard.test.ts` | Added a `beforeEach`/`afterEach` pair that locally spies on and mocks `console.error` for the file's intentionally-throwing dispose tests |

### Test Results
- 57 suites passed, 0 failed (883 tests — unchanged, no test logic touched)
- Console output on a full `npm test` run is now empty aside from Jest's own `PASS`/summary lines
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
