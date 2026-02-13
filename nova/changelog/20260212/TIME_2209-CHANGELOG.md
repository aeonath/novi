# Sprint6 Task3 — Vi Mode via monaco-vim and Novi Shell set command — 20260212.2209

## Summary
Implemented vi mode in the Monaco editor using the monaco-vim library, controlled by the Novi Shell with `set vimode on` / `set vimode off`. Default is on. Persisted setting `vimode`; MonacoEditor initializes or disposes vim based on setting and reacts to `novi-vimode-changed` events. Added unit tests in core-0.6.0 for the vimode setting.

## Files Changed
- **package.json** — Added dependency `monaco-vim`.
- **src/renderer/components/NoviPrompt.tsx** — New `set` command: `set vimode`, `set vimode on`, `set vimode off`. Uses `window.api.getSetting` / `window.api.setSetting('vimode', boolean)` and dispatches `novi-vimode-changed` with `detail.enabled`. Help text updated.
- **src/renderer/components/MonacoEditor.tsx** — Refs `vimStatusBarRef`, `vimAdapterRef`. After editor creation, async init: `getSetting('vimode', true)`, then dynamic `import('monaco-vim')` and `initVimMode(editor, vimStatusBarRef.current)`; result stored in `vimAdapterRef`. Cleanup disposes vim adapter then editor. New effect subscribes to `novi-vimode-changed`: turn on → init vim; turn off → dispose vim. UI: wrapper div and vim status bar div below editor.
- **src/tests/core-0.6.0/vimode-setting.test.ts** (new) — Tests for `getSetting('vimode', true)` default when unset, and setSetting/getSetting round-trip for vimode on/off.

## Technical Details
- **Setting**: Key `vimode` (boolean), default `true` (vimode on). Stored via existing main-process settings; IPC `get-setting` / `set-setting` unchanged.
- **Novi Shell**: `set` with no args shows usage; `set vimode` shows current status; `set vimode on` / `set vimode off` sets value, persists, and dispatches `CustomEvent('novi-vimode-changed', { detail: { enabled } })`.
- **MonacoEditor**: Dynamic `import('monaco-vim')` to avoid loading vim in environments that don’t need it; status bar node is a div below the editor; vim adapter is disposed before editor on unmount and when toggling off.
- **Tests**: 6 tests in `vimode-setting.test.ts` (default true/false when unset; persist on/off; override on→off and off→on). No React/NoviPrompt tests; set command covered indirectly via setting persistence.

## Reason
Sprint 6 Task 3: Implement vi mode from Task 2 proposal using monaco-vim; control via Novi Shell `set vimode on`/`off`; default on; unit tests; keep implementation simple.

## Test Results
- `npm test`: 30 test suites, 580 tests passed (including 6 new vimode-setting tests).
- `npm run build`: success (renderer bundle includes monaco-vim).

## Git Commit Hash
`fd64ce5` — Sprint6 Task3 Vi mode

## Status
✅ Completed
