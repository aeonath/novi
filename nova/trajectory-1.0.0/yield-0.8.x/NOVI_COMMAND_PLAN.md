# Novi CLI Command — Implementation Plan (Revised)

**Date**: 2026-04-28
**Sprint**: Sprint 8 (yield-0.8.x)
**Status**: Awaiting review — Windows packaging decision: **Option 2 chosen (self-contained)**

---

## Design Philosophy

Two separate programs. One pipe.

| Program | Role |
|---------|------|
| **NoviEditor** | The Electron GUI app (renamed from "Novi"). Acts as a server — listens on a named pipe. |
| **novi** | Lightweight CLI tool. Acts as a client — sends one command over the pipe and exits. |

No PTY output scraping. No Electron single-instance hacks. The `novi` CLI works identically whether called from a system terminal outside the app or from inside a Novi terminal tab.

---

## Core IPC Mechanism

Node.js `net` module supports Unix domain sockets on all target platforms. Both Linux and Windows use the same path:

| Platform | Socket Path |
|----------|-------------|
| Linux | `~/.novi/novi-editor.sock` |
| Windows | `%USERPROFILE%\.novi\novi-editor.sock` |

Windows 10 version 1803+ supports `AF_UNIX` sockets natively, and Electron's bundled Node.js exposes this via the standard `net` module — no named-pipe API needed. The `.novi` directory is already created by Novi on first run, so no extra setup is required.

```
$ novi src/main.ts
        │
        ▼
  NoviEditor --novi-cli src/main.ts       ← thin shell/batch wrapper
        │ (headless, no window)
        │ JSON over named pipe
        ▼
  NoviEditor (running GUI instance)
        │
        ▼
  Opens file in editor tab
```

The `novi` wrapper is a 2-line shell script (Linux) or `.cmd` file (Windows) that calls the **same `NoviEditor` binary** with a `--novi-cli` flag. No separate Node.js runtime required on any platform.

### Command Protocol

One JSON message per connection, newline-terminated:

```ts
// CLI → NoviEditor
type CliCommand =
  | { cmd: 'ping' }                                 // Is it running?
  | { cmd: 'new-file' }                             // Open new empty file tab
  | { cmd: 'open-file'; path: string }              // Open file in tab
  | { cmd: 'open-terminal'; cwd: string }           // Open terminal tab in cwd

// NoviEditor → CLI
type CliResponse =
  | { ok: true }
  | { ok: false; error: string }
```

Easily extended with new commands in the future.

---

## Rename: Executable novi → NoviEditor

### Why rename

Currently the Electron binary inside `/opt/Novi/` is named `novi`. The CLI tool also needs to be named `novi`. Renaming just the **executable** to `NoviEditor` resolves the conflict while keeping the install directory as `Novi` on all platforms.

`productName` controls the **install directory** — it stays `"Novi"`.  
`executableName` controls the **binary name** — this changes to `"NoviEditor"`.

### Install paths after the change

| Platform | Install dir | App binary | CLI entry point |
|----------|-------------|------------|-----------------|
| Linux deb | `/opt/Novi/` | `/opt/Novi/NoviEditor` | `/opt/Novi/novi` (shell script) + `/usr/bin/novi` (symlink) |
| Windows | `C:\Program Files\Novi\` | `C:\Program Files\Novi\NoviEditor.exe` | `C:\Program Files\Novi\novi.cmd` |

### Changes required

| File | Change |
|------|--------|
| `package.json` | `build.productName`: stays `"Novi"` (no change — keeps `/opt/Novi/` and `Program Files\Novi\`) |
| `package.json` | `build.executableName` (add): `"NoviEditor"` (renames the binary only) |
| `src/main/main.ts` | Add `app.setName('NoviEditor')` at startup |
| `build/after-install.sh` | Binary path: `/opt/Novi/novi` → `/opt/Novi/NoviEditor`; install `/opt/Novi/novi` wrapper + `/usr/bin/novi` symlink |
| `build/after-remove.sh` | Mirror the binary name change |

> **Windows note**: `productName` stays `"Novi"` so electron-builder keeps `Program Files\Novi\` as the install directory. Adding `executableName: "NoviEditor"` renames only the `.exe` to `NoviEditor.exe`. The NSIS installer title (`Novi`) is unchanged.

---

## Implementation Steps

---

### Step 1 — Rename the Executable

**Files**: `package.json`, `src/main/main.ts`, `build/after-install.sh`, `build/after-remove.sh`

In `package.json` `build` section — add `executableName` only (`productName` is unchanged):
```json
"productName": "Novi",
"executableName": "NoviEditor",
```

In `src/main/main.ts` (very top of app initialization, before `app.whenReady()`):
```ts
app.setName('NoviEditor');
```

In `build/after-install.sh`: the binary path changes from `/opt/Novi/novi` to `/opt/Novi/NoviEditor`. The install directory `/opt/Novi/` is unchanged. The `/usr/bin/novi` entry point is changed in Step 7.

---

### Step 2 — CliService (Named Pipe Server in NoviEditor)

**New file**: `src/main/services/cli-service.ts`

Responsibilities:
- Ensure `~/.novi/` exists (`fs.mkdirSync(..., { recursive: true })`) before binding — covers first-run and any edge case where the directory was removed
- Delete stale socket file at startup if it exists (crash/kill from a previous run leaves it behind)
- Start a `net.Server` and listen on the socket path
- Parse incoming JSON commands, route to handler, respond `{ ok: true }`
- Close server and delete the socket file cleanly on app quit

```ts
// Socket path helper (extracted as exported function for testing)
export function getPipePath(): string {
  return path.join(os.homedir(), '.novi', 'novi-editor.sock');
}
```

No platform branching required — same path on Linux and Windows.

Handler routing (all run on the main process, forward to renderer via `webContents.send`):

| Command | Main-process action |
|---------|---------------------|
| `ping` | respond `{ ok: true }` immediately |
| `new-file` | `webContents.send('open-from-cli', { newFile: true })` + focus |
| `open-file` | `webContents.send('open-from-cli', { filePath })` + focus |
| `open-terminal` | `webContents.send('open-from-cli', { openTerminal: true, cwd })` + focus |

**Startup**: instantiated in `main.ts` once `mainWindow` exists and `did-finish-load` has fired.
**Shutdown**: `app.on('will-quit', () => cliService.stop())`.

---

### Step 3 — Startup Argument Handling in NoviEditor

**File**: `src/main/main.ts`

When `novi` cannot connect to a running NoviEditor, it launches `NoviEditor` with flags:

```
NoviEditor --novi-open-file=/abs/path/to/file.ts
NoviEditor --novi-open-terminal --novi-cwd=/abs/path
```

After `did-finish-load` fires, `main.ts` scans `process.argv` for these flags and sends the same `open-from-cli` IPC event to the renderer. First-launch and already-running cases share identical renderer-side handling.

A helper function `parseStartupArgs(argv: string[]): OpenFromCliPayload | null` is extracted as a pure function (testable without Electron).

Flags handled:

| Flag | Payload sent to renderer |
|------|--------------------------|
| `--novi-new-file` | `{ newFile: true }` |
| `--novi-open-file=<path>` | `{ filePath: '<path>' }` |
| `--novi-open-terminal`, `--novi-cwd=<path>` | `{ openTerminal: true, cwd: '<path>' }` |
| *(none)* | nothing sent — normal startup |

---

### Step 4 — Preload Update

**File**: `src/preload/preload.ts`

Add one listener to `window.api`:

```ts
onOpenFromCli: (callback: (payload: OpenFromCliPayload) => void) => {
  ipcRenderer.on('open-from-cli', (_event, payload) => callback(payload));
},
```

Where `OpenFromCliPayload` is:
```ts
interface OpenFromCliPayload {
  newFile?: boolean;       // open a new empty file tab
  filePath?: string;       // open a specific file
  openTerminal?: boolean;  // open a terminal tab
  cwd?: string;            // starting directory for terminal
}
```

---

### Step 5 — Renderer Handler

**File**: `src/renderer/components/App.ts`

Register in the existing event-listener setup block:
```ts
window.api?.onOpenFromCli?.((payload) => {
  if (payload.filePath) this.openFileFromPath(payload.filePath);
  else if (payload.openTerminal) this.createTerminalTab(payload.cwd);
  else if (payload.newFile) this.createNewFileTab();
});
```

**`openFileFromPath(filePath: string)`** (new private method):
- If a tab with this `filePath` is already open → switch to it (no duplicate).
- Otherwise: call `window.api.readFile(filePath)`, detect image vs. text by extension, create tab via `tabBarAPI.addTab(...)`. Reuses the existing logic from `onFileTreeFileOpen` (line ~1056).

**`createTerminalTab(cwd?: string)`**: extract the existing new-terminal logic (line ~1234) into a named method; pass `cwd` to `window.api.terminalCreate(cwd)`.

**`createNewFileTab()`**: create an empty untitled file tab (same as the existing "New File" menu command — extract or reuse that handler).

---

### Step 6 — CLI Mode in NoviEditor

**New file**: `src/main/cli-mode.ts`

When `NoviEditor` is launched with `--novi-cli` in `process.argv`, `main.ts` detects this at the very top — **before `app.whenReady()`** — and calls `runCliMode(process.argv, process.cwd())`. This function:

1. Parses the remaining argv for a command (`open-file`, `open-terminal`, or nothing).
2. Connects to the named pipe via `net.connect(getPipePath())`.
3. **If connection succeeds** (NoviEditor is already running):
   - Sends the JSON command and waits for `{ ok: true }`.
   - Calls `app.exit(0)`.
4. **If connection fails** (`ENOENT` / `ECONNREFUSED`) — no running instance:
   - `novi` (no args): spawns `NoviEditor --novi-new-file` detached. `app.exit(0)`.
   - `novi file.ts`: spawns `NoviEditor --novi-open-file=<abs>` detached. `app.exit(0)`.
   - `novi -t`: spawns `NoviEditor --novi-open-terminal --novi-cwd=<cwd>` detached. `app.exit(0)`.

Calling `app.exit(0)` before `app.whenReady()` prevents any window or GUI from ever appearing — Electron exits cleanly.

**Behaviour table**:

| Invocation | Editor running | Result |
|------------|----------------|--------|
| `novi` | No | Launches NoviEditor, opens new empty file tab |
| `novi` | Yes | Opens new empty file tab in running editor |
| `novi file.ts` | No | Launches NoviEditor, opens file once ready |
| `novi file.ts` | Yes | Opens file in tab immediately |
| `novi -t` | No | Launches NoviEditor, opens terminal tab in cwd |
| `novi -t` | Yes | Opens terminal tab in cwd immediately |

**Key**: `--novi-cli` signals "I am acting as a CLI client." Absence of `--novi-cli` (but presence of `--novi-new-file` / `--novi-open-file` / `--novi-open-terminal`) signals "I am a fresh GUI launch with a startup action." These two modes never overlap.

---

### Step 7 — Shell Wrappers & Install

The `novi` wrapper is the same pattern on all platforms: call `NoviEditor` with `--novi-cli` and forward all arguments. No Node.js needed.

#### Development

**New file**: `scripts/novi-dev.sh` (Linux/macOS):
```sh
#!/bin/sh
REPO="$(cd "$(dirname "$0")/.." && pwd)"
exec "$REPO/node_modules/.bin/electron" "$REPO" --novi-cli "$@"
```

**New file**: `scripts/novi-dev.cmd` (Windows):
```bat
@echo off
set REPO=%~dp0..
"%REPO%\node_modules\.bin\electron.cmd" "%REPO%" --novi-cli %*
```

Add npm script to `package.json`:
```json
"novi": "sh scripts/novi-dev.sh"
```

Usage: `npm run novi -- src/main.ts` or alias `novi="npm run novi --"` in your shell profile.

#### Packaged Install (Linux deb — `build/after-install.sh`)

Write a `novi` shell script **inside the install directory** (`/opt/Novi/novi`) and symlink it to `/usr/bin/novi`. This keeps everything under `/opt/Novi/` and follows the existing `update-alternatives` pattern:

```sh
# Write the novi CLI wrapper alongside the app binary
cat > /opt/Novi/novi << 'EOF'
#!/bin/sh
exec /opt/Novi/NoviEditor --novi-cli "$@"
EOF
chmod +x /opt/Novi/novi

# Register /usr/bin/novi pointing to the wrapper (replaces old direct symlink)
if type update-alternatives 2>/dev/null >&1; then
    update-alternatives --install '/usr/bin/novi' 'novi' '/opt/Novi/novi' 100
else
    ln -sf '/opt/Novi/novi' '/usr/bin/novi'
fi
```

The old `update-alternatives` registration that pointed directly at the Electron binary (`/opt/Novi/NoviEditor`) is removed or updated to point at the wrapper instead.

#### Packaged Install (Windows — NSIS)

Write `novi.cmd` into the install directory alongside `NoviEditor.exe` (`C:\Program Files\Novi\novi.cmd`). Done via `build/installer.nsh`:

```bat
@echo off
"%~dp0NoviEditor.exe" --novi-cli %*
```

Register `C:\Program Files\Novi\` in the system `PATH` via the NSIS installer so `novi` is available from Command Prompt, PowerShell, and Git Bash. Use the `EnvVarUpdate` NSIS macro (already common in NSIS templates).

---

### Step 8 — tsconfig Update

**File**: `tsconfig.json`

`src/main/cli-mode.ts` and `src/main/services/cli-service.ts` are under `src/main/`, already included in the main tsconfig (CommonJS, Node target). No tsconfig changes required — verify `src/main/` is not in the `exclude` list.

---

### Step 9 — Tests

**New file**: `src/tests/core-0.8.0/novi-command.test.ts`

| Test | What it checks |
|------|----------------|
| `getPipePath()` | Returns `<homedir>/.novi/novi-editor.sock` on all platforms |
| `parseCliModeArgs(['--novi-cli'])` | Returns `{ cmd: 'new-file' }` |
| `parseCliModeArgs(['--novi-cli', 'src/f.ts'])` | Returns `{ cmd: 'open-file', path: '<abs>' }` (resolved) |
| `parseCliModeArgs(['--novi-cli', '-t'])` | Returns `{ cmd: 'open-terminal', cwd: '<cwd>' }` |
| `parseStartupArgs(['--novi-new-file'])` | Returns `{ newFile: true }` |
| `parseStartupArgs(['--novi-open-file=/a/b.ts'])` | Returns `{ filePath: '/a/b.ts' }` |
| `parseStartupArgs(['--novi-open-terminal', '--novi-cwd=/x'])` | Returns `{ openTerminal: true, cwd: '/x' }` |
| `CliService.start()` — `.novi` dir missing | Creates directory, then binds socket without error |
| `CliService.handleCommand({ cmd: 'ping' })` | Returns `{ ok: true }` |
| Renderer `openFileFromPath` — tab exists | Switches to existing tab, no duplicate created |
| Renderer `openFileFromPath` — new file | Calls `readFile`, creates tab |
| Renderer `createTerminalTab` with cwd | Calls `terminalCreate` with the given cwd |
| Renderer `createNewFileTab` | Creates untitled file tab, switches to it |

---

## Files Changed / Created

| File | Status | Notes |
|------|--------|-------|
| `package.json` | Modified | Add `executableName: "NoviEditor"` (`productName` stays `"Novi"`); add `novi` npm script |
| `src/main/main.ts` | Modified | `app.setName`, detect `--novi-cli` early, startup arg handler, start `CliService` |
| `src/main/cli-mode.ts` | New | Headless CLI mode — pipe client logic, runs before `app.whenReady()` |
| `src/main/services/cli-service.ts` | New | Named pipe server (the NoviEditor side) |
| `src/preload/preload.ts` | Modified | Add `onOpenFromCli` |
| `src/renderer/components/App.ts` | Modified | `onOpenFromCli` listener, `openFileFromPath`, extract `createTerminalTab` |
| `scripts/novi-dev.sh` | New | Dev wrapper (Linux/macOS) — calls `electron . --novi-cli` |
| `scripts/novi-dev.cmd` | New | Dev wrapper (Windows) — calls `electron.cmd . --novi-cli` |
| `build/after-install.sh` | Modified | Write `/opt/Novi/novi` wrapper script; update binary ref from `novi` → `NoviEditor`; symlink `/usr/bin/novi` → `/opt/Novi/novi` |
| `build/after-remove.sh` | Modified | Remove `/opt/Novi/novi` wrapper on uninstall |
| `build/installer.nsh` | Modified | Write `novi.cmd`, add install dir to system PATH |
| `src/tests/core-0.8.0/novi-command.test.ts` | New | Tests |

---

## Open Questions for Review

1. ~~**Windows CLI packaging**~~ — **Resolved: Option 2 (self-contained). `novi` is a wrapper that calls `NoviEditor --novi-cli`; no Node.js installation required.**

2. ~~**`novi` with no args when running**~~ — **Resolved: opens a new empty file tab (same behaviour whether editor is already running or freshly launched).**

3. ~~**`novi -t` cwd**~~ — **Resolved: terminal tab opens in the directory where `novi -t` was typed.**

4. ~~**Socket path**~~ — **Resolved: `~/.novi/novi-editor.sock` on all platforms (Linux and Windows both use AF_UNIX domain sockets; `.novi` dir already created by Novi on first run).**

---

## Implementation Order

```
Step 1  Rename app to NoviEditor             ← foundation, affects packaging
Step 2  CliService (pipe server)             ← NoviEditor side of IPC
Step 3  Startup arg handling                 ← first-launch file/terminal opening
Step 4  Preload update                       ← bridge to renderer
Step 5  Renderer handler                     ← file + terminal tab opening
Step 6  novi CLI tool                        ← client side
Step 7  Shell wrappers + install script      ← how users invoke novi
Step 8  tsconfig update                      ← ensure CLI compiles
Step 9  Tests                                ← validation
```

Steps 1–5 can be built and tested end-to-end by calling `webContents.send('open-from-cli', ...)` directly from the Electron DevTools console, before the CLI exists. Steps 6–7 are the user-facing surface.
