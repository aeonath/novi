# Changelog: Fix Window Dragging in Frameless TitleBar

**Date:** 2025-11-05  
**Time:** 22:30  
**Type:** Bug Fix  
**Component:** TitleBar

## Summary

Fixed critical bug where the Nova IDE window could not be moved/dragged after integrating the menu bar into the TitleBar component. The entire left section had `-webkit-app-region: no-drag` preventing window dragging.

## Problem

When we integrated the application menu bar directly into the TitleBar component, the `leftSection` container (which includes both the title and menu buttons) was marked as non-draggable using `WebkitAppRegion: 'no-drag'`. Since this section takes up most of the title bar width with `flex: 1`, there was no draggable area left except a tiny sliver, making the window impossible to move.

## Solution

Restructured the drag regions in the TitleBar:
- **Removed** `WebkitAppRegion: 'no-drag'` from `leftSection` 
- Title area now **inherits draggable** from the container
- **Moved** `WebkitAppRegion: 'no-drag'` to only the `menuBar` element
- Window controls already had `no-drag` (remain interactive)

## Changes

### Modified Files

**src/renderer/components/TitleBar.tsx**
- Line 359-365: Removed `WebkitAppRegion: 'no-drag'` from `leftSection` style
- Line 374-382: Added `WebkitAppRegion: 'no-drag'` to `menuBar` style
- Added clarifying comments for drag region behavior

## Technical Details

### Electron Frameless Window Dragging

With `frame: false` in Electron's BrowserWindow options, the window has no native title bar. To make areas draggable:
- Use `-webkit-app-region: drag` on the container
- Use `-webkit-app-region: no-drag` on interactive elements (buttons, menus)

### Drag Region Hierarchy

```
TitleBar Container (drag: enabled)
├── leftSection (drag: inherited = enabled)
│   ├── title "Nova IDE" (drag: inherited = enabled) ✅ DRAGGABLE
│   └── menuBar (drag: no-drag)
│       └── menu buttons (File, Edit, etc.) ✅ CLICKABLE
└── controls (drag: no-drag)
    └── window buttons (_, □, ×) ✅ CLICKABLE
```

### Before Fix
```typescript
leftSection: {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1,
  WebkitAppRegion: 'no-drag', // ❌ Entire section non-draggable!
}
```

### After Fix
```typescript
leftSection: {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1,
  // Keep this draggable - we'll disable drag on interactive elements
},
menuBar: {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  WebkitAppRegion: 'no-drag', // ✅ Only menu bar non-draggable
}
```

## User Experience

### Now Users Can Drag Window By:
- ✅ Clicking and dragging the title text ("Nova IDE")
- ✅ Clicking and dragging any empty space in the title bar
- ✅ Clicking and dragging between menu items

### Interactive Elements Still Work:
- ✅ Menu buttons (File, Edit, View, Nova, Help) are clickable
- ✅ Window controls (minimize, maximize, close) are clickable
- ✅ Menu dropdowns open and close properly

## Testing

- ✓ Build successful with no errors
- ✓ No linter errors
- ✓ Title area is draggable
- ✓ Menu buttons remain clickable
- ✓ Window controls remain clickable
- ✓ Works on Windows 10

## Root Cause

This regression was introduced when we integrated the menu bar into the TitleBar component. The previous standalone menu bar structure had different drag region requirements. When consolidating into a single component, the drag region CSS wasn't properly adjusted for the new layout.

## Prevention

For future frameless window modifications:
1. Always test window dragging after title bar changes
2. Remember: interactive elements need `no-drag`, everything else should inherit `drag`
3. Use minimal `no-drag` regions - only what's necessary for interaction
4. Test on actual window, not just in dev tools

## Impact

**Severity:** Critical (P0)  
**User Impact:** High - window was completely immovable  
**Affected Version:** Since menu bar integration (commit ad9e6e3)  
**Fixed Version:** This commit  

This was a blocking issue that prevented normal IDE usage. Users could not reposition the window, making multi-monitor workflows impossible.

