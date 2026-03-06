# Changelog — 2026-03-05 18:21

## Summary

React Refactor Phase 2: Rewrote 6 leaf-level React components as vanilla TypeScript classes and integrated them into App.tsx via imperative mounting.

## Components Converted

| Component | Old (React) | New (Vanilla) | Lines |
|-----------|------------|--------------|-------|
| Terminal | Terminal.tsx | Terminal.ts | ~250 |
| NoviShell | NoviShell.tsx | NoviShell.ts | ~362 |
| MonacoEditor | MonacoEditor.tsx | MonacoEditor.ts | ~500 |
| GitPanel | GitPanel.tsx | GitPanel.ts | ~600 |
| ImageEditor | ImageEditor.tsx | ImageEditor.ts | ~560 |
| FileTree | FileTree.tsx | FileTree.ts | ~530 |

## Files Changed

- `src/renderer/components/Terminal.ts` — NEW: Vanilla xterm.js wrapper with two-phase PTY init, WebGL addon, context menu
- `src/renderer/components/NoviShell.ts` — NEW: Vanilla REPL shell with settings commands
- `src/renderer/components/MonacoEditor.ts` — NEW: Vanilla Monaco wrapper with vim mode, extensions, theme sync
- `src/renderer/components/GitPanel.ts` — NEW: Vanilla git panel with stage/unstage/commit/push/pull
- `src/renderer/components/ImageEditor.ts` — NEW: Vanilla image editor with crop/resize/transparency/undo-redo
- `src/renderer/components/FileTree.ts` — NEW: Vanilla file tree with file watcher, context menu, file operations
- `src/renderer/components/App.tsx` — MODIFIED: Replaced JSX usage of above components with container divs + useEffect imperative mounting
- `src/renderer/components/Terminal.tsx` — DELETED
- `src/renderer/components/NoviShell.tsx` — DELETED
- `src/renderer/components/MonacoEditor.tsx` — DELETED
- `src/renderer/components/GitPanel.tsx` — DELETED
- `src/renderer/components/ImageEditor.tsx` — DELETED
- `src/renderer/components/FileTree.tsx` — DELETED

## Integration Pattern

All Phase 2 vanilla components are mounted from the still-React App.tsx using:
- `useRef` for container divs and component instance references
- `useEffect` for mounting/unmounting lifecycle management
- Callback refs pattern for avoiding stale closures in callbacks
- Multi-instance management (Map refs) for Terminal and NoviShell tabs

## Test Results

- 654 tests passing (36 suites)
- Build successful
- No new tests required (Phase 2 components are UI-only; existing tests cover the underlying services)

## Commit

TBD
