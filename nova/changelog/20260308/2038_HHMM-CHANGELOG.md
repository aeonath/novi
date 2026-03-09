# Changelog — 20260308.2038 (updated 2055)

## Ad hoc: Add Developer Tools toggle to Help menu with checkbox

### Problem
The Developer Tools option was only in the native Electron menu (View menu), but Novi uses a custom CSS title bar with its own menu system. The custom Help menu had no Developer Tools entry, so users couldn't toggle devtools from the UI.

### Root Cause
The custom title bar (`TitleBar.ts`) has its own `MENUS` definition separate from the native Electron menu (`menu.ts`). The devtools entry was only in the native menu, which is not visible when `frame: false`.

### Fix
- **`src/renderer/components/TitleBar.ts`**: Added "Developer Tools" checkbox entry to Help menu with `Ctrl+Shift+I` shortcut. Uses `settingKey: 'devToolsEnabled'` for checkmark state and `mainManaged: true` flag so the renderer doesn't double-toggle the setting. Added `mainManaged` field to `MenuItem` interface. Also added "Report Issue" entry that was missing.
- **`src/main/main.ts`**: Added `ipcMain.handle('toggle-devtools')` IPC handler so the renderer can trigger devtools toggle. Added `devtools-opened`/`devtools-closed` event listeners to sync the setting and native menu when devtools are opened/closed externally.
- **`src/main/menu.ts`**: Moved Developer Tools from View menu to Help menu in the native menu (backup for when native menu is used). Dynamic label based on `devToolsEnabled` setting.
- **`src/preload/preload.ts`**: Added `toggleDevTools` bridge to expose the IPC handler to the renderer.
- **`src/types/global.d.ts`**: Added `toggleDevTools` to Window.api type.

### Files Changed
- `src/renderer/components/TitleBar.ts`
- `src/main/main.ts`
- `src/main/menu.ts`
- `src/preload/preload.ts`
- `src/types/global.d.ts`

### Test Results
- 39 suites, 638 tests — all passing
- Build compiles successfully

### Commit
TBD
