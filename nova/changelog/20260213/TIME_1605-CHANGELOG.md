# Ad hoc — Sync Novi Shell version and copyright with app — 20260213.1605

## Summary
Novi Shell welcome message and `version` command now show the same version (0.6.6-dev) and copyright year (2026) as Help → About Novi Editor.

## Files Changed

### Modified
- **src/renderer/components/NoviShell.tsx** — Welcome line: `Novi Shell v0.6.0-dev` → `Novi Shell v0.6.6-dev`. `version` command: `Novi Editor v0.6.0-dev` → `Novi Editor v0.6.6-dev`; copyright `© 2025` → `© 2026 MiraNova Studios`.

## Reason
User reported version numbers were not synced: Novi Shell showed v0.6.0-dev while Help → About showed 0.6.6-dev (correct). Copyright in the shell was 2025; About uses 2026.

## Git Commit Hash
`TBD` — Ad hoc: sync Novi Shell version and copyright

## Status
✅ Completed
