# Changelog — 2026-08-10 19:02

## Ad hoc: Novi shortcuts (New File, Open File, ...) now work in the terminal and in VI Mode

### Summary
User reported that Novi's global keyboard shortcuts (New File, Open File —
`Ctrl+N`/`Ctrl+O` by default, and unaffected even when remapped, e.g. to
`Ctrl+M`) don't fire while a terminal tab is focused, and don't fire in the
editor while VI Mode is on either. Requested an "options that says preserve
Novi keybindings" for the VI Mode case specifically, and for the terminal
case to just work unconditionally.

### Root cause
Novi-category shortcuts (`new-file`, `open-file`, `settings`, `new-terminal`,
`zoom-*`, `toggle-devtools`, `exit`, `toggle-fullscreen`) relied on Electron's
native menu accelerator to fire regardless of focus, plus one manually
duplicated "defensive" case for `open-file` (not `new-file`) in App.ts's
`document` `keydown` listener — registered at the default **bubble** phase.

Both xterm.js (in a terminal tab) and `monaco-vim` (VI Mode) attach their own
keydown handling to DOM nodes *inside* the editor/terminal — descendants of
`document`. Both actively decide to handle many `Ctrl+letter` combos
themselves: xterm sends real terminal control bytes (`Ctrl+N` = SO, `Ctrl+O`
= SI) and calls `preventDefault()`; `monaco-vim` treats `Ctrl+N`/`Ctrl+O` as
real Vim navigation commands and does the same. Once either of those calls
`preventDefault()`/consumes the event, it doesn't fire Electron's native
accelerator (Electron's local-shortcut fallback depends on Chromium
reporting the keydown as unhandled by the page) and never reaches App.ts's
bubble-phase listener either (bubble phase runs *after* the target's own
handling, and by then the descendant's listener already consumed it). Net
effect: the keystroke vanished into the terminal/vim buffer instead.

### Fix
Added a **second, capture-phase** `document` `keydown` listener in
`App.ts`, registered ahead of (and therefore always run before) any listener
on a node inside the terminal or the editor — DOM capture phase always
visits `document` before any of its descendants, regardless of what those
descendants' own listeners do. When
`shouldForceNoviDispatch()` says the current context would otherwise
swallow the key — a terminal tab, or a VI-Mode editor tab with the new
**"Preserve Novi Keybindings"** setting on — it calls `preventDefault()` +
`stopPropagation()` and dispatches the matched Novi shortcut itself,
pre-empting xterm/`monaco-vim` entirely; they never see the event. In every
other context (plain non-vim editing, Settings, file tree, Welcome) it does
nothing and the keystroke proceeds exactly as before (native accelerator /
the existing bubble-phase fallback), so nothing there changes.

The existing bubble-phase listener was generalized from "just `open-file` +
3 menu-less ids" to loop over the *entire* `NOVI_SHORTCUTS` list (via a new
shared `dispatchNoviShortcut()` helper), giving every Novi shortcut — not
just `open-file` — the same defensive renderer-side coverage `open-file`
already had, for contexts where nothing consumed the key upstream.

**VI Mode is opt-in, not overridden by default** — per the request, a new
Editor Settings toggle "Preserve Novi Keybindings" (disabled unless VI Mode
is on) controls whether Novi shortcuts take priority over Vim's own bindings
for the same keys. Off (default): Vim's `Ctrl+N`/`Ctrl+O`/etc. keep their
real Vim meaning, unchanged from today. On: Novi's shortcuts win. The
terminal side has no such setting — un-conditionally fixed, since there's no
similarly valuable terminal meaning for these control codes worth trading off
(matches how Copy/Select All already unconditionally win over rare
Ctrl+letter terminal codes).

Also added a shared `matchesAnyShortcut()` helper to `shortcut-registry.ts`
and refactored `Terminal.ts`'s `isClaimedByAppShortcut()`/`isCopyAccelerator()`
to use it instead of duplicating the same match loop three times — pure
cleanup, no behavior change to the terminal's existing Copy/Select-All/etc.
handling.

### Files Changed

| File | Change |
|------|--------|
| `src/core/shortcuts/shortcut-registry.ts` | Added `matchesAnyShortcut(e, defs, settings)` |
| `src/renderer/components/Terminal.ts` | `isClaimedByAppShortcut()`/`isCopyAccelerator()` now call `matchesAnyShortcut()` instead of duplicating the loop (no behavior change) |
| `src/renderer/components/App.ts` | Added `vimModeEnabled`/`preserveNoviKeybindingsInVim` fields (loaded + live-updated via `novi-vimode-changed`/`novi-preservenovikeybindingsinvim-changed`); added `shouldForceNoviDispatch()` and `dispatchNoviShortcut()`; `setupKeyboardShortcuts()` now registers a capture-phase listener that pre-empts xterm/monaco-vim for Novi shortcuts when forced, and generalized the existing bubble-phase Novi dispatch to cover all of `NOVI_SHORTCUTS` |
| `src/renderer/components/SettingsTab.ts` | New "Preserve Novi Keybindings" toggle in Editor Settings, disabled unless VI Mode is on, persisting `preserveNoviKeybindingsInVim` and broadcasting `novi-preservenovikeybindingsinvim-changed` |
| `src/tests/core-0.8.0/shortcut-registry.test.ts` | New `matchesAnyShortcut` tests (5), including remapped-accelerator behavior |
| `src/tests/core-0.8.0/settings-tab.test.ts` | New tests for the Preserve Novi Keybindings toggle's disabled state and enable/persist/broadcast behavior; fixed checkbox indices shifted by the new row |

### Test Results
- 57 suites passed, 0 failed (883 tests, up from 876 — 7 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- No dedicated test added for `App.ts`'s `shouldForceNoviDispatch()`/capture-phase
  listener itself — `App.ts` has no existing test file in this codebase (the
  same pre-existing gap noted in the 17:57 changelog entry); the underlying
  `matchesAnyShortcut()` matching logic it relies on is covered directly

### Commit
TBD
