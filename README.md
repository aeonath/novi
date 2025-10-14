# Nova IDE

A minimal Electron + TypeScript application with a simple build/start workflow.

## Project Structure

```
src/
├── main/           # Main process (Electron)
│   └── main.ts
├── preload/        # Preload scripts
│   └── preload.ts
└── renderer/       # Renderer process (vanilla TS)
    ├── index.html
    └── index.ts
```

## How to Run the Project

### Prerequisites

- Node.js 22+
- npm

### First-time Setup

```bash
npm install
```

## Production Build

### Build

```bash
npm run build
```

This compiles all TypeScript to `dist/` using `tsc`.

### Run Production Build

```bash
npm start
```

Start does two things:
- Compiles TypeScript via `tsc`
- Launches Electron using the compiled `dist/main/main.js`

To apply code changes, stop the app and run `npm start` again.

## Architecture

- **Main Process**: Electron main process written in TypeScript, built with `tsc`
- **Preload**: Secure bridge between main and renderer processes
- **Renderer**: Vanilla HTML + TypeScript compiled to JS and loaded from disk
- **TypeScript**: Strict configuration with path mapping support
- **CommonJS**: Simple Node-style modules for compatibility

## Features

- Simple build/start workflow (no dev server)
- TypeScript strict mode
- Secure context isolation

## Notes

- There is no dev server or hot reload. Make a change, then run `npm start` again.

## Windows Packaging

### Prerequisites

- Windows 10/11
- Node.js 22+
- npm

### Build Portable EXE (unsigned)

```bash
npm run pack:win
```

Output will be placed under `dist/` and `dist/win-*` by electron-builder as a single portable executable.

### Build NSIS Installer (unsigned)

```bash
npm run pack:win:exe
```

This produces an `.exe` installer (NSIS) under `dist/`.

Notes:
- The scripts will compile the app with `tsc` first, then package `dist/**`.
- Builds are unsigned by design at this stage; Windows may show a SmartScreen prompt.

## Next Steps

This is a clean foundation for building an Electron application. You can now:

1. Add your UI components to `src/renderer/`
2. Extend the preload API in `src/preload/preload.ts`
3. Add main process functionality in `src/main/main.ts`
4. Configure additional build tools as needed