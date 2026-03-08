# Changelog — 20260308.0832

## Summary
Added an exit confirmation dialog when the home terminal exits. Instead of immediately quitting, a modal asks "Do you really want to exit?" with Yes/No buttons. Selecting No restarts the home terminal; selecting Yes quits the app.

## Files Changed
- `src/renderer/components/App.ts` — Replaced `window.api?.quit?.()` on home terminal exit with `showExitConfirmDialog()`; added `exitConfirmOverlay` property, `showExitConfirmDialog()` and `hideExitConfirmDialog()` methods

## Rationale
Prevents accidental app closure when users type `exit` in the home terminal. The confirmation dialog gives them a chance to cancel and restart the terminal instead.

## Test Results
- Build: ✅ Passes
- Tests: 642 passed, 4 failed (pre-existing failures in extension-loader and installer tests)

## Commit Hash
TBD
