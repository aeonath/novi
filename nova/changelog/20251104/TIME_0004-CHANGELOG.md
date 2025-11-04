# FileTree Fix — Preserve State When Toggling to Git Panel — 20251104.0004

## Summary
Fixed FileTree state loss when toggling to Git Panel and back by keeping both components mounted and using CSS to show/hide them, preserving the opened folder and tree structure.

## Files Changed
- `src/renderer/components/App.tsx` — Changed from conditional rendering to CSS-based visibility toggle

## Issue Fixed

**Problem:**
When user opens a folder, toggles to Git panel, then toggles back to FileTree, the folder was no longer open and FileTree showed "Open folder" as if nothing was ever opened.

**Root Cause:**
Conditional rendering was unmounting the FileTree component when showing Git Panel:
```tsx
{showGitPanel ? (
  <GitPanel ... />
) : (
  <FileTree ... />
)}
```

When React unmounts a component, all its internal state is lost:
- `rootPath` → Lost (returns to `null`)
- `tree` → Lost (returns to `[]`)
- `expandedDirs` → Lost (returns to empty `Set`)
- All user navigation lost

**Solution:**
Changed to always render both components but use CSS `display` property to show/hide:

```tsx
{/* Always render both components, but hide with CSS to preserve state */}
<div style={{ display: showGitPanel ? 'none' : 'flex', flexDirection: 'column', height: '100%' }}>
  <FileTree ... />
</div>

<div style={{ display: showGitPanel ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
  <GitPanel ... />
</div>
```

## How It Works

### Previous Behavior (Broken)
1. FileTree mounted → User opens folder → State stored in FileTree
2. User clicks ⎇ → `showGitPanel = true`
3. React unmounts FileTree (state destroyed) → Mounts GitPanel
4. User clicks 📁 → `showGitPanel = false`
5. React unmounts GitPanel → Mounts **new** FileTree instance
6. New FileTree has clean state → Shows "Open folder"

### New Behavior (Fixed)
1. FileTree mounted → User opens folder → State stored in FileTree
2. User clicks ⎇ → `showGitPanel = true`
3. FileTree stays mounted (just hidden) → GitPanel shown
4. User clicks 📁 → `showGitPanel = false`
5. GitPanel stays mounted (just hidden) → FileTree shown
6. **Same** FileTree instance → State preserved → Shows opened folder

## Technical Details

### CSS Visibility Control
Both components wrapped in divs with dynamic `display` style:
- When `showGitPanel` is `false`:
  - FileTree div: `display: flex` (visible)
  - GitPanel div: `display: none` (hidden)
- When `showGitPanel` is `true`:
  - FileTree div: `display: none` (hidden)
  - GitPanel div: `display: flex` (visible)

### Layout Preservation
Each wrapper div uses:
- `flexDirection: 'column'` — Maintains vertical layout
- `height: '100%'` — Fills sidebar height
- `display: flex/none` — Toggles visibility

This ensures both components maintain proper layout when shown.

### State Preservation
FileTree's internal state is now preserved:
- `rootPath` — Keeps track of opened directory
- `tree` — Keeps file/folder structure
- `expandedDirs` — Remembers which folders are expanded
- `contextMenu` — Maintains context menu state if any

GitPanel's state is also preserved:
- `commitMessage` — Keeps typed commit message
- `gitStatus` — Maintains fetched status
- `error/success` messages — Stays visible

## Pattern Consistency

This follows the same pattern used for Monaco Editor:
```tsx
{/* Always render Monaco, but hide it when showing welcome */}
<div style={{ 
  flex: 1, 
  display: showWelcome ? 'none' : 'flex',
  overflow: 'hidden',
}}>
  <MonacoEditor />
</div>
```

Benefits:
- State preservation
- Faster toggling (no unmount/remount overhead)
- Better user experience
- Consistent architecture

## User Impact
- **Opens folder once** — State persists across toggles
- **Expanded folders stay expanded** — No need to re-navigate
- **Better UX** — Seamless switching between views
- **Performance** — No expensive unmount/remount cycles

## Edge Cases Handled
1. **Multiple toggles** — State preserved across unlimited toggles
2. **Expanded folders** — Expansion state maintained
3. **Scroll position** — FileTree scroll position preserved
4. **Context menus** — Any open menus preserved (though unlikely during toggle)

## Testing
- [x] Open folder → Toggle to Git → Toggle back → Folder still open ✅
- [x] Expand folders → Toggle to Git → Toggle back → Folders still expanded ✅
- [x] Open file → Toggle to Git → Toggle back → File still highlighted ✅
- [x] Scroll in FileTree → Toggle to Git → Toggle back → Scroll position maintained ✅

## Performance
- **Minimal overhead** — Both components stay in memory
- **Memory usage** — Negligible (components are lightweight)
- **Faster toggling** — No unmount/mount cycle
- **Smooth UX** — Instant switching

## Alternatives Considered

### 1. Lift State to Parent (Rejected)
- Move FileTree state to App.tsx
- Pass as props
- **Cons**: Complex, breaks encapsulation, lots of prop drilling

### 2. Use localStorage (Rejected)
- Store state in localStorage
- Restore on mount
- **Cons**: Async, slower, unnecessary complexity

### 3. Use Context (Rejected)
- Create FileTreeContext in App.tsx
- Share state via context
- **Cons**: Over-engineering for simple toggle

### 4. CSS Visibility (Chosen)
- Keep components mounted
- Toggle with CSS
- **Pros**: Simple, fast, preserves state, consistent with Monaco pattern

## Git Commit Hash
TBD - FileTree: Preserve state when toggling to Git panel

## Status
✅ Completed

## Related Sprint/Task
Sprint 4 Task 4 - Git Integration (Bug fixes)

## Notes
This is a common React pattern for preserving component state when toggling visibility. Used in:
- Monaco Editor (shows/hides based on `showWelcome`)
- FileTree/GitPanel toggle (shows/hides based on `showGitPanel`)

The pattern prevents state loss and provides better UX at minimal cost.

