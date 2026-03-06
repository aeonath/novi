# Changelog — 2026-03-05 20:50

## Change file tree loading indicator to centered blinking dots

### Summary
Replaced the spinning circle loader with a centered blinking dots animation (`...`) that builds from left to right. The dots are vertically and horizontally centered in the file tree pane.

### Implementation
- Replaced the rotating spinner with a CSS `::after` pseudo-element animation using `@keyframes novi-dots`
- Animation cycles through "", ".", "..", "..." at 1.2s interval using `steps(1)`
- Loader container uses `height: 100%` with flexbox centering to place dots in the middle of the pane
- Removed the old `novi-spin` keyframes injection (replaced with `novi-dots-keyframes`)

### Files Changed
- **`src/renderer/components/FileTree.ts`** — Replaced spinner rendering in `renderContent()` loading state

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
