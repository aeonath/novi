# React Refactor — Completion Summary

**Date:** 2026-03-05
**Branch:** `dev-refactor`
**Status:** Complete — all 5 phases finished, React fully removed

---

## Overview

The Novi Terminal Development Environment has been fully migrated from React to vanilla TypeScript. React, ReactDOM, and all associated type packages have been uninstalled. There are zero `.tsx` files remaining in the codebase. The renderer process uses direct DOM manipulation with a lightweight component base class, matching the imperative nature of the application's core dependencies (xterm.js, Monaco Editor).

---

## Phase-by-Phase Breakdown

### Phase 0: Core Infrastructure (`c0048b7`)

Created the foundational modules that all vanilla components depend on:

- **`src/renderer/core/event-bus.ts`** (50 lines) — Typed publish/subscribe event system for cross-component communication. Supports `on()`, `off()`, and `emit()` with generic event type maps.
- **`src/renderer/core/component.ts`** (77 lines) — Base class for all renderer components. Provides `mount(parent)`, `unmount()`, `destroy()` lifecycle methods, auto-cleanup event listener registration via `listen()`, and `addCleanup()` for arbitrary teardown logic.
- **`src/renderer/core/dom.ts`** (76 lines) — DOM helper functions: `el(tag, attrs, children)` for declarative element creation, `clearChildren()`, `setStyles()`, `setVisible()`. Replaces JSX markup with readable imperative calls.
- **`src/renderer/core/app-state.ts`** (69 lines) — Singleton store replacing React's `AppContext`. Holds theme, activeFilePath, gitStatus, agentMode, and workspaceRoot. Emits events via the event bus when values change.

**Tests added:** 4 test files (437 tests) covering event-bus, component lifecycle, DOM helpers, and app-state.

### Phase 1: Leaf Components (`7bc01c8`)

Converted the 5 simplest components (no child component dependencies) and deleted the unused ActionHUD:

| Component | Old (.tsx) | New (.ts) | Notes |
|-----------|-----------|-----------|-------|
| StatusBar | 188 lines | 176 lines | Subscribes to app-state for theme/path updates |
| SavePrompt | 169 lines | 114 lines | Modal with Save/Don't Save/Cancel callbacks |
| DiagnosticsPanel | 146 lines | 120 lines | Static info display with close button |
| RecoveryDialog | 223 lines | 172 lines | Modal with file list and recover/dismiss actions |
| SettingsPanel | 211 lines | 187 lines | Settings form with toggle switches |
| ActionHUD | 335 lines | **Deleted** | Was already disabled/unused |

Each new `.ts` component was mounted from the still-React `App.tsx` via `useEffect` + `useRef` bridge patterns. The app remained fully functional throughout.

**Net result:** -442 lines, 1 component deleted entirely.

### Phase 2: Mid-Level Components (`fae07b3`)

Converted the 6 heavyweight components that wrap imperative libraries:

| Component | Old (.tsx) | New (.ts) | Notes |
|-----------|-----------|-----------|-------|
| Terminal | 568 lines | 333 lines | Wraps xterm.js + node-pty. FitAddon, WebGL renderer, context menu, focus management |
| NoviShell | 558 lines | 361 lines | xterm.js REPL with command parsing (set, help, clear, etc.) |
| MonacoEditor | 959 lines | 492 lines | Wraps Monaco API. Model management, theme sync, Vim mode, extension loading |
| GitPanel | 730 lines | 400 lines | File change list, staging, commit form, push/pull/sync buttons |
| ImageEditor | 1,180 lines | 883 lines | Canvas-based crop/resize/zoom with tool state machine |
| FileTree | 1,007 lines | 747 lines | Recursive directory tree with expand/collapse, context menu, drag selection |

`App.tsx` was updated with bridge wrappers — `useRef` containers for each vanilla component, `useEffect` hooks for mount/unmount, and callback ref patterns to avoid stale closure issues. Window globals (`window.__terminalAPI`, `window.__monacoEditorAPI`, `window.__tabBarAPI`) were preserved for cross-component communication.

**Net result:** -1,669 lines. Components became significantly shorter because React lifecycle boilerplate (useEffect, useCallback, useRef, forwardRef/useImperativeHandle) was replaced with direct class methods.

**Bug fixes during Phase 2:**
- `6641c2f` — Fixed `currentFileTreeDisplayRoot` reference-before-initialization (temporal dead zone from `useMemo` ordering)
- `d4cad8b` — Fixed `actionContext` temporal dead zone in `App.tsx` (same class of issue — `useMemo` defined after `useEffect` that referenced it)

### Phase 3: Container Components (`656eac8`)

Converted the two container components that manage tab and title bar rendering:

| Component | Old (.tsx) | New (.ts) | Notes |
|-----------|-----------|-----------|-------|
| TabBar | 404 lines | 322 lines | Tab list with add/remove/switch, context menu (Copy/Paste/Close for novi-prompt tabs), pinned tab support, dirty indicators |
| TitleBar | 484 lines | 363 lines | Menu bar (File/Edit/View/Novi/Help) with dropdown rendering, window controls (minimize/maximize/close) with SVG icons, `-webkit-app-region: drag` |

Both expose `updateConfig()` methods for reactive prop changes from the parent. `TabBar` exposes `window.__tabBarAPI` on mount and signals `markReady('tabbar-ready')` for coordination. `TitleBar` manages maximize/restore state via IPC.

**Net result:** -203 lines.

### Phase 4: Root App + Entry Point (`90836b6`)

The biggest single change — replaced the 2,634-line React `App.tsx` and 79-line `AppContext.tsx` with a single 1,395-line vanilla `App.ts`:

**State migration:**
- ~20 `useState` hooks → class properties (`activeTab`, `terminalTabs`, `noviPromptTabs`, `sidebarWidth`, `fontSize`, `terminalFontSize`, `showWelcome`, `showGitPanel`, `workspaceRoot`, etc.)
- ~40 `useEffect` hooks → explicit setup methods: `setupIpcListeners()`, `setupKeyboardShortcuts()`, `loadSettings()`, `loadWorkspace()`, `observeMonaco()`
- ~30 `useCallback` hooks → class methods: `handleMenuCommand()`, `openFile()`, `closeFile()`, `newTerminal()`, `switchTab()`, `saveFile()`, etc.

**Key architectural decisions:**
- `buildLayout()` constructs the entire DOM tree imperatively (title bar, tab bar, sidebar with file tree + git panel, content area, status bar, overlay panels)
- `mountChildComponents()` instantiates and mounts all child vanilla components
- `setActiveTab()` is the central state transition — updates visibility of content panels, syncs file tree, triggers workspace save
- `syncTerminalInstances()` and `syncNoviShellInstances()` manage Maps of multi-instance components
- `currentFileTreeDisplayRoot` is a getter property computing the display root from active tab state
- Workspace saving is debounced via `saveWorkspaceDebounced` (500ms)

**Entry point (`index.ts`):**
- `ReactDOM.createRoot(rootElement).render(<App />)` → `new App().mount(rootElement)`
- Retained: Monaco wait loop, debug mode gate, focus management, error handlers
- Removed: React and ReactDOM imports

**Net result:** -1,307 lines (2,713 deleted, 1,406 added).

### Phase 5: Dependency Cleanup (`629a40f`)

Stripped all React-related packages and configuration:

**Packages removed from `package.json`:**
- `react` (^18.3.1) — from dependencies
- `react-dom` (^18.3.1) — from dependencies
- `@types/react` (^18.3.26) — from dependencies (was misplaced here)
- `@types/react-dom` (^18.3.7) — from dependencies (was misplaced here)
- `@testing-library/react` (^16.3.0) — from devDependencies

**npm result:** 17 packages removed from node_modules.

**Config changes:**
- `tsconfig.renderer.json` — Removed `"jsx": "react"`, removed `.test.tsx` from exclude patterns
- `scripts/build-renderer.js` — Entry point changed to `index.ts` (Phase 4), `jsx: 'automatic'` and `jsxImportSource: 'react'` removed (Phase 4)
- `CLAUDE.md` — Updated project description, architecture diagrams, component system docs, state management docs, testing section, import conventions, copyright header rule

---

## Final Statistics

### Line Counts

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| `.tsx` files | 15 files, ~10,500 lines | 0 files | -10,500 lines |
| `.ts` renderer files | ~2,500 lines (core/utils) | ~9,173 lines (components + core + utils) | +6,673 lines |
| **Net renderer code** | **~13,000 lines** | **~9,173 lines** | **-3,827 lines (-29%)** |

### Dependency Impact

| Package | Size (approx) |
|---------|--------------|
| react | ~140 KB (minified) |
| react-dom | ~1.1 MB (minified) |
| scheduler (react dep) | ~30 KB |
| **Total removed** | **~1.3 MB from bundle** |

### Commit History

| Commit | Phase | Description |
|--------|-------|-------------|
| `c0048b7` | 0 | Core infrastructure (event bus, component base, DOM helpers, app state) |
| `7bc01c8` | 1 | Leaf components to vanilla TS, delete ActionHUD |
| `fae07b3` | 2 | Terminal, NoviShell, MonacoEditor, GitPanel, ImageEditor, FileTree |
| `6641c2f` | 2-fix | Fix currentFileTreeDisplayRoot reference before initialization |
| `d4cad8b` | 2-fix | Fix actionContext temporal dead zone in App.tsx |
| `656eac8` | 3 | TabBar and TitleBar to vanilla TS |
| `90836b6` | 4 | Root App.ts + index.ts, delete App.tsx/AppContext.tsx/index.tsx |
| `629a40f` | 5 | Strip React packages, update configs and docs |

### Test Results

- **36 test suites, 654 tests — all passing** at every phase
- 4 new test files added in Phase 0 (event-bus, component, dom, app-state)
- Zero test modifications needed for the migration (tests only cover `.ts` files, not `.tsx`)
- Build succeeds at every phase (tsc + esbuild + asset copy)

---

## Patterns Established

### Component Lifecycle
```typescript
class MyComponent extends Component {
  constructor() {
    super('div', 'my-component');  // tag, className
    this.buildLayout();
  }
  protected onMount(): void { /* setup */ }
  protected onDestroy(): void { /* cleanup */ }
}
```

### Event Listener Auto-Cleanup
```typescript
// Automatically removed on destroy()
this.listen(window, 'resize', () => this.handleResize());
this.listen(document, 'keydown', (e) => this.handleKey(e));
```

### Cross-Component Communication
- `window.__tabBarAPI` — tab management (add, remove, switch, get active)
- `window.__monacoEditorAPI` — editor control (open file, get value, focus)
- `window.__terminalAPI` — terminal instances (focus, write, dispose)
- `appState` singleton — shared state (theme, workspace root, git status)
- `markReady()` / `ensureReady()` — initialization coordination between components

### DOM Creation
```typescript
const panel = el('div', {
  style: 'display: flex; flex-direction: column;',
  className: 'my-panel',
}, [
  el('h2', {}, 'Title'),
  el('button', { onclick: () => this.handleClick() }, 'Click me'),
]);
```

---

## Remaining Opportunities (Future Work)

These were identified in the refactor plan but intentionally deferred:

1. **Replace window globals with direct imports** — `window.__tabBarAPI` etc. could become typed imports from component modules. Deferred because the globals work and changing them risks breaking inter-component contracts.

2. **Remove `tab-bar.ts` (lowercase)** — The old Phase 0 vanilla TabBar still exists alongside the new `TabBar.ts`. The `auto-save.ts` service imports `Tab` type from the old file. Should unify the `Tab` type and delete the old file.

3. **Bundle size audit** — The 6.8MB bundle includes Monaco Editor assets. Could investigate tree-shaking or lazy loading Monaco languages to reduce further.
