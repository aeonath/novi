# Changelog — 2026-03-05 23:43

## Fix vim mode disabling syntax highlighting

### Summary
Syntax highlighting was completely disabled when vim mode was active, and did not restore when switching back to normal mode. The root cause was the `setModel(null); setModel(m)` pattern used in both `initVim()` and `vimodeHandler` in MonacoEditor.ts, which destroys Monaco's tokenization state.

### Root Cause
`setModel(null)` followed by `setModel(model)` detaches and reattaches the model, but Monaco does not properly restore tokenization state after this operation. This pattern existed in two places:
- `initVim()` — called when vim mode initializes
- `vimodeHandler` — called when toggling vim on/off

### Implementation

#### `src/renderer/components/MonacoEditor.ts`
- Replaced `setModel(null); setModel(m)` in `initVim()` with `monaco.editor.setModelLanguage(model, model.getLanguageId())` inside a `setTimeout(0)` to properly retrigger tokenization
- Replaced `setModel(null); setModel(m)` in `vimodeHandler` with `monaco.editor.setModelLanguage(model, model.getLanguageId())` to retrigger tokenization after vim toggle
- Both locations also re-apply the current theme via `monaco.editor.setTheme()`

### Files Changed
- **`src/renderer/components/MonacoEditor.ts`** — Replace model detach/reattach with setModelLanguage retokenization

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
