# Changelog — Ad hoc: Move VI Mode from Novi Shell to Settings page

**Date**: 20260429.1745
**Commit**: TBD

---

## Summary

First step in migrating all Novi Shell settings to the Settings page (ADHOC_SUMMARY_1.md).
VI Mode is now configured in **Settings → Editor** with a toggle and description.
The `set vimode on/off` command has been removed from the Novi Shell REPL.

## Files Changed

| File | Change |
|------|--------|
| `nova/trajectory-1.0.0/yield-0.8.x/ADHOC_SUMMARY_1.md` | New — documents the full migration plan and tracks per-setting status |
| `src/renderer/components/SettingsTab.ts` | Replace editor placeholder with `renderEditorSettings()`; add `createToggleRow` helper; load `vimode` in `loadSettings()` |
| `src/renderer/components/NoviShell.ts` | Remove `vimode` from display, valid options, error text, event map, and help example |
| `src/tests/core-0.8.0/settings-tab.test.ts` | Update editor section test to verify VI Mode toggle instead of old placeholder |

## Behaviour

- Settings → Editor → VI Mode checkbox: reads `vimode` setting on load, saves on toggle, dispatches `novi-vimode-changed` so MonacoEditor reacts immediately without restart.
- `set vimode` in the Novi Shell now returns "Unknown option".

## Test Results

666/666 passing — no regressions.
