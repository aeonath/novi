# Changelog — 2026-08-10 17:15

## Ad hoc: Fix dirty indicator hidden by ellipsis on long editor tab names

### Summary
User reported that when a file's name is too long to fit in the editor tab
(and gets truncated with an ellipsis), the unsaved-changes dot indicator
disappears entirely.

`TabBar.ts`'s `createTabElement` appended the dirty dot (`●`) as a trailing
child *inside* the filename `<span>`, which has `overflow: hidden`,
`text-overflow: ellipsis`, and `white-space: nowrap`. When the label text
overflowed, the browser's ellipsis truncation clipped the dot along with the
tail of the filename, since it was just more inline content within the same
truncated box.

### Fix
Moved the dirty dot out of the truncated label span and appended it as a
sibling flex item on the tab element instead (`display: flex` container),
with `flex-shrink: 0` so it's never compressed or clipped. The dot now always
renders regardless of how long the filename is or how much it gets
ellipsis-truncated.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/TabBar.ts` | `createTabElement`: dirty indicator `<span>` now appended as a sibling of the label span (not a child of it), with `flex-shrink: 0` so ellipsis truncation on long filenames no longer hides it |

### Test Results
- 57 suites passed, 0 failed (856 tests)

### Commit
TBD
