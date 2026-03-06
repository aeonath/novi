# React Removal Plan — Novi TDE

## Rationale

React adds ~1.5MB bundle weight, virtual DOM overhead, and conceptual complexity to what is fundamentally an imperative application. The two core libraries (xterm.js, Monaco Editor) are imperative APIs wrapped in React components. Inter-component communication already bypasses React via `window.__tabBarAPI`, `window.__monacoEditorAPI`, and `window.__terminalAPI`. The codebase uses no advanced React features — no router, no state library, no CSS-in-JS, no animations. Removing React aligns the code with its actual architecture.

## Approach

- Vanilla TypeScript with direct DOM manipulation
- Each component becomes a class or module that owns its DOM element
- A lightweight event bus replaces Context for cross-component communication
- Components expose public APIs directly (replacing window globals with typed imports)
- esbuild continues as the bundler (already used for renderer)

## Dependency Map

Components ranked by dependency depth (leaf = no child components, root = depends on many):

```
Leaf components (no children):
  StatusBar         188 lines
  SavePrompt        169 lines
  DiagnosticsPanel  146 lines
  RecoveryDialog    223 lines
  SettingsPanel     211 lines
  ActionHUD         335 lines  (disabled, can delete)

Mid-level (one layer of dependencies):
  Terminal          568 lines  (wraps xterm.js)
  NoviShell         558 lines  (wraps xterm.js)
  MonacoEditor      959 lines  (wraps Monaco)
  ImageEditor     1,180 lines  (standalone canvas/img logic)
  GitPanel          730 lines  (standalone)
  FileTree        1,007 lines  (recursive, self-referencing)

Container components:
  TabBar            404 lines  (renders tab list)
  TitleBar          484 lines  (renders title + buttons)

Root:
  AppContext         79 lines  (shared state provider)
  App.tsx          2,502 lines (orchestrator)
  index.tsx          226 lines (entry point)
```

## Migration Order

Work bottom-up: leaves first, root last. Each task is one component or one infrastructure piece. After each task, the app must still compile and run — React and vanilla components coexist during migration via DOM mounting.

---

### Phase 0: Infrastructure

**Task 0.1 — Event Bus + Component Base Class**
- Create `src/renderer/core/event-bus.ts` — typed publish/subscribe for cross-component events
- Create `src/renderer/core/component.ts` — minimal base class with `mount(container)`, `unmount()`, `destroy()` pattern
- Create `src/renderer/core/dom.ts` — small DOM helper (`el('div', { className: 'foo' }, children)`) to keep element creation readable without JSX
- Write tests for event bus
- **No app changes yet** — purely additive

**Task 0.2 — Shared State Module**
- Create `src/renderer/core/app-state.ts` — replaces AppContext
- Holds: theme, activeFilePath, gitStatus, agentMode, workspaceRoot
- Exposes getters, setters, and event-bus subscriptions for changes
- **No app changes yet** — purely additive

---

### Phase 1: Leaf Components

Each task: rewrite one component as a vanilla TS class, mount it from the existing React tree using a thin React wrapper (`useEffect` + `ref` to mount/unmount). This lets the new component run inside the still-React app.

**Task 1.1 — StatusBar** (188 lines, simplest component)
- Rewrite as `src/renderer/components/StatusBar.ts`
- Subscribes to app-state for theme, activeFilePath
- React wrapper in `StatusBarBridge.tsx` mounts it during transition
- Validate: status bar renders identically

**Task 1.2 — SavePrompt** (169 lines)
- Modal overlay + 3 buttons (Save / Don't Save / Cancel)
- Rewrite as `src/renderer/components/SavePrompt.ts`
- Accepts callbacks: onSave, onDiscard, onCancel
- Show/hide via `display: none/flex`

**Task 1.3 — DiagnosticsPanel** (146 lines)
- Rewrite as `src/renderer/components/DiagnosticsPanel.ts`
- Static info display with close button

**Task 1.4 — RecoveryDialog** (223 lines)
- Modal with file list and recover/dismiss actions
- Rewrite as `src/renderer/components/RecoveryDialog.ts`

**Task 1.5 — SettingsPanel** (211 lines)
- Settings form with toggle switches
- Rewrite as `src/renderer/components/SettingsPanel.ts`

**Task 1.6 — Delete ActionHUD** (335 lines)
- Currently disabled/unused — remove entirely
- Remove all references from App.tsx

---

### Phase 2: Mid-Level Components

**Task 2.1 — Terminal** (568 lines)
- Already 90% imperative xterm.js code
- Rewrite as `src/renderer/components/Terminal.ts`
- Handles: PTY creation, resize observer, fit addon, context menu, focus management
- Exposes: write(), focus(), resize(), dispose()

**Task 2.2 — NoviShell** (558 lines)
- Similar to Terminal but with REPL command handling instead of PTY
- Rewrite as `src/renderer/components/NoviShell.ts`

**Task 2.3 — MonacoEditor** (959 lines)
- Wraps Monaco's imperative API
- Rewrite as `src/renderer/components/MonacoEditor.ts`
- Exposes: openFile(), getValue(), revealLine(), focus(), dispose()
- Remove forwardRef/useImperativeHandle — just export the class API directly

**Task 2.4 — GitPanel** (730 lines)
- File change list, staging, commit form, push/pull buttons
- Rewrite as `src/renderer/components/GitPanel.ts`
- DOM list rendering for staged/unstaged files

**Task 2.5 — ImageEditor** (1,180 lines)
- Canvas-based crop/resize/zoom tools
- Rewrite as `src/renderer/components/ImageEditor.ts`
- State machine for tool modes (crop, resize, zoom)

**Task 2.6 — FileTree** (1,007 lines)
- Recursive directory tree with expand/collapse
- Rewrite as `src/renderer/components/FileTree.ts`
- Use a flat list with indentation (virtual DOM not needed for tree rendering)
- Context menu, drag selection, keyboard navigation

---

### Phase 3: Container Components

**Task 3.1 — TabBar** (404 lines)
- Tab list rendering, drag reorder, context menu, close buttons
- Rewrite as `src/renderer/components/TabBar.ts`
- DOM list with click/context-menu handlers

**Task 3.2 — TitleBar** (484 lines)
- Window controls, menu bar, title display
- Rewrite as `src/renderer/components/TitleBar.ts`

---

### Phase 4: Root — The Big One

**Task 4.1 — Extract App State Machine**
- Before rewriting App.tsx, extract its state logic into `src/renderer/core/app-controller.ts`
- All 20+ useState variables become properties on a controller class
- All useEffect blocks become explicit init/cleanup methods
- All useCallback handlers become controller methods
- This is the hardest task — App.tsx is 2,500 lines of interleaved state and effects
- The React App.tsx should still work after this, just delegating to the controller

**Task 4.2 — Rewrite App Shell**
- Replace App.tsx with `src/renderer/App.ts`
- Uses app-controller to manage state
- Mounts all child components into their DOM containers
- Handles tab routing: show/hide content areas based on active tab type
- Wires up IPC listeners, keyboard shortcuts, menu commands

**Task 4.3 — Rewrite index.tsx**
- Replace `ReactDOM.createRoot` with direct DOM mounting
- `new App(document.getElementById('root'))`
- Remove React and ReactDOM imports entirely

---

### Phase 5: Cleanup

**Task 5.1 — Remove React Dependencies**
- `npm uninstall react react-dom @types/react @types/react-dom`
- Remove all `.tsx` files (should be none left)
- Update `tsconfig.renderer.json` — remove `jsx: "react-jsx"`
- Update esbuild config — remove JSX handling
- Update any test mocks that reference React

**Task 5.2 — Remove Bridge Components**
- Delete all `*Bridge.tsx` wrapper files created during migration
- Remove `src/renderer/contexts/` directory

**Task 5.3 — Clean Up Window Globals**
- Replace `window.__tabBarAPI`, `window.__monacoEditorAPI`, `window.__terminalAPI` with direct imports or event-bus communication
- Remove global type declarations from `src/types/`

**Task 5.4 — Final Validation**
- Full build: `npm run build`
- Full test suite: `npm test`
- Manual smoke test: open app, verify all features work
- Check bundle size reduction

---

## Rules During Migration

1. **One task per session** — complete, test, commit before moving on
2. **App must always run** — React and vanilla coexist during transition via bridge wrappers
3. **No feature changes** — pure refactor, identical behavior
4. **Tests must pass** after every task
5. **New .ts files get copyright header**, bridge .tsx files are temporary and will be deleted

## Expected Outcome

- ~10,000 lines of `.tsx` become ~8,000-9,000 lines of `.ts` (JSX markup becomes more verbose but logic stays same)
- Bundle size drops ~1.5MB (react + react-dom removed)
- Startup time improves (no React reconciler initialization)
- No virtual DOM diffing on every state change
- Component APIs are direct method calls instead of prop drilling or window globals
- Codebase matches its actual imperative architecture
