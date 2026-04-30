# Changelog — Ad hoc: novi no-args launches app normally when not running

**Date**: 20260429.1710  
**Commit**: TBD

---

## Summary

Changed behavior of `novi` (no args) when NoviEditor is not already running. Previously it spawned `NoviEditor --novi-new-file`, forcing an empty file tab on startup. Now it spawns `NoviEditor` with no flags, letting the app start normally (restoring the previous session).

When NoviEditor **is** running, `novi` with no args still sends `{ cmd: 'new-file' }` over the pipe, opening a new empty file tab in the existing instance — no change there.

## Files Changed

| File | Change |
|------|--------|
| `src/main/cli-mode.ts` | In the socket error handler, spawn with no flags when cmd is `new-file` |

## Behavior After Fix

| Invocation | Editor running | Result |
|------------|----------------|--------|
| `novi` | No | Launches NoviEditor normally (restores last session) |
| `novi` | Yes | Opens new empty file tab in running editor |
| `novi file.ts` | No | Launches NoviEditor, opens file once ready |
| `novi file.ts` | Yes | Opens file in tab immediately |
| `novi -t` | No | Launches NoviEditor, opens terminal tab in cwd |
| `novi -t` | Yes | Opens terminal tab in cwd immediately |

## Test Results

666/666 passing — no regressions.
