# Ad Hoc Summary 2 — Remove Compat Setting

**Sprint**: Sprint 8 (yield-0.8.x)
**Goal**: Delete the `compat` option entirely. It never did anything functional and
will not be migrated to the Settings page.

---

## What was removed

| Location | Change |
|----------|--------|
| `src/renderer/components/NoviShell.ts` | Removed `compat` from settings display, valid options, error message, and help text |
| `src/main/novirc.ts` | Removed `compat` (and stale `debug`) from the supported keys comment |
| `src/tests/core-0.6.0/vimode-setting.test.ts` | Deleted the `compat setting` describe block |

## Why not migrated to Settings page

`compat` was a placeholder for a future command-mapping layer that was never
implemented. No code path reads or acts on the `compat` setting value, so
there is nothing to preserve.

## Impact

- `set compat on/off` in the Novi Shell now returns "Unknown option".
- Any `compat=true` entry in `~/.novirc` is silently ignored (key parsed, never consumed).
- No behaviour change anywhere else — the setting was inert.
