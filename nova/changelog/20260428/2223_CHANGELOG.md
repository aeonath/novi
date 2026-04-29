# Changelog — 2026-04-28 22:23

## Sprint 8 — Novi Command Step 8: tsconfig Verification

### Summary
Verified that `tsconfig.json` already covers all new CLI source files. No changes required.

### Verification

- `"include": ["src/**/*"]` — covers `src/main/cli-mode.ts` and `src/main/services/cli-service.ts`
- `"exclude"` — only removes `node_modules`, `dist`, and `src/renderer`; `src/main/` is fully included
- `tsc --noEmit` — clean compile, zero errors

### Files Changed
None.

### Test Results
- 638 tests passed, 0 failed (39 suites)

### Commit
TBD
