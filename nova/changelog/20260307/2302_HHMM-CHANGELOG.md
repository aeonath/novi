# Changelog — 20260307.2302

## Ad hoc: Set app icon and default font to DejaVu Sans Mono

### Summary
- Added `icon` property to BrowserWindow so the app icon displays on Linux
- Changed default font from Cascadia Code fallback chain to `'DejaVu Sans Mono', monospace` to match gnome-terminal default

### Files Changed
| File | Change |
|------|--------|
| `src/main/main.ts` | Added `icon: join(__dirname, '../../build/icon.png')` to BrowserWindow options |
| `src/renderer/components/Terminal.ts` | Changed fontFamily to `'DejaVu Sans Mono', monospace` (2 locations: temp terminal + main terminal) |
| `src/renderer/components/MonacoEditor.ts` | Changed fontFamily to `'DejaVu Sans Mono', monospace` |

### Test Results
- 37 passed, 2 failed (pre-existing Windows installer tests) — no regressions

### Commit Hash
TBD
