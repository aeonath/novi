# Changelog — 2026-03-05 20:10

## Phase 4: Root App conversion to vanilla TypeScript

### Summary
Replaced the React root (`App.tsx`, `AppContext.tsx`, `index.tsx`) with vanilla TypeScript equivalents (`App.ts`, `index.ts`). React is no longer used in the renderer process. The build script now points to `index.ts` and JSX/React configuration has been removed from esbuild.

### Files Changed
- **`src/renderer/components/App.ts`** — NEW. Vanilla TypeScript root application class (~800 lines). Owns all UI state as class properties, builds DOM layout imperatively, mounts all child components (TitleBar, TabBar, StatusBar, FileTree, GitPanel, MonacoEditor, Terminal, NoviShell, etc.), handles IPC listeners, keyboard shortcuts, menu commands, workspace save/restore, and terminal/shell instance management.
- **`src/renderer/index.ts`** — NEW. Vanilla entry point replacing `index.tsx`. Removes `React`/`ReactDOM` imports; bootstraps via `new App().mount(rootElement)`. Retains Monaco wait logic, debug mode gate, focus management, and error handlers.
- **`scripts/build-renderer.js`** — Updated entry point from `index.tsx` to `index.ts`; removed `jsx: 'automatic'` and `jsxImportSource: 'react'` config.
- **`src/renderer/components/App.tsx`** — DELETED.
- **`src/renderer/contexts/AppContext.tsx`** — DELETED (replaced by `src/renderer/core/app-state.ts` singleton).
- **`src/renderer/index.tsx`** — DELETED.
- **`src/renderer/contexts/`** — DELETED (empty directory after removing AppContext.tsx).

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds (tsc + esbuild + asset copy)

### Commit Hash
TBD
