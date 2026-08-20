# Novi

Novi is a modern Terminal Development Environment (TDE) built with Electron and TypeScript —
no framework, vanilla TypeScript with direct DOM manipulation. It sits comfortably between
simplicity and power — more expressive than a text editor, yet free from the excess of a
traditional IDE.

Novi focuses on clarity, performance, and a workspace that feels effortless to use. At its
core is a Monaco editor with optional vim keybindings, an integrated terminal, a built-in
git panel, and an image editor — all wrapped in a frameless, themeable shell.

**Status:** Active Development

**Note:** Novi Image Editor bug appears to be fixed however it requires more testing.

## Project Structure

```
src/
├── core/                        # Shared modules used by both main and renderer
│   ├── extension-loader.ts      # Loads TextMate grammar extensions from ~/.novi/extensions/
│   └── image/                   # Image read/transform helpers (resize, crop, format conversion)
├── main/                         # Main process (Electron)
│   ├── main.ts                   # App entry point, BrowserWindow + IPC handler registration
│   ├── menu.ts                   # Application menu (File / Edit / View / Novi / Help)
│   ├── logger.ts                 # Date-based file logging
│   ├── settings.ts               # Persistent JSON settings store
│   ├── crash-reporter.ts         # Crash/error diagnostics
│   ├── recovery.ts               # Auto-save recovery file management
│   ├── cli-mode.ts               # `novi` CLI entry point (client side)
│   ├── orchestration/            # Background agent/workflow management
│   └── services/
│       ├── cli-service.ts        # Unix socket server backing the `novi` CLI
│       ├── editor-file-watcher.ts
│       ├── file-tree-watcher.ts  # chokidar-based file tree updates
│       ├── git-service.ts        # isomorphic-git operations
│       ├── git-watcher.ts
│       ├── git-credential-helper.ts
│       ├── terminal-service.ts   # node-pty PTY management
│       ├── workspace-service.ts  # Open tabs / layout persistence
│       └── command-stats-service.ts
├── preload/
│   └── preload.ts                 # contextBridge → window.api (secure IPC bridge)
├── renderer/                       # Renderer process (vanilla TypeScript, no framework)
│   ├── index.html
│   ├── index.ts                    # Renderer entry point — mounts App
│   ├── theme.ts                    # Theme system (CSS variables)
│   ├── assets/                     # Icons and logos
│   ├── core/
│   │   ├── component.ts            # Base Component class (mount/unmount/destroy lifecycle)
│   │   ├── dom.ts                   # el() DOM-creation helper
│   │   ├── app-state.ts             # Singleton app state + event bus
│   │   └── event-bus.ts
│   ├── components/                  # UI components (each extends Component)
│   │   ├── App.ts                   # Root component — layout, tabs, keyboard shortcuts
│   │   ├── TitleBar.ts              # Frameless window chrome
│   │   ├── StatusBar.ts             # Bottom status bar
│   │   ├── TabBar.ts                # Tab list (file / image / terminal / settings)
│   │   ├── FileTree.ts              # File browser, context menu, git status icons
│   │   ├── MonacoEditor.ts          # Monaco editor wrapper + vim mode
│   │   ├── Terminal.ts              # xterm.js + node-pty terminal
│   │   ├── GitPanel.ts              # Git status / stage / commit / branches
│   │   ├── ImageEditor.ts           # Image viewer/editor
│   │   ├── SettingsTab.ts           # Settings panel content
│   │   ├── SettingsSidebar.ts       # Settings section navigator
│   │   ├── RecoveryDialog.ts        # Auto-save recovery prompt
│   │   ├── SavePrompt.ts            # Unsaved-changes dialog
│   │   ├── DiagnosticsPanel.ts      # Environment diagnostics
│   │   └── action-hud.ts            # Action HUD (command palette), actions.ts, command-palette.ts
│   ├── editor/                       # Monaco configuration/bootstrap
│   ├── services/                     # Renderer-side services (auto-save, editor)
│   ├── vim/                           # Vim mode adapter for Monaco
│   ├── utils/                         # Shared renderer helpers
│   └── shims/                         # Monaco API shims
├── tests/                              # Jest unit tests, grouped by sprint
│   ├── setup.ts                        # Test setup (mocks electron, suppresses console)
│   ├── __mocks__/
│   └── core-0.1.0/ … core-0.8.0/
└── types/
    └── global.d.ts                     # window.api type definitions
```

## Prerequisites

- **Node.js** 22+ (tested with Node 22)
- **npm** (comes with Node.js)
- **Linux or Windows** for development
- **Windows 10/11** for `pack:win` / `pack:win:installer`, or **Debian/Ubuntu** for `pack:deb`

## First-time Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/aeonath/novi.git
   cd novi
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Verify installation:
   ```bash
   npm test
   ```
   All tests should pass.

## Development

### Run in Development Mode

```bash
npm start
```

This command:
1. Cleans previous build artifacts
2. Compiles TypeScript and bundles the renderer
3. Launches Electron with the compiled application

**Skip clean (faster restart):**
```bash
npm run start:fast
```

**Note:** There is no dev server or hot reload. To see changes, stop the app (Ctrl+C) and run `npm start` again.

### Build Only

```bash
npm run build
```

Compiles TypeScript and bundles to `dist/` directory. Output structure:
```
dist/
├── main/          # Compiled main process files
├── preload/       # Compiled preload scripts
└── renderer/      # Renderer files (HTML, JS, assets, Monaco)
```

### Clean Build Artifacts

```bash
npm run clean
```

Removes the `dist/` directory and all build artifacts.

### Linting and Formatting

```bash
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix lint errors
npm run fmt           # Format source files with Prettier
npm run fmt:check     # Check formatting without writing
```

### Debug Mode

Verbose `console.log` / `console.info` output is gated behind a single flag in:

```
src/debug.ts
```

```ts
export const DEBUG = false;  // ← flip to true to enable verbose logging
```

Both the main process and the renderer import from this file, so one change enables
logging in both. **Never commit `DEBUG = true`** — keep it as a local-only change.

When `DEBUG` is `false` (the default), `console.log` and `console.info` are no-ops in
both processes. `console.warn` and `console.error` are always active regardless of this flag.

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Test Coverage Report

```bash
npm run test:coverage
```

### Test Framework

- **Jest** with **ts-jest** for TypeScript support
- **jsdom** environment for DOM testing
- Monaco Editor is mocked via `__mocks__/monaco-editor.ts` (root level)
- Tests are organized by sprint in `src/tests/core-0.1.0` through `src/tests/core-0.8.0`

## Packaging

### Linux (.deb)

```bash
npm run pack:deb
```

### Windows Portable EXE

```bash
npm run pack:win
```

Or using PowerShell:
```powershell
powershell.exe -File pack.ps1
```

**Output:** `dist/Novi <version>.exe`

### Windows NSIS Installer

```bash
npm run pack:win:installer
```

Or using PowerShell:
```powershell
powershell.exe -File pack.ps1 exe
```

**Output:** `dist/Novi Setup <version>.exe`

### Packaging Notes

- Builds are **unsigned** by design at this stage
- Windows builds may show a SmartScreen warning (expected)
- Windows builds disable compression for faster packaging (larger output files)
- `npm run pack:*` scripts clean previous artifacts automatically before building

## Architecture

### Process Model (Electron)

```
Main Process (Node.js)              Renderer Process (Browser)
src/main/                           src/renderer/
  main.ts       ←── IPC ──────────→   components/App.ts   (root)
  menu.ts                               components/*.ts
  services/                             core/app-state.ts
  orchestration/
```

All renderer↔main communication goes through `window.api` (exposed via `contextBridge` in
`src/preload/preload.ts`). The renderer **never** calls Node/Electron APIs directly.

### Component System

All renderer components are vanilla TypeScript classes extending `Component`
(`src/renderer/core/component.ts`). Components own their DOM element, support
`mount(parent)` / `unmount()` / `destroy()` lifecycle, and auto-cleanup event listeners
via `listen()`. DOM creation uses the `el()` helper from `src/renderer/core/dom.ts`.

### Tab System

Tabs are typed `'file' | 'image' | 'terminal' | 'settings'`, each with a unique string ID.
`App.ts` maintains the tab list and routes rendering to `MonacoEditor`, `ImageEditor`,
`Terminal`, or `SettingsTab` based on tab type.

### Security

- **Context Isolation**: Enabled (`contextIsolation: true`)
- **Sandbox**: Enabled (`sandbox: true`)
- **Node Integration**: Disabled (`nodeIntegration: false`)
- **Content Security Policy**: Configured for Monaco Editor support

## Features

### Editor

- Monaco Editor — syntax highlighting, IntelliSense, multi-cursor, Find (`Ctrl+F`) / Replace (`Ctrl+H`)
- Optional **vim mode** (Settings → Editor → VI Mode), with a vim-style status bar
- Tabbed documents with dirty-state indicators
- Auto-save every 5 seconds for file tabs, with a recovery dialog on next launch if the
  app exits unexpectedly
- Adjustable editor font size

### File Tree

- Two modes, controlled by the `singlefiletree` setting:
  - **Per-terminal** (default): each terminal tab tracks its own working directory, and the
    tree follows the active terminal's CWD (via OSC 7 shell reporting)
  - **Single**: one shared tree rooted at a folder you open
- Create / rename / delete files and folders via context menu
- Git status icons per file (when git integration is enabled)
- "Show Hidden Files" toggle (View menu)

### Integrated Terminal

- xterm.js with the WebGL renderer addon, backed by node-pty
- Multiple terminal tabs, each an independent shell process
- Shell selection: Git Bash, cmd, PowerShell, or WSL on Windows; system shell on Linux
- Adjustable terminal font size

### Git Integration

- Built on `isomorphic-git` — no system git binary required
- Status, stage/unstage, commit, push/pull, and branch switching from the Git panel
- In-UI credential prompts for SSH passphrases and HTTPS auth
- Toggle the entire feature with the `gitenabled` setting (Settings → Novi)

### Image Editor

- Opens PNG, JPEG, GIF, WebP, and AVIF files in a dedicated tab
- Resize (with aspect-ratio lock), crop, transparency/opacity adjustment
- Save / Save As with format conversion and quality control
- Undo/redo history

### Action HUD

- `Ctrl+K` or `Ctrl+Space` opens a searchable command palette
- Keyboard-navigable list of contextual actions (open/save/reload file, new terminal,
  open settings, refresh git status, and more)

### Settings

- Visual settings panel (`Ctrl+,`) — no JSON editing required
- Settings persist to a JSON file in Electron's user data directory
- See [Settings Reference](#settings-reference) below

### Extensions

- Drop VSCode-style language extensions (TextMate grammar + `package.json`) into
  `~/.novi/extensions/` to add syntax highlighting for new languages
- Loaded extensions are listed under Settings → Extensions

### `novi` CLI

- A small CLI client (`src/main/cli-mode.ts`) talks to the running editor over IPC
  (`~/.novi/novi-editor.sock` on macOS/Linux, `\\.\pipe\novi-editor` on Windows):
  ```bash
  novi                   # New file tab (or restore previous session)
  novi path/to/file.ts   # Open a file in the running editor
  novi -t                # Open a new terminal tab
  novi -t --cwd /tmp     # Open a new terminal tab in /tmp
  ```
  If no editor instance is running, the CLI launches one with the equivalent startup flags.

### Diagnostics

- Help menu exposes a diagnostics panel with Electron/Node/Chrome versions, platform,
  and other environment info, with one-click copy.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New File |
| `Ctrl+O` | Open File |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+W` | Close File |
| `Ctrl+R` | Reload active file from disk |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+F` / `Ctrl+H` | Find / Replace |
| `Ctrl+,` | Open Settings |
| `` Ctrl+` `` | New Terminal |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / Previous tab |
| `Ctrl+Shift+G` | Refresh git status |
| `Ctrl+K` / `Ctrl+Space` | Toggle Action HUD |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Zoom In / Out / Reset |
| `F11` | Toggle Full Screen |
| `Ctrl+Shift+I` | Toggle Developer Tools (if enabled) |

**Vim mode** (when enabled in Settings → Editor):
- Standard vim navigation and editing keys
- `:w` save, `:q` close tab, `:wq` save and close, `:q!` close without saving

## Settings Reference

Settings are stored as JSON in Electron's user data directory (e.g.
`%APPDATA%\Novi\settings.json` on Windows, `~/.config/Novi/settings.json` on Linux) and
edited via the Settings panel (`Ctrl+,`).

| Setting | Section | Type | Default | Description |
|---------|---------|------|---------|-------------|
| `fontSize` | Editor | number | `14` | Editor font size (10–24) |
| `terminalFontSize` | Terminal | number | `14` | Terminal font size (10–24) |
| `vimode` | Editor | boolean | `false` | Enable vim keybindings in the editor |
| `shellType` | Terminal | string | platform default | `gitbash` / `cmd` / `powershell` / `wsl` (Windows) or `linux` |
| `shellPath` | Terminal | string | — | Custom path to a shell executable |
| `shellUseDefault` | Terminal | boolean | — | (Linux) use `$SHELL` instead of `shellPath` |
| `singlefiletree` | Novi → File Tree | boolean | `false` | Single shared file tree vs. per-terminal tracking |
| `keeptabs` | Novi → Session | boolean | `true` | Restore open tabs from the previous session on launch |
| `gitenabled` | Novi → Git | boolean | `true` | Enable the built-in git integration |
| `showhiddenfiles` | View menu | boolean | `false` | Show dotfiles in the file tree |
| `devToolsEnabled` | Help menu | boolean | `false` | Allow toggling DevTools from the Help menu |

## Logging

Logs are written to:
- **Console**: all log entries
- **File**: `<userData>/logs/YYYY-MM-DD.log` (e.g. `%APPDATA%\Novi\logs\` on Windows,
  `~/.config/Novi/logs/` on Linux)

Log levels:
- `INFO`: General information
- `ERROR`: Errors with optional stack traces

## Development Workflow

1. **Make changes** to source files in `src/`
2. **Run tests** to verify: `npm test`
3. **Build and run**: `npm start` (or `npm run start:fast` to skip clean)
4. **Test features** manually in the application
5. **Package** (when ready): `npm run pack:win`, `npm run pack:win:installer`, or `npm run pack:deb`

## Configuration

### TypeScript

- **Config**: `tsconfig.json` (main / preload / core / tests), `tsconfig.renderer.json` (editor tooling)
- **Strict mode**: Enabled
- **Output**: `dist/` directory
- **Renderer bundling**: `scripts/build-renderer.js` (esbuild, IIFE, browser target)

### Electron Builder

- **Config**: `package.json` → `build` section
- **Product Name**: "Novi"
- **App ID**: `studio.miranova.novi`

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm start` | Clean, build, and run application |
| `npm run start:fast` | Build and run (skip clean) |
| `npm run build` | Compile TypeScript and bundle renderer |
| `npm run clean` | Remove build artifacts |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Check for lint errors |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run fmt` | Format source files |
| `npm run fmt:check` | Check formatting |
| `npm run pack:deb` | Build Linux .deb package |
| `npm run pack:win` | Build portable Windows EXE |
| `npm run pack:win:installer` | Build Windows NSIS installer |
| `npm run novi` | Run `scripts/novi-dev.sh` |

## Contributing

### Code Style

- TypeScript strict mode enabled
- ESLint and Prettier for code formatting
- Vanilla TypeScript component architecture (no framework) — see [Component System](#component-system)
- Comprehensive unit tests required for all features

### Development Principles (Novi Philosophy)

1. **Clarity over Complexity** - Simple, discoverable interfaces
2. **Visual over Textual** - UI-based configuration, no JSON editing
3. **Contextual over Comprehensive** - Show relevant actions only
4. **Elegant over Efficient** - Beautiful UX is a feature

### Workflow

1. Create a feature branch from `dev-core`
2. Write unit tests first (TDD approach)
3. Implement the feature following Novi's design principles
4. Ensure all tests pass (100% pass rate required)
5. Update the README if there are user-facing changes
6. Commit with a descriptive message

### Adding New Components

1. Create the component in `src/renderer/components/` as a `.ts` file extending `Component`
2. Follow existing patterns (see `Terminal.ts`, `MonacoEditor.ts`)
3. Use CSS variables for theming
4. Create a test suite in `src/tests/core-0.X.0/`
5. Wire into `App.ts` and the Action HUD if user-facing
6. Update types in `src/types/global.d.ts` if needed
7. Renderer files import sibling modules with a `.js` extension (e.g.
   `import { Component } from '../core/component.js';`) — esbuild resolves `.js` → `.ts`
   at build time

## Development History

Detailed sprint plans, task summaries, and a changelog entry for every change live under
[`nova/`](nova/) — see [`nova/changelog/`](nova/changelog/) for the full history and
[`nova/backlog/`](nova/backlog/) for current work items.

## License

Novi is released under the [MIT License](LICENSE).

## Support

- **Repository**: https://github.com/aeonath/novi
- **Issues**: https://github.com/aeonath/novi/issues
- **Website**: https://miranova.studio/projects/novi.html

---

## Philosophy

Novi is built on the principle that modern IDEs have become bloated and complex. We believe:

- **Actions should be discoverable**, not memorized from documentation
- **Settings should be visual**, not buried in JSON files
- **The interface should be elegant**, not cluttered with buttons
- **Features should be contextual**, shown when relevant

Novi is the Terminal Development Environment reimagined for 2026 and beyond.

---

**Novi** - Build. Learn. Iterate.

MiraNova Studios © 2026
