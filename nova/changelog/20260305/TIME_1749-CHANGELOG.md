# Changelog — 2026-03-05 17:49

## React Refactor Phase 1: Leaf Components

### Summary
Rewrote 5 leaf components from React (.tsx) to vanilla TypeScript (.ts) classes using the Phase 0 infrastructure (Component base class, DOM helpers). Deleted the unused ActionHUD component. Updated App.tsx to mount vanilla components imperatively.

### Files Added
- `src/renderer/components/StatusBar.ts` — vanilla StatusBar with mount/destroy lifecycle
- `src/renderer/components/SavePrompt.ts` — vanilla modal with show(fileName, callbacks)/hide API
- `src/renderer/components/DiagnosticsPanel.ts` — vanilla modal, self-managing via window.__diagnosticsPanelAPI
- `src/renderer/components/RecoveryDialog.ts` — vanilla modal, auto-checks recovery files on mount
- `src/renderer/components/SettingsPanel.ts` — vanilla modal, self-managing via window.__settingsPanelAPI

### Files Deleted
- `src/renderer/components/StatusBar.tsx` — replaced by .ts version
- `src/renderer/components/SavePrompt.tsx` — replaced by .ts version
- `src/renderer/components/DiagnosticsPanel.tsx` — replaced by .ts version
- `src/renderer/components/RecoveryDialog.tsx` — replaced by .ts version
- `src/renderer/components/SettingsPanel.tsx` — replaced by .ts version
- `src/renderer/components/ActionHUD.tsx` — deleted (was already disabled/commented out)

### Files Modified
- `src/renderer/components/App.tsx` — updated to mount vanilla components via useEffect+refs instead of JSX; removed ActionHUD references; save prompt logic moved to useEffect sync

### Test Results
- All 654 tests pass (36 suites)
- Build succeeds without errors

### Commit Hash
TBD
