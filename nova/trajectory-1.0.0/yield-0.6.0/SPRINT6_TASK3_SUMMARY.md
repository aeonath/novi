# Sprint 6 Task 3 — Implement Vi Mode (monaco-vim + Novi Shell)

## Objective
Implement the Task 2 proposal: add vi mode to the Monaco editor using monaco-vim, controlled by the Novi Shell with `set vimode on` / `set vimode off`. Default vimode on. Unit tests; keep implementation simple.

## Implemented

### 1. Dependency
- **monaco-vim** added to `package.json`. Installed via `npm install`.

### 2. Setting
- **Key**: `vimode` (boolean).
- **Default**: `true` (vi mode on when key is absent).
- **Storage**: Existing main-process settings (`getSetting` / `setSetting`); renderer uses `window.api.getSetting` / `window.api.setSetting` (IPC).

### 3. Novi Shell (NoviPrompt)
- **Command**: `set` with args.
  - `set` — usage and list of options (vimode).
  - `set vimode` — show current status (vimode is on / vimode is off).
  - `set vimode on` — enable vi mode: persist `true`, dispatch `novi-vimode-changed` with `detail.enabled: true`, print confirmation.
  - `set vimode off` — disable vi mode: persist `false`, dispatch `novi-vimode-changed` with `detail.enabled: false`, print confirmation.
- **Help**: `help` output updated to include `set` (e.g. set vimode on|off).

### 4. MonacoEditor
- **Refs**: `vimStatusBarRef` (HTMLElement for monaco-vim status bar), `vimAdapterRef` (object with `dispose()` from `initVimMode`).
- **Initialization**: After `monaco.editor.create`, an async IIFE runs: read `getSetting('vimode', true)`; if true, dynamic `import('monaco-vim')` then `initVimMode(editor, vimStatusBarRef.current)` and store result in `vimAdapterRef`.
- **Toggle at runtime**: Effect subscribes to `novi-vimode-changed`. If `enabled` → init vim (if not already); if !enabled → dispose vim adapter.
- **Cleanup**: On unmount (or when disposing editor), dispose vim adapter first, then editor. When toggling off, only the vim adapter is disposed; editor remains.
- **UI**: Editor wrapped in a div; a second div below it used as the vim status bar node.

### 5. Unit tests (core-0.6.0)
- **src/tests/core-0.6.0/vimode-setting.test.ts**:
  - `getSetting('vimode', true)` when key unset → `true`.
  - `getSetting('vimode', false)` when key unset → `false`.
  - `setSetting('vimode', true)` then get → `true`.
  - `setSetting('vimode', false)` then get → `false`.
  - Override on → off and off → on.
- All 580 tests pass (30 suites).

## Out of scope (kept simple)
- No custom ex commands or key remaps beyond what monaco-vim provides.
- No NoviPrompt React/component tests for the set command (setting persistence and main-process behavior covered by vimode-setting tests).
- No change to other Novi Shell settings; only vimode is controlled via `set` for this task.

## References
- **SPRINT6_TASK2_SUMMARY.md** — Research and proposal (monaco-vim, Novi Shell toggle).
- **SPRINT6_PLAN.md** — Task 3 description.
- **Changelog**: `nova/changelog/20260212/TIME_2209-CHANGELOG.md`.
