# Changelog — 2026-04-28 22:03

## Sprint 8 — Novi Command Step 3: Startup Argument Handling

### Summary
When `novi` cannot connect to a running NoviEditor it launches `NoviEditor` with startup flags (`--novi-new-file`, `--novi-open-file=<path>`, `--novi-open-terminal`). After the renderer finishes loading, `main.ts` parses those flags and forwards them to the renderer via `open-from-cli` — the same IPC channel the CliService uses for live commands.

### Files Changed

| File | Change |
|------|--------|
| `src/main/services/cli-service.ts` | Added exported `OpenFromCliPayload` interface and `parseStartupArgs(argv)` pure function |
| `src/main/main.ts` | Updated import; added `did-finish-load` handler in `createWindow()` that calls `parseStartupArgs` and sends payload to renderer |

### Implementation Details
- `parseStartupArgs` short-circuits to `null` if `--novi-cli` is present (CLI client mode — never a GUI launch)
- `--novi-open-terminal` picks up the optional `--novi-cwd=<path>` flag from anywhere in argv
- Handler fires on `did-finish-load` — renderer JS is fully executed by then, so the `open-from-cli` listener registered in Step 5 will be in place
- `OpenFromCliPayload` is exported from `cli-service.ts` so it's the single source of truth for both the pipe server and the startup path

### Test Results
- 638 tests passed, 0 failed (39 suites)

### Commit
TBD
