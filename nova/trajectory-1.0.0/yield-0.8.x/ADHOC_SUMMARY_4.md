# Ad Hoc Summary 4 — Move gitenabled to Settings > Novi

**Sprint**: Sprint 8 (yield-0.8.x)

## What changed

`gitenabled` moved from the Novi Shell REPL to **Settings → Novi** as "Built-in Git
Support". The `set gitenabled on/off` command has been removed from the shell.

## Files changed

| File | Change |
|------|--------|
| `src/renderer/components/SettingsTab.ts` | Added `gitenabledEnabled` field, loaded in `loadSettings()`, rendered in `renderNoviSettings()` under a new "Git" section group |
| `src/renderer/components/NoviShell.ts` | Removed `gitenabled` from display, valid options, error message, and event map |
| `src/tests/core-0.8.0/settings-tab.test.ts` | Updated Novi section test to cover Built-in Git Support toggle |

## Behaviour

The toggle writes `gitenabled` to `settings.json` and dispatches
`novi-gitenabled-changed` with `{ enabled }` so App.ts reacts immediately —
hiding or showing the git panel and file tree git toggle without a restart.

Default is **on** (git support enabled).
