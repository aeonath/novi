# Ad hoc — Hide ".." in file tree when tied to terminal — 20260213.1613

## Summary
When the file tree is tied to a terminal tab (`isTerminalTree` true), the ".." (parent directory) entry is no longer shown. The tree reflects the terminal's CWD only; navigation up is omitted in that mode.

## Files Changed

### Modified
- **src/renderer/components/FileTree.tsx** — In the block that renders the ".." row, added `if (isTerminalTree) return null;` so the parent-directory entry is not rendered when the file tree is displaying a terminal's CWD.

## Reason
User requested that the ".." folder not be present on the terminal-tab file tree view since it is tied to the terminal.

## Git Commit Hash
`9b1bf7b` — Ad hoc: hide .. in terminal file tree view

## Status
✅ Completed
