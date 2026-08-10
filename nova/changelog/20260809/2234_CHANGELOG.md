# Changelog — 2026-08-09 22:34

## Feature (Phase 3 of 3): Keyboard Shortcuts settings — Monaco's built-in defaults

### Summary
Final phase of the Keyboard Shortcuts feature. Adds 28 of Monaco's own
built-in editor keybindings (Find Next/Previous, line operations, toggle
comment, multi-cursor, go to line/bracket, fold/unfold, format document,
trigger suggest, rename symbol, go to/peek definition, editor command
palette) to the Terminal + Editor section as remappable entries, and wires
`monaco.editor.addKeybindingRules()` so a customization actually rebinds
Monaco's internal keybinding table, not just the app-level dispatch added in
Phase 2.

### Scope trimmed deliberately (per the plan's "start with everything, trim
### as needed" — documenting what and why)
Mined ~65 candidate commands from Monaco's actual source in Phase 1's
research; **28 made it into the registry**. Excluded:
- **Two-key chord defaults** (e.g. `Ctrl+K Ctrl+C` for Add Line Comment).
  Every accelerator in this registry is stored/compared/displayed as a
  single Electron-style string (`"CmdOrCtrl+Shift+P"`) — chords have no
  representation in that format, and building one would mean teaching the
  recorder widget to capture a *sequence*, not just a combo. ~15 commands
  cut for this reason (Trim Trailing Whitespace, Add/Remove Line Comment,
  Move Selection to Next/Prev Match, Toggle Fold, Fold/Unfold All, Format
  Selection, and the fold-level variants).
- **Commands Monaco ships with no default keybinding at all** (Copy with
  Syntax Highlighting, Find with Arguments, Go to Match, Add Cursors to
  Top/Bottom, Add/Move Selection to Previous Find Match, Join Lines,
  Transpose Letters). Nothing to override.
- **Unlabeled internal commands** (the find widget's internal replace-one/
  replace-all/select-all-matches/close-widget commands, core cursor
  commands like `cursorWordLeft`/`deleteWordRight`). Not meant to be
  surfaced as individually nameable user-facing shortcuts.

### How it's applied
`MonacoEditor.ts`'s `initEditor()` now calls a new
`applyKeyboardShortcutOverrides()` once after creating the editor, and again
on every `novi-keyboardshortcuts-changed` event. For each Monaco-mapped
registry entry (Phase 2's 8 shared commands + this phase's 28), if the
effective accelerator differs from Monaco's own default, it disposes the
previous rule set and registers two rules: unbind the old default
(`{keybinding, command: null}`) and bind the new one
(`{keybinding, command: monacoCommandId}`). Entries left at their default
are untouched — no rule needed, Monaco's own binding already works.

The actual accelerator-string → Monaco-keybinding-number encoding
(`acceleratorToMonacoKeybinding`, `monacoKeyCodeForKeyName`) was written as
a **pure function in `shortcut-registry.ts`**, not a method on
`MonacoEditor.ts`, specifically so it could be unit tested directly — this
matters because `src/renderer/components/MonacoEditor.ts` turned out to
have **zero existing test coverage** (there's a same-purpose legacy file at
`src/renderer/editor/monaco-editor.ts` with its own test suite that a grep
for the wrong path initially confused for this one). Writing the conversion
as a pure function taking `KeyCode`/`KeyMod` as parameters, rather than
reading the `monaco` global directly, meant it could be tested against
real verified numeric values without needing to mount the whole editor.

This paid off immediately: the first version typed the Monaco `KeyCode`
parameter as `Record<string, number>`, which `tsc` rejected once actually
compiled — TypeScript numeric enums carry an implicit reverse
(number → name) mapping that isn't assignable to a plain `Record<string,
number>`. Never caught by `npm test` (nothing imports this file), only by
directly cross-checking with `tsc`. Fixed by loosening the parameter type
and validating the actual key lookup at runtime instead of leaning on the
type system to prove it.

### Files Changed

| File | Change |
|------|--------|
| `src/core/shortcuts/shortcut-registry.ts` | Added 28-entry `MONACO_BUILTIN_SHORTCUTS`; new pure `parseAccelerator`, `monacoKeyCodeForKeyName`, `acceleratorToMonacoKeybinding` functions; new `getMonacoMappedShortcuts()` helper |
| `src/renderer/components/MonacoEditor.ts` | `initEditor()` now calls `applyKeyboardShortcutOverrides()` once at startup and on every settings change; new `keybindingOverridesDisposable` field disposed on both re-apply and component teardown |
| `__mocks__/monaco-editor.ts` | Added `KeyMod`/`KeyCode` (real numeric values from Monaco's compiled source, not placeholders) and `editor.addKeybindingRules` to the test mock |
| `src/tests/core-0.8.0/shortcut-registry.test.ts` | 17 new tests: key-name resolution, keybinding-number encoding against verified real Monaco values, and a round-trip regression guard that every Monaco-mapped registry entry's default accelerator actually resolves (would have caught a typo'd key name) |
| `src/tests/core-0.8.0/settings-keyboard-shortcuts.test.ts` | Extended the Terminal+Editor render test to confirm Monaco-only entries (Fold, Rename Symbol) appear and the filter box now shows at this list size |

### Test Results
- 57 suites passed, 0 failed (852 tests, 17 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully — caught the `Record<string, number>` enum-typing bug described above before it could ship
- `MonacoEditor.ts` has no test importing it directly; correctness of its (thin) integration with the now-pure, well-tested conversion functions was manually cross-checked with `npx tsc -p tsconfig.renderer.json --noEmit` (no new errors beyond the established pre-existing baseline)

### Feature complete
All three phases of Keyboard Shortcuts are now shipped: Novi (17 app-level
commands, live menu rebuild), Terminal+Editor shared commands (13, with the
originally-reported Ctrl+A-in-terminal gap fixed), and Monaco's built-in
defaults (28, live-rebindable). Global conflict detection spans all three
groups together, so no two commands can ever end up on the same key.

### To verify manually
Open Options → Keyboard Shortcuts → Terminal + Editor, uncheck Use
Defaults, rebind Toggle Line Comment away from Ctrl+/ to something else,
confirm the old Ctrl+/ no longer comments a line in the editor and the new
combo does.

### Commit
TBD
