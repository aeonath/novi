# Novi

Novi is a modern Terminal Development Environment built with Electron, React, and TypeScript.
It sits comfortably between simplicity and power — more expressive than a text editor,
yet free from the excess of a traditional IDE.

Novi focuses on clarity, performance, and a workspace that feels effortless to use.
At its core is a Monaco editor with vim mode, an integrated terminal, and the Novi Shell —
a command interface for controlling the environment.

**Status:** Active Development

## Project Structure

```
src/
├── core/                   # Core application modules
│   ├── extension-loader.ts # Syntax extension loader (TextMate grammars)
│   └── image/              # Image editor utilities
├── main/                   # Main process (Electron)
│   ├── main.ts             # Application entry point, IPC handlers
│   ├── logger.ts           # Logging system with date-based files
│   ├── settings.ts         # Persistent settings storage
│   ├── crash-reporter.ts   # Error reporting and diagnostics
│   ├── recovery.ts         # File recovery management
│   ├── menu.ts             # Application menu
│   ├── novi-stub.ts        # #novi terminal command interception
│   ├── orchestration/      # Agent and workflow management
│   └── services/           # Main process services
│       ├── git-service.ts  # Git operations
│       ├── terminal-service.ts # Terminal management
│       ├── workspace-service.ts # Workspace state
│       └── ...             # File tree watcher, git watcher, etc.
├── preload/                # Preload scripts (secure bridge)
│   └── preload.ts          # IPC bridge exposing window.api
├── renderer/               # Renderer process (React/UI)
│   ├── index.html          # Main HTML structure
│   ├── index.tsx           # Renderer entry point (React)
│   ├── App.tsx             # Top-level React component and layout
│   ├── theme.ts            # Theme system (CSS variables)
│   ├── assets/             # Static assets (images, icons)
│   ├── components/         # UI components
│   │   ├── ActionHUD.tsx   # Contextual action interface
│   │   ├── FileTree.tsx    # File system browser
│   │   ├── GitPanel.tsx    # Git status and operations
│   │   ├── ImageEditor.tsx # In-editor image viewer/editor
│   │   ├── MonacoEditor.tsx # Monaco Editor wrapper
│   │   ├── NoviShell.tsx   # Novi Shell tab
│   │   ├── RecoveryDialog.tsx # Auto-save recovery UI
│   │   ├── SavePrompt.tsx  # Unsaved changes dialog
│   │   ├── SettingsPanel.tsx # Visual settings UI
│   │   ├── StatusBar.tsx   # Bottom status bar
│   │   ├── TabBar.tsx      # Multi-document tab management
│   │   ├── Terminal.tsx    # Integrated terminal (xterm.js)
│   │   └── TitleBar.tsx    # Custom window chrome
│   ├── contexts/           # React contexts (shared state)
│   ├── editor/             # Monaco Editor integration
│   ├── grammars/           # TextMate grammar files
│   ├── services/           # Renderer-side services
│   ├── utils/              # Utility functions
│   └── vim/                # Vim mode integration
├── tests/                  # Unit tests
│   ├── setup.ts            # Jest test setup and configuration
│   ├── __mocks__/          # Test mocks
│   ├── core-0.1.0/         # Sprint 1 tests (foundation)
│   ├── core-0.2.0/         # Sprint 2 tests (interaction layer)
│   ├── core-0.3.0/         # Sprint 3 tests (editing core)
│   ├── core-0.4.0/         # Sprint 4 tests (integration layer)
│   ├── core-0.5.0/         # Sprint 5 tests (extensions, image editor)
│   └── core-0.6.0/         # Sprint 6 tests (vim, terminal, Novi Shell)
└── types/                  # TypeScript type definitions
    └── global.d.ts         # Global API types and interfaces
```

## Prerequisites

- **Node.js** 22+ (tested with Node 22)
- **npm** (comes with Node.js)
- **Windows 10/11** (for packaging; development works on any platform)

## First-time Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
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
- Tests organized by sprint version in `src/tests/`
- Test suites: core-0.1.0 through core-0.6.0

## Windows Packaging

### Prerequisites

- Windows 10/11
- Node.js 22+
- npm

### Build Portable EXE

```bash
npm run pack:win
```

Or using PowerShell script:
```powershell
powershell.exe -File pack.ps1
```

**Output:** `dist/Novi <version>.exe`

### Build NSIS Installer

```bash
npm run pack:win:exe
```

Or using PowerShell script:
```powershell
powershell.exe -File pack.ps1 exe
```

**Output:** `dist/Novi Setup <version>.exe`

### Packaging Notes

- Builds are **unsigned** by design at this stage
- Windows may show a SmartScreen warning (expected)
- Compression is disabled for faster builds (files will be larger)
- Builds automatically clean previous artifacts before building
- Expected build time: 1-3 minutes (after first build)

### Troubleshooting Packaging

If packaging hangs or fails:

1. **Kill stuck processes:**
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -like "*7za*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force
   ```

2. **Clean and retry:**
   ```bash
   npm run clean
   npm run pack:win
   ```

3. **Close File Explorer windows** viewing the `dist/` folder

4. **Check for locked files** - make sure no Novi.exe processes are running

## Architecture

### Main Process (`src/main/`)

- **main.ts**: Application entry point, frameless window management, IPC handlers
- **logger.ts**: Logging system with date-based log files (`userData/logs/YYYY-MM-DD.log`)
- **settings.ts**: Persistent settings storage (`userData/settings.json`)
- **crash-reporter.ts**: Error reporting, diagnostics collection, crash dumps
- **recovery.ts**: Auto-save recovery file management
- **menu.ts**: Electron application menu (File, Edit, View, Novi, Help)
- **novi-stub.ts**: Intercepts `#novi` commands typed in the integrated terminal
- **orchestration/**: Agent and workflow management for background operations
- **services/**: Git service, terminal service, workspace service, file tree watcher, git watcher

### Preload (`src/preload/`)

- **preload.ts**: Secure IPC bridge exposing `window.api` with:
  - Settings: `getSetting()`, `setSetting()`
  - Files: `openFile()`, `readFile()`, `saveFile()`, `saveFileAs()`, `readDirectory()`, `selectDirectory()`
  - Recovery: `saveRecoveryFiles()`, `getRecoveryFiles()`, `deleteRecoveryFile()`, `clearRecoveryFiles()`
  - Window: `windowMinimize()`, `windowMaximize()`, `windowClose()`
  - Diagnostics: `copyDiagnostics()`, `getCrashesDirectory()`
  - Version: `getVersion()`, `ping()`

### Renderer (`src/renderer/`)

- **index.tsx**: React application entry point
- **App.tsx**: Top-level layout component (file tree, editor area, status bar)
- **theme.ts**: Theme management (CSS variables)
- **components/**: Modular React components (Terminal, MonacoEditor, NoviShell, FileTree, etc.)
- **vim/**: Vim mode integration for Monaco Editor
- **editor/**: Monaco editor configuration and services
- **grammars/**: TextMate grammar files for syntax highlighting

### Core (`src/core/`)

- **extension-loader.ts**: Loads TextMate syntax extensions from `~/.novi/extensions/`
- **image/**: Image detection, viewing, and editing utilities

### Security

- **Context Isolation**: Enabled (`contextIsolation: true`)
- **Sandbox**: Enabled (`sandbox: true`)
- **Node Integration**: Disabled (`nodeIntegration: false`)
- **Content Security Policy**: Configured in HTML

## Features

### Sprint 6 (v0.6.0) - Terminal & Vim ✅

**Vim Mode:**
- ✅ **Vim editing** - Full vim keybindings via monaco-vim
  - Toggle on/off: `novi> set vimode on` / `set vimode off` in Novi Shell
  - `:q`, `:q!`, `:wq` to close/exit tabs
  - `:ex` box styled to match the editor theme
  - Dirty file indicator displayed correctly in vim mode
- ✅ **Compat mode** - Extensible command mapping layer (`set compat on/off`)

**Integrated Terminal:**
- ✅ **Terminal tabs** - Full terminal via xterm.js and node-pty
  - Auto-copy highlighted text to clipboard
  - Per-terminal file tree tracking (CWD follows terminal)
- ✅ **`#novi` command interception** - Open files from the terminal
  - `#novi myfile.py` — opens file in editor tab
  - `#novi -s` — shows current Novi Shell settings
  - `#novi -c` — opens/focuses the Novi Shell tab
  - Commands like `echo #novi` are NOT intercepted (must start with `#novi`)

**Novi Shell:**
- ✅ Renamed from "Nova Prompt" — type `novi>` to control the environment
- ✅ `set vimode on/off` — toggle vim mode
- ✅ `set compat on/off` — toggle compat command mapping
- ✅ `set singlefiletree true/false` — use one shared file tree vs per-tab tracking
- ✅ `set` with no args — display all current settings
- ✅ `exit` — close the Novi Shell tab
- ✅ Only one Novi Shell tab allowed at a time

**File Tree:**
- ✅ Per-terminal CWD tracking (switches with tab focus)
- ✅ `..` navigation entry for moving up the tree
- ✅ Resizable pane (drag the divider between file tree and editor)
- ✅ File icon shown in editor tab (consistent with terminal/shell tabs)

**Editor Improvements:**
- ✅ Syntax highlighting auto-detected by file extension (Python, PHP, C, Bash, etc.)
- ✅ Column number, current line, and total lines in status bar
- ✅ Font size increase/decrease from View menu (editor) or terminal
- ✅ Right-click context menu on editor

**UI & UX:**
- ✅ About dialog (Help → About Novi) with version and copyright
- ✅ Resizable file tree pane
- ✅ Home button in status bar returns to home screen
- ✅ Status bar uses dark blue color scheme

### Sprint 5 (v0.5.0) - Extensions & Image Editor ✅

- ✅ **Syntax extension loader** — loads TextMate grammars from `~/.novi/extensions/`
  - Scans all folders, reads `package.json`, registers grammars dynamically
  - Lyric language syntax support
- ✅ **Image editor** — opens image files (PNG, JPG, JPEG, GIF, WEBP, AVIF) in a dedicated tab
  - Resize and proportional scaling
  - Available via command palette

### Sprint 4 (v0.4.0) - Integration Layer ✅

- ✅ **React framework** — renderer rebuilt on React 18 with component architecture
- ✅ **Enhanced Monaco** — language auto-detection by file extension, improved diagnostics
- ✅ **Git panel** — Git status, diff, and basic operations
- ✅ **Novi Shell** (formerly Nova Prompt) — command interface for environment control
- ✅ **Terminal** — integrated terminal tab via xterm.js

### Sprint 3 (v0.3.0) - Editing Core ✅

- ✅ **Monaco Editor** — full-featured code editor (syntax highlighting, IntelliSense, multi-cursor, Find/Replace)
- ✅ **Tabbed document system** — multiple files, dirty state indicators, seamless tab switching
- ✅ **File I/O** — open, save, save as, unsaved changes confirmation
- ✅ **Auto-save & recovery** — 30-second backup, recovery dialog on restart, 7-day retention
- ✅ **Theme synchronization** — Monaco respects Light/Dark theme

### Sprint 2 (v0.2.0) - Interaction Layer ✅

- ✅ **Action HUD** — keyboard-driven contextual actions (`Ctrl+K` or `Ctrl+Space`)
- ✅ **Custom title bar** — frameless window with minimize/maximize/close
- ✅ **Status bar** — file info, priority-based items
- ✅ **Theme system** — instant Light/Dark switching, persisted between sessions
- ✅ **File viewer** — read-only viewer with line numbers
- ✅ **File tree** — directory browser with expand/collapse
- ✅ **Settings panel** — visual settings UI (no JSON editing)
- ✅ **Diagnostics panel** — Electron/Node version info, one-click copy

### Sprint 1 (v0.1.0) - Foundation ✅

- ✅ Secure IPC bridge (context isolation, sandbox enabled)
- ✅ Persistent settings storage
- ✅ Date-based logging system
- ✅ Crash reporting and error handling
- ✅ Window state persistence
- ✅ Comprehensive unit tests
- ✅ Windows packaging (portable EXE and NSIS installer)

## Using Novi

### Quick Start

1. **Open Novi** — Launch the application
2. **Action HUD** — Press `Ctrl+K` or `Ctrl+Space` to access actions
3. **Open a terminal** — Use the Novi menu or Action HUD
4. **Open files** — Use the Action HUD, File menu, or `#novi myfile` from the terminal

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Ctrl+Space` | Open Action HUD |
| `Ctrl+F` | Find in file |
| `Ctrl+H` | Find and replace |
| Arrow Keys | Navigate Action HUD |
| `Enter` | Execute selected action |
| `Esc` | Close Action HUD or modals |

**Vim mode** (when `vimode` is on):
- Standard vim navigation and editing keys
- `:w` save, `:q` close tab, `:wq` save and close, `:q!` close without saving

### Terminal (`#novi` Command)

From any terminal tab, use `#novi` to interact with the editor:

```bash
#novi myfile.py       # Open file in editor
#novi -s              # Show current Novi Shell settings
#novi -c              # Focus (or open) the Novi Shell tab
```

The command must begin with `#novi` (optional leading whitespace is allowed). Commands like `echo #novi` are not intercepted.

### Novi Shell

The Novi Shell controls the environment. Open it from the Novi menu or with `#novi -c`.

```
novi> set vimode on          # Enable vim mode
novi> set vimode off         # Disable vim mode
novi> set compat on          # Enable compat command mappings
novi> set singlefiletree true # Use a single shared file tree
novi> set                    # Show all current settings
novi> exit                   # Close the Novi Shell tab
novi> help                   # Show available commands
```

### File Operations

1. **Open a File:**
   - Press `Ctrl+K` → "Open File"
   - Or `#novi myfile.py` from the terminal
   - File opens in a new tab with syntax highlighting auto-detected

2. **Edit and Save:**
   - Type to edit (or use vim commands if vimode is on)
   - Auto-saved every 30 seconds
   - `Ctrl+K` → "Save File" to save manually
   - In vim mode: `:w` to save, `:wq` to save and close

3. **Multiple Files:**
   - Each file gets its own tab
   - Unsaved changes marked with a dot indicator
   - Close tabs with the X button or `:q` in vim mode

### Customization

**Settings Panel** (`Ctrl+K` → Settings):
- Theme selection (Light/Dark)
- Font size, word wrap, auto-save, tab size

**Novi Shell** (`#novi -c` or Novi menu):
- `set vimode on/off` — toggle vim editing mode
- `set compat on/off` — toggle compat command mappings
- `set singlefiletree true/false` — file tree behavior

**View Menu:**
- Increase/Decrease Font Size — adjusts editor font or terminal font depending on active tab

## Logging

Logs are written to:
- **Console**: All log entries printed to console
- **File**: `%APPDATA%\Novi\logs\YYYY-MM-DD.log` (date-based)

Log levels:
- `INFO`: General information
- `ERROR`: Errors with optional stack traces

## Settings

Settings are stored in:
- **Location**: `%APPDATA%\Novi\settings.json` (Windows)
- **Persisted**: Window bounds, theme, font settings, tab size, vim mode, compat mode
- **Access**: Settings Panel, Novi Shell `set` command, or `window.api.getSetting()`/`setSetting()`

**Available Settings:**
- `theme`: "light" or "dark"
- `fontSize`: 10-24px (applies to editor)
- `tabSize`: 2-8 spaces
- `autoSave`: true/false (default: true)
- `wordWrap`: true/false
- `vimode`: true/false (default: false)
- `compat`: true/false (default: false)
- `singlefiletree`: true/false (default: false)
- Window bounds and position

## Development Workflow

1. **Make changes** to source files in `src/`
2. **Run tests** to verify: `npm test`
3. **Build and run**: `npm start` (or `npm run start:fast` to skip clean)
4. **Test features** manually in the application
5. **Package** (when ready): `npm run pack:win`

## Configuration

### TypeScript

- **Config**: `tsconfig.json`
- **Strict mode**: Enabled
- **Output**: `dist/` directory
- **Module**: CommonJS

### Electron Builder

- **Config**: `package.json` → `build` section
- **Product Name**: "Novi"
- **App ID**: "studio.miranova.novi"
- **Compression**: Disabled (faster builds)

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
| `npm run pack:win` | Build portable Windows EXE |
| `npm run pack:win:exe` | Build NSIS installer |

## Contributing

### Code Style

- TypeScript strict mode enabled
- ESLint and Prettier for code formatting
- React component architecture for UI
- Comprehensive unit tests required for all features

### Development Principles (Novi Philosophy)

1. **Clarity over Complexity** - Simple, discoverable interfaces
2. **Visual over Textual** - UI-based configuration, no JSON editing
3. **Contextual over Comprehensive** - Show relevant actions only
4. **Elegant over Efficient** - Beautiful UX is a feature

### Workflow

1. Create feature branch from `dev-core`
2. Write unit tests first (TDD approach)
3. Implement feature following Novi's design principles
4. Ensure all tests pass (100% pass rate required)
5. Update README if user-facing changes
6. Create detailed changelog entry
7. Commit with descriptive message (< 80 characters)

### Adding New Components

1. Create component in `src/renderer/components/` as a `.tsx` file
2. Follow existing React patterns (see `Terminal.tsx`, `MonacoEditor.tsx`)
3. Use CSS variables for theming
4. Create comprehensive test suite in `src/tests/core-0.X.0/`
5. Wire into `App.tsx` and the Action HUD if user-facing
6. Update types in `src/types/global.d.ts` if needed

## License

[Add license information here]

## Support

For issues and questions:
- **Repository**: [GitHub repository URL]
- **Issues**: [GitHub issues URL]

## Roadmap

### Sprint 7 (v0.7.0) - In Progress
- `#novi` command prefix update (leading `#` to avoid shell conflicts)

### Backlog
- Themes support
- Windows Installer
- Bundle git.exe, bash.exe, coreutils
- VSCode icons for file tree
- Extension framework
- Native spell checking

---

## Philosophy

Novi is built on the principle that modern IDEs have become bloated and complex. We believe:

- **Actions should be discoverable**, not memorized from documentation
- **Settings should be visual** (or typed in the Novi Shell), not buried in JSON files
- **The interface should be elegant**, not cluttered with buttons
- **Features should be contextual**, shown when relevant

Novi is the Terminal Development Environment reimagined for 2026 and beyond.

---

**Novi** - Build. Learn. Iterate.

MiraNova Studios © 2026
