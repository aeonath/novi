# Nova IDE

Nova is a modern development environment built with Electron and TypeScript.
It sits comfortably between simplicity and power — more expressive than a text editor, 

yet free from the excess of a traditional IDE.
Nova focuses on clarity, performance, and a workspace that feels effortless to use.


test this is our edit


**Version:** 0.3.5 (Sprint 3 - Editing Core)  
**Status:** Active Development

## Project Structure

```
src/
├── main/                   # Main process (Electron)
│   ├── main.ts             # Application entry point, IPC handlers
│   ├── logger.ts           # Logging system with date-based files
│   ├── settings.ts         # Persistent settings storage
│   └── crash-reporter.ts   # Error reporting and diagnostics
├── preload/                # Preload scripts (secure bridge)
│   └── preload.ts          # IPC bridge exposing window.api
├── renderer/               # Renderer process (UI)
│   ├── index.html          # Main HTML structure
│   ├── index.ts            # Renderer entry point and initialization
│   ├── theme.ts            # Theme system (Light/Dark themes)
│   ├── assets/             # Static assets (images, icons)
│   ├── components/         # UI components
│   │   ├── action-hud.ts   # Contextual action interface (Ctrl/Cmd+K or Space)
│   │   ├── actions.ts      # Action definitions and handlers
│   │   ├── file-tree.ts    # File system browser
│   │   ├── file-viewer.ts  # Read-only file viewer with line numbers
│   │   ├── settings-panel.ts # Visual settings UI (no JSON editing)
│   │   ├── title-bar.ts    # Custom window chrome
│   │   ├── status-bar.ts   # Bottom status bar
│   │   ├── tab-bar.ts      # Multi-document tab management
│   │   ├── recovery-dialog.ts # Auto-save recovery UI
│   │   └── diagnostics-panel.ts # System diagnostics viewer
│   ├── editor/             # Monaco Editor integration
│   │   ├── index.ts        # Editor module exports
│   │   └── monaco-editor.ts # Monaco Editor wrapper and configuration
│   └── services/           # Application services
│       └── auto-save.ts    # Auto-save and recovery service
├── tests/                  # Unit tests (362 tests)
│   ├── setup.ts            # Jest test setup and configuration
│   ├── core-0.1.0/         # Sprint 1 tests (foundation)
│   ├── core-0.2.0/         # Sprint 2 tests (interaction layer)
│   └── core-0.3.0/         # Sprint 3 tests (editing core)
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
   cd nova
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
2. Compiles TypeScript to `dist/`
3. Launches Electron with the compiled application

**Note:** There is no dev server or hot reload. To see changes, stop the app (Ctrl+C) and run `npm start` again.

### Build Only

```bash
npm run build
```

Compiles TypeScript to `dist/` directory. Output structure:
```
dist/
├── main/          # Compiled main process files
├── preload/       # Compiled preload scripts
└── renderer/      # Renderer files (HTML, JS, assets)
```

### Clean Build Artifacts

```bash
npm run clean
```

Removes the `dist/` directory and all build artifacts.

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
- **Current test coverage: 362 tests (17 test suites)**
  - Sprint 1 (core-0.1.0): Settings, Logger, Crash Reporter, Packaging
  - Sprint 2 (core-0.2.0): UI Components, Actions, Theme System, File Operations
  - Sprint 3 (core-0.3.0): Monaco Editor, Tab Bar, Auto-Save, Recovery Dialog

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

**Output:** `dist/Nova 0.0.1.exe` (or similar, based on version)

### Build NSIS Installer

```bash
npm run pack:win:exe
```

Or using PowerShell script:
```powershell
powershell.exe -File pack.ps1 exe
```

**Output:** `dist/Nova Setup 0.0.1.exe`

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

4. **Check for locked files** - make sure no Nova.exe processes are running

## Architecture

### Main Process (`src/main/`)

- **main.ts**: Application entry point, frameless window management, IPC handlers
- **logger.ts**: Logging system with date-based log files (`userData/logs/YYYY-MM-DD.log`)
- **settings.ts**: Persistent settings storage (`userData/settings.json`)
- **crash-reporter.ts**: Error reporting, diagnostics collection, crash dumps

### Preload (`src/preload/`)

- **preload.ts**: Secure IPC bridge exposing `window.api` with:
  - Settings: `getSetting()`, `setSetting()`
  - Files: `openFile()`, `readFile()`, `saveFile()`, `saveFileAs()`, `readDirectory()`, `selectDirectory()`
  - Recovery: `saveRecoveryFiles()`, `getRecoveryFiles()`, `deleteRecoveryFile()`, `clearRecoveryFiles()`
  - Window: `windowMinimize()`, `windowMaximize()`, `windowClose()`
  - Diagnostics: `copyDiagnostics()`, `getCrashesDirectory()`
  - Version: `getVersion()`, `ping()`

### Renderer (`src/renderer/`)

- **index.html**: Main application structure with custom title bar and status bar
- **index.ts**: Application initialization, component integration, action handlers
- **theme.ts**: Theme management (Light/Dark themes with CSS variables)
- **components/**: Modular UI components (Action HUD, File Viewer, Settings Panel, etc.)

### Security

- **Context Isolation**: Enabled (`contextIsolation: true`)
- **Sandbox**: Enabled (`sandbox: true`)
- **Node Integration**: Disabled (`nodeIntegration: false`)
- **Content Security Policy**: Configured in HTML

## Features

### Sprint 3 (v0.3.0) - Editing Core ✅

**Monaco Editor Integration:**
- ✅ **Text Editing** - Full-featured code editor powered by Monaco
  - Syntax highlighting for 30+ languages (JS/TS, HTML, CSS, Python, etc.)
  - IntelliSense for JavaScript/TypeScript
  - Multi-cursor editing (Alt+Click)
  - Find/Replace with regex support (Ctrl+F / Ctrl+H)
  - Code folding and bracket matching
  - Auto-indentation and formatting
- ✅ **Tabbed Document System** - Multi-file editing
  - Multiple files open simultaneously
  - Visual tabs with close buttons
  - Dirty state indicators (*) for unsaved changes
  - Seamless tab switching
- ✅ **File Operations** - Complete I/O layer
  - Open files (various text formats)
  - Save and Save As functionality
  - Unsaved changes confirmation
  - Auto-save with recovery
- ✅ **Theme Synchronization** - Unified appearance
  - Nova Dark/Light themes apply to Monaco
  - Custom syntax highlighting colors
  - Seamless theme switching
- ✅ **Editor Settings** - Persistent preferences
  - Font size control (10-24px)
  - Word wrap toggle
  - Minimap disabled for clean interface
  - Settings persist between sessions
- ✅ **Auto-Save & Recovery** - Never lose work
  - Automatic backup every 30 seconds
  - Recovery dialog on startup
  - Restore or discard unsaved work
  - 7-day retention with automatic cleanup
- ✅ **Performance** - Fast and responsive
  - Startup time tracking
  - Monaco loads in < 500ms
  - Total startup < 1 second
  - Non-blocking operations

**Testing:**
- ✅ **362 unit tests** passing (100% pass rate)
- ✅ **91 new tests** for Sprint 3 features
- ✅ Comprehensive coverage:
  - Monaco editor integration
  - Tab bar management
  - Auto-save service
  - Recovery dialog
  - File save operations

### Sprint 2 (v0.2.0) - Interaction Layer ✅

**Visual Interface:**
- ✅ **Action HUD** - Contextual action menu (Ctrl/Cmd + Space)
  - Keyboard-driven, discoverable actions
  - No command palette bloat - only relevant actions shown
  - Fuzzy search filtering
- ✅ **Custom Title Bar** - Frameless window with native-feeling controls
  - Minimize, maximize, restore, close buttons
  - Draggable region for window movement
- ✅ **Status Bar** - Bottom info bar with left/center/right sections
  - File operation status
  - Priority-based item management
- ✅ **Theme System** - Instant Light/Dark theme switching
  - CSS variable-based theming
  - Persists between sessions
  - Integrated with settings panel

**File Operations:**
- ✅ **File Viewer** - Read-only text file viewer
  - Line numbers with synchronized scrolling
  - Open, reload, and close via Action HUD
  - Status bar integration
- ✅ **File Tree** - File system browser
  - Directory selection and navigation
  - Expand/collapse folders
  - File and directory listing

**Settings & Configuration:**
- ✅ **Visual Settings Panel** - UI-based configuration (no JSON editing!)
  - Theme selection (Light/Dark)
  - Font size adjustment
  - Tab size configuration
  - Real-time preview and application
  - Persistent storage

**Developer Tools:**
- ✅ **System Diagnostics Panel** - Environment information viewer
  - Application version
  - Electron & Node.js versions
  - Platform and architecture
  - One-click copy for bug reports

### Sprint 1 (v0.1.0) - Foundation ✅

**Core Infrastructure:**
- ✅ Secure IPC bridge (context isolation, sandbox enabled)
- ✅ Persistent settings storage
- ✅ Date-based logging system
- ✅ Crash reporting and error handling
- ✅ Window state persistence
- ✅ Comprehensive unit test coverage (362 tests)
- ✅ Windows packaging (portable EXE and NSIS installer)

### Logging

Logs are written to:
- **Console**: All log entries printed to console
- **File**: `%APPDATA%\Nova\logs\YYYY-MM-DD.log` (date-based)

Log levels:
- `INFO`: General information
- `ERROR`: Errors with optional stack traces

### Settings

Settings are stored in:
- **Location**: `%APPDATA%\Nova\settings.json` (Windows)
- **Persisted**: Window bounds, theme preference, font settings, tab size
- **Access**: Visual Settings Panel (no JSON editing required) or `window.api.getSetting()`/`setSetting()`

**Available Settings:**
- `theme`: "light" or "dark"
- `fontSize`: 10-24px (applies to editor)
- `tabSize`: 2-8 spaces
- `autoSave`: true/false (default: true)
- `wordWrap`: true/false (editor word wrap)
- Window bounds and position

### Theme System

Nova includes a comprehensive theme system:
- **Light Theme**: Clean, bright interface for daytime use
- **Dark Theme**: Easy on the eyes for extended coding sessions
- **Switch Instantly**: Ctrl/Cmd + Space → Toggle Theme
- **Persistent**: Theme preference saved between sessions
- **CSS Variables**: All components respect theme colors

## Using Nova

### Quick Start

1. **Open Nova** - Launch the application
2. **Action HUD** - Press `Ctrl+K` or `Ctrl+Space` (Windows/Linux) or `Cmd+K`/`Cmd+Space` (macOS)
3. **Available Actions:**
   - **Open File** - Browse and open files for editing
   - **Save File** - Save current file
   - **Save File As...** - Save with new name/location
   - **Reload File** - Refresh current file from disk
   - **Close File** - Close the file viewer
   - **Toggle Theme** - Switch between Light and Dark themes
   - **Settings** - Open the settings panel
   - **System Diagnostics** - View environment information

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Space` | Open Action HUD |
| Arrow Keys | Navigate actions |
| `Enter` | Execute selected action |
| `Esc` | Close Action HUD or modals |

### File Operations

1. **Open a File:**
   - Press `Ctrl/Cmd + K`
   - Select "Open File"
   - Choose a file from the dialog
   - File opens in a new tab with syntax highlighting

2. **Edit and Save:**
   - Type to edit the file
   - File is auto-saved every 30 seconds
   - Press `Ctrl/Cmd + K` → "Save File" to save manually
   - Or use "Save File As..." for new location

3. **Multiple Files:**
   - Open additional files to create tabs
   - Click tabs to switch between files
   - Close tabs with the X button
   - Unsaved changes marked with *

4. **Search in File:**
   - Press `Ctrl/Cmd + F` to find
   - Press `Ctrl/Cmd + H` to find and replace
   - Use regex, case-sensitive, or whole word options

### Customization

1. **Change Theme:**
   - Press `Ctrl/Cmd + K` → Settings
   - Select theme from dropdown
   - Or use "Toggle Theme" action for quick switching

2. **Adjust Editor Settings:**
   - Press `Ctrl/Cmd + K` → Settings
   - Adjust font size, word wrap, auto-save, tab size
   - Changes apply immediately to all open files

3. **Auto-Save:**
   - Enabled by default (30-second interval)
   - Toggle in Settings Panel
   - Recovery dialog appears on crash/restart with unsaved work

## Development Workflow

1. **Make changes** to source files in `src/`
2. **Run tests** to verify: `npm test` (362 tests should pass)
3. **Build and run**: `npm start`
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
- **Product Name**: "Nova"
- **App ID**: "studio.miranova.nova"
- **Compression**: Disabled (faster builds)

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm start` | Clean, build, and run application |
| `npm run build` | Compile TypeScript |
| `npm run clean` | Remove build artifacts |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run pack:win` | Build portable Windows EXE |
| `npm run pack:win:exe` | Build NSIS installer |

## Contributing

### Code Style

- TypeScript strict mode enabled
- ESLint and Prettier for code formatting
- Component-based architecture for UI
- Comprehensive unit tests required for all features

### Development Principles (Nova Philosophy)

1. **Clarity over Complexity** - Simple, discoverable interfaces
2. **Visual over Textual** - UI-based configuration, no JSON editing
3. **Contextual over Comprehensive** - Show relevant actions only
4. **Elegant over Efficient** - Beautiful UX is a feature

### Workflow

1. Create feature branch from `dev-core`
2. Write unit tests first (TDD approach)
3. Implement feature following Nova's design principles
4. Ensure **all 362+ tests pass** (100% pass rate required)
5. Update README if user-facing changes
6. Create detailed changelog entry with:
   - Technical changes
   - User-facing impact
   - Test results
7. Create sprint task summary
8. Commit with descriptive message (< 80 characters)

### Adding New Components

1. Create component in `src/renderer/components/`
2. Follow existing patterns (see `action-hud.ts`, `file-viewer.ts`)
3. Use CSS variables for theming
4. Create comprehensive test suite in `src/tests/core-0.X.0/`
5. Integrate with Action HUD if user-facing
6. Update types in `src/types/global.d.ts` if needed

## License

[Add license information here]

## Support

For issues and questions:
- **Repository**: [GitHub repository URL]
- **Issues**: [GitHub issues URL]

## Roadmap

### Sprint 4 (v0.4.0) - Intelligence Layer (Next)
- Code completion
- IntelliSense
- Linting integration
- Error diagnostics

### Future Sprints
- Terminal integration
- Git integration
- Extension system
- Collaborative features

---

## Philosophy

Nova is built on the principle that modern IDEs have become bloated and complex. We believe:

- **Actions should be discoverable**, not memorized from documentation
- **Settings should be visual**, not buried in JSON files
- **The interface should be elegant**, not cluttered with buttons
- **Features should be contextual**, shown when relevant

Nova is the IDE reimagined for 2025 and beyond.

---

**Nova** - Build. Learn. Iterate.

MiraNova Studios © 2025
