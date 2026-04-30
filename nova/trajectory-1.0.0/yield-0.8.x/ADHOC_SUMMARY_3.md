# Ad Hoc Summary 3 — Move keeptabs to Settings > Novi

**Sprint**: Sprint 8 (yield-0.8.x)

## What changed

`keeptabs` moved from the Novi Shell REPL to **Settings → Novi** as "Restore Previous
Session". The `set keeptabs on/off` command has been removed from the shell.

## Files changed

| File | Change |
|------|--------|
| `src/renderer/components/SettingsTab.ts` | Added `keeptabsEnabled` field, loaded in `loadSettings()`, rendered in `renderNoviSettings()` |
| `src/renderer/components/NoviShell.ts` | Removed `keeptabs` from display, valid options, error message, and help text |
| `src/tests/core-0.8.0/settings-tab.test.ts` | Updated Novi section test to cover Restore Previous Session toggle |

## Behaviour

The toggle writes `keeptabs` to `settings.json`. There is no runtime event — the
setting is read at startup (to decide whether to restore tabs) and on workspace save
(to decide whether to persist). Takes effect on next launch.

Default is **on** (session restore enabled).
