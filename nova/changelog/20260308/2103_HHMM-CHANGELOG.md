# Changelog — 20260308.2103

## Ad hoc: Left-justify checkbox menu items, checkmark on right

### Problem
Checkbox menu items (Show Hidden Files, Developer Tools) had the checkmark on the left before the label, pushing the label text out of alignment with other menu items.

### Fix
- **`src/renderer/components/TitleBar.ts`**: Refactored checkbox menu item rendering. Label is now always left-justified (same as non-checkbox items). Checkmark appears on the right side, before the keyboard shortcut. Renamed "Developer Tools" to "Show Developer Tools" for consistency.

### Files Changed
- `src/renderer/components/TitleBar.ts`

### Test Results
- 39 suites, 638 tests — all passing
- Build compiles successfully

### Commit
TBD
