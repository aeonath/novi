# Changelog — 20260308.2038

## Ad hoc: Move Developer Tools to Help menu with Enable/Disable toggle

### Problem
The Developer Tools option was in the View menu as a simple toggle. The user wanted it in the Help menu with clear Enable/Disable labeling, and for the Ctrl+Shift+I shortcut to respect the current state.

### Fix
- **`src/main/menu.ts`**: Moved Developer Tools from View menu to Help menu. Label dynamically shows "Enable Developer Tools" or "Disable Developer Tools" based on the `devToolsEnabled` setting. Keeps Ctrl+Shift+I accelerator.
- **`src/main/main.ts`**: Updated `handleMenuCommand` to use `openDevTools()`/`closeDevTools()` instead of `toggleDevTools()`, persists state via `devToolsEnabled` setting, and rebuilds the menu to update the label. Added `devtools-opened`/`devtools-closed` event listeners to sync the setting and menu when devtools are opened or closed externally (e.g., closing the devtools window with its X button).

### Files Changed
- `src/main/menu.ts`
- `src/main/main.ts`

### Test Results
- 39 suites, 638 tests — all passing
- Build compiles successfully

### Commit
TBD
