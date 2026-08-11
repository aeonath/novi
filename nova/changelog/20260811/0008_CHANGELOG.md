# Changelog — 2026-08-11 00:08

## Ad hoc: Add Terminal Scrollback setting (default 25k, 10k–200k)

### Summary
User requested a terminal scrollback (history buffer) setting: default
25,000 lines, allowing up to 200,000 with a minimum of 10,000, added as a
new option under Terminal Settings.

### Implementation
`Terminal.ts` had `scrollback: 10000` hardcoded directly in `initDisplay()`'s
xterm.js constructor call — the only place it was set. Followed the same
config/prop/settings-wiring pattern already established for terminal font
size and font family:

- **`Terminal.ts`**: added `scrollback` to `TerminalConfig` (default 25000),
  used it in place of the hardcoded `10000`, and added a `scrollbackProp`
  setter for live updates. Unlike `fontSizeProp`/`fontFamilyProp`, scrollback
  doesn't affect cell dimensions or the current viewport — it only changes
  how many lines xterm retains off-screen — so there's no `fitAddon.fit()`
  call needed and therefore none of the hidden-container destructive-fit
  danger those two setters have to guard against. It's applied directly to
  `terminal.options.scrollback` regardless of whether the tab is currently
  active.
- **`App.ts`**: added `terminalScrollback` (default 25000), loaded in
  `loadSettings()`, threaded into new `Terminal` instances, applied via
  `entry.instance.scrollbackProp` in `syncTerminalActiveState()` (same
  per-instance sync loop as font size/family), and a
  `novi-terminalscrollback-changed` live-update listener.
- **`SettingsTab.ts`**: new "History" section under Terminal Settings — a
  single "Scrollback (lines)" number field, default 25000, clamped to
  `[10000, 200000]` (reusing `createNumberFieldRow`'s existing optional
  min/max parameters, no new UI primitive needed).

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | Added `scrollback` to `TerminalConfig` (default 25000) and a `scrollbackProp` live-update setter; replaced the hardcoded `scrollback: 10000` in `initDisplay()` |
| `src/renderer/components/App.ts` | Added `terminalScrollback` field/loading/live-update listener; threaded into `Terminal` construction and `syncTerminalActiveState()` |
| `src/renderer/components/SettingsTab.ts` | New "History" section (Scrollback number field, 10000–200000) under Terminal Settings |
| `src/tests/core-0.8.0/terminal-activate-no-resize.test.ts` | New `Terminal.scrollbackProp` describe block (4 tests) |
| `src/tests/core-0.8.0/settings-tab.test.ts` | New tests for the Scrollback field's default and clamped persistence; fixed one existing test's text-input index, shifted by the new field |

### Test Results
- 60 suites passed, 0 failed (921 tests, up from 915 — 6 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
