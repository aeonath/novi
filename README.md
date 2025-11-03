# Nova IDE

Nova is MiraNova Studios' flagship orchestration platform - a minimal Electron + TypeScript desktop application built with a focus on simplicity, security, and maintainability.

## Project Structure

```
src/
├── main/              # Main process (Electron)
│   ├── main.ts       # Application entry point
│   ├── logger.ts     # Logging functionality
│   └── settings.ts   # Settings storage manager
├── preload/          # Preload scripts (secure bridge)
│   └── preload.ts    # IPC bridge between main and renderer
├── renderer/         # Renderer process (UI)
│   ├── index.html    # Main HTML file
│   ├── index.ts      # Renderer entry point
│   └── assets/       # Static assets (images, etc.)
├── tests/            # Unit tests
│   ├── setup.ts      # Jest test setup
│   └── core-0.1.0/   # Tests organized by version
└── types/            # TypeScript type definitions
    └── global.d.ts   # Global API types
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
- Tests located in `src/tests/core-0.1.0/`
- Current test coverage:
  - Settings manager (17 tests)
  - Logger functionality (13 tests)
  - Packaging configuration (16 tests)

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

- **main.ts**: Application entry point, window management, IPC handlers
- **logger.ts**: Logging system with date-based log files (`userData/logs/YYYY-MM-DD.log`)
- **settings.ts**: Persistent settings storage (`userData/settings.json`)

### Preload (`src/preload/`)

- **preload.ts**: Secure IPC bridge exposing `window.api` with:
  - `getVersion()` - Get application version
  - `ping()` - Test connectivity
  - `getSetting(key, defaults?)` - Get setting value
  - `setSetting(key, value)` - Set setting value
  - `reportError(message, stack?)` - Report renderer errors

### Renderer (`src/renderer/`)

- **index.html**: Main UI (welcome screen with Miranova Studios branding)
- **index.ts**: Renderer logic, error handling, API calls

### Security

- **Context Isolation**: Enabled (`contextIsolation: true`)
- **Sandbox**: Enabled (`sandbox: true`)
- **Node Integration**: Disabled (`nodeIntegration: false`)
- **Content Security Policy**: Configured in HTML

## Features

### Current Features

- ✅ Secure IPC bridge between main and renderer processes
- ✅ Persistent settings storage (window bounds, preferences)
- ✅ Date-based logging system (console + file output)
- ✅ Error handling (uncaught exceptions, unhandled rejections)
- ✅ Window state persistence (size, position)
- ✅ Welcome screen with Miranova Studios branding
- ✅ Comprehensive unit test coverage
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
- **Location**: `%APPDATA%\Nova\settings.json`
- **Persisted**: Window bounds, user preferences
- **Access**: Via `window.api.getSetting()` and `window.api.setSetting()`

## Development Workflow

1. **Make changes** to source files in `src/`
2. **Run tests** to verify: `npm test`
3. **Build and run**: `npm start`
4. **Package** (when ready): `npm run pack:win`

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

- TypeScript strict mode
- Consistent formatting
- Comprehensive unit tests required for new features

### Workflow

1. Create feature branch
2. Write tests first (TDD approach)
3. Implement feature
4. Ensure all tests pass
5. Update documentation if needed
6. Create changelog entry
7. Commit changes

## License

[Add license information here]

## Support

For issues and questions:
- **Repository**: [GitHub repository URL]
- **Issues**: [GitHub issues URL]

---

**Nova** - Build. Learn. Iterate.

MiraNova Studios © 2025
