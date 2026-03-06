# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Novi** — a Terminal Development Environment (TDE) built with Electron, React, and TypeScript. Formerly called "Nova IDE"; the `nova/` directory is intentionally kept as-is.

## Commands

```bash
npm start              # clean + build + launch Electron
npm run start:fast     # build + launch (skip clean)
npm run build          # compile everything (main + renderer)
npm test               # run all Jest tests
npm run test:coverage  # coverage report

# Run a single test file
npx jest src/tests/core-0.6.0/novi-command.test.ts
# Or by pattern:
npm test -- --testPathPattern=novi-command

npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run fmt            # Prettier format
npm run pack:win       # build portable Windows EXE
```

## Build System

The build is two-stage:

1. **Main / Preload / Core** — `tsc -p tsconfig.json`
   - Compiles `src/main/`, `src/preload/`, `src/core/`, `src/tests/`, `src/types/` → `dist/` (CommonJS)
   - `src/renderer/` is **excluded** from this tsconfig

2. **Renderer** — `node scripts/build-renderer.js` (esbuild)
   - Bundles `src/renderer/index.tsx` → `dist/renderer/index.js` (IIFE, browser target)
   - Handles `.tsx`, React JSX, and CSS imports
   - `tsconfig.renderer.json` exists for editor tooling but esbuild drives the actual build

After compilation, `copy:renderer` and `copy:monaco` scripts copy static assets (HTML, images, Monaco worker files, xterm.css) into `dist/renderer/`.

## Architecture

### Process Model (Electron)

```
Main Process (Node.js)              Renderer Process (Browser/React)
src/main/                           src/renderer/
  main.ts       ←── IPC ──────────→   components/App.tsx  (root)
  menu.ts                               components/*.tsx
  services/                             contexts/AppContext.tsx
  novi-stub.ts                          vim/
```

All renderer↔main communication goes through `window.api` (exposed via `contextBridge` in `src/preload/preload.ts`). The renderer **never** calls Node/Electron APIs directly.

### IPC Flow

- **Renderer → Main**: `window.api.someMethod()` → `ipcRenderer.invoke(channel)` → `ipcMain.handle(channel)`
- **Menu commands**: Electron menu → `main.ts handleMenuCommand()` → either handled in main (e.g. `toggle-devtools`) or forwarded to renderer via `webContents.send('menu-command', command)` → `App.tsx` listens on `'menu-command'`

### React State

- **`AppContext`** (`src/renderer/contexts/AppContext.tsx`): global shared state — theme, activeFilePath, gitStatus, agentMode, workspaceRoot
- **`App.tsx`** (`src/renderer/components/App.tsx`): owns most UI state — open tabs, terminal/shell tab lists, sidebar width, font sizes, file tree roots, save prompts

### Tab System

Tabs are typed: `'file' | 'image' | 'terminal' | 'novi-prompt'`. Each has a unique string ID. `App.tsx` maintains the tab list and routes rendering to `MonacoEditor`, `ImageEditor`, `Terminal`, or `NoviShell` based on tab type.

### File Tree

Two modes controlled by the `singlefiletree` setting:
- `false` (default): each terminal tab tracks its own CWD; file tabs inherit the tree from when the file was opened
- `true`: one shared file tree for all tabs (legacy behavior)

### `#novi` Command Interception

`novi-stub.ts` places a no-op `novi` shell script on `PATH` so the shell doesn't error. `App.tsx` monitors PTY output line-by-line; lines matching `^\s*#novi` are intercepted before reaching the terminal and dispatched as editor commands (`#novi file.py` opens a file, `#novi -s` shows settings, `#novi -c` opens Novi Shell).

### Novi Shell

`NoviShell.tsx` is an xterm.js terminal running a REPL (no PTY). It handles `set <key> <value>` commands (`vimode`, `compat`, `singlefiletree`) by calling `window.api.setSetting()`. Settings take effect immediately and persist.

### Services (Main Process)

`src/main/services/` contains long-running Node.js services used by `main.ts`:
- `terminal-service.ts` — manages node-pty PTY instances per terminal ID
- `git-service.ts` + `git-watcher.ts` — git operations and file-change watching
- `file-tree-watcher.ts` — chokidar watcher for file tree updates
- `workspace-service.ts` — persists workspace state (open tabs, layout) across sessions
- `command-stats-service.ts` — tracks menu command usage

### Extension Loader

`src/core/extension-loader.ts` scans `~/.novi/extensions/` for TextMate grammar extensions and registers language support with Monaco. Only extensions with `activationEvents` limited to `onLanguage:*` are loaded.

## Testing

- Jest + ts-jest, jsdom environment
- Tests cover `.ts` files only — React components (`.tsx`) are **not** unit tested
- `src/tests/setup.ts` mocks `electron` (app.getPath) and suppresses console.log/info/warn
- Monaco Editor is mocked via `__mocks__/monaco-editor.ts` (root level, not in `src/`)
- Test suites: `core-0.1.0` through `core-0.6.0` (one directory per sprint)

## Renderer Import Conventions

Renderer TypeScript files import other local modules with `.js` extensions (not `.ts`):
```ts
import { AppProvider } from '../contexts/AppContext.js';
```
This is required because esbuild resolves `.js` → `.ts` at build time.

## Sprint / Docs Structure

Sprint plans and summaries live in `nova/aeon/trajectory-1.0.0/yield-X.X.X/`. The `nova/` directory name is intentional and should not be renamed.

---

## AI Agent Directives (from `nova/ai/CLAUDE_CONFIG.md`)

> Full config lives at `nova/ai/CLAUDE_CONFIG.md`. The rules below are the binding summary.

### Workflow — One Task at a Time

- Complete **one task**, then **STOP**. Wait for user instruction before starting the next.
- Never implement multiple tasks in one session unless explicitly told to.

### Git Commit Toggle

`USER_RESPONSE: YES` — AI agent **will** document, stage, commit, and write changelog entries.

### Date/Time

Always run `date +"%Y%m%d.%H%M"` (git-bash) **before** any work session. Never assume or guess the date.

### Mandatory Post-Task Steps (CHANGELOG → SUMMARY → COMMIT)

For **every** completed task:

1. **Changelog** (always): `nova/changelog/YYYYMMDD/TIME_HHMM-CHANGELOG.md`
   - If timestamp conflicts, append `.1`, `.2`, etc.
   - Include: files changed, rationale, test results, commit hash placeholder (`TBD`).
2. **Sprint Task Summary** (sprint tasks only): `nova/aeon/trajectory-1.0.0/yield-0.x.x/SPRINTX_TASKX_SUMMARY.md`
   - High-level status report: objectives, checklist, files list, test counts.
3. **DOD Summary** (if entire sprint is complete): `nova/aeon/trajectory-1.0.0/yield-0.x.x/SPRINTX_DOD_SUMMARY.md`
4. **Commit** — one commit per user prompt, no exceptions. Use two separate commands with `-C` to avoid permission prompts:
   ```bash
   git -C /c/Work/novi add .
   ```
   ```bash
   git -C /c/Work/novi commit -m "SprintX TaskY: brief description"
   ```
   - Format: `SprintX TaskY: <short description>` (< 80 chars, no conventional-commit prefixes).
   - Do NOT create a second commit to update the changelog with the hash — leave `TBD`.

For **ad hoc (non-sprint)** work: changelog + commit only; no Sprint Task Summary needed.
Use commit messages like `Ad hoc: <short description>`.

### Copyright Header

All new `.ts`, `.tsx`, and `.js` source files **must** begin with:

```typescript
/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */
```

Do **not** add this header to `.d.ts` declaration files.

### Tests

- Run `npm test` after **every** code change (bug fix, feature, or refactor).
- **100% pass rate required** before creating changelog and committing.
- If 100% cannot be achieved after 3–5 attempts, pause and ask the user.
- New tests go in the directory matching the current yield version (e.g., `src/tests/core-0.7.0/`). Do not move tests from previous sprint directories.

### Safety Rules

- Never delete directories without user confirmation.
- All generated TypeScript/JavaScript must compile without errors.
- The Electron app must build and run correctly after task completion.
