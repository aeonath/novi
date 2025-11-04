# Changelog - Fix Commit Box Right Padding

**Date:** November 4, 2025, 01:31  
**Sprint:** 4  
**Task:** Task 4 (Git Integration) - Bug Fix  
**Type:** UI Fix

---

## Summary
Fixed the commit message textarea to have equal padding on both left and right sides by adding `box-sizing: border-box`. The textarea was previously flush against the right edge of the panel while having proper spacing on the left.

---

## Problem

The commit message box had asymmetric spacing:
- **Left side**: Proper 16px padding (from parent)
- **Right side**: Flush against panel border (0px effective padding)

This happened because `width: 100%` on the textarea was calculated based on the content box, not including the padding and border. The 10px padding and 1px border were added **on top of** the 100% width, causing the textarea to overflow the parent's padding area on the right side.

---

## Solution

Added `boxSizing: 'border-box'` to the `commitInput` style:

```typescript
commitInput: {
  width: '100%',
  minHeight: '60px',
  padding: '10px',
  backgroundColor: '#1e1e1e',
  color: '#cccccc',
  border: '1px solid #3e3e42',
  borderRadius: '4px',
  fontSize: '12px',
  fontFamily: 'inherit',
  resize: 'none' as const,
  marginBottom: '8px',
  marginTop: '4px',
  boxSizing: 'border-box' as const,  // ← Added this line
},
```

**What `box-sizing: border-box` does**:
- Makes `width: 100%` include padding and border
- Textarea now fits perfectly within parent's padding
- Equal spacing on left and right (both respect the 16px parent padding)

---

## Technical Details

### CSS Box Model
**Without `border-box` (default `content-box`)**:
```
Total width = width + padding + border
Total width = 100% + 20px (padding) + 2px (border)
Result: Overflows parent by 22px on the right
```

**With `border-box`**:
```
Total width = width (includes padding and border)
Total width = 100%
Result: Fits perfectly within parent, respecting padding
```

### Visual Comparison

**Before**:
```
┌─ CommitSection (16px padding) ──────┐
│                                      │
│ [Textarea────────────────────────]  │ ← Right edge touches border
│                                      │
└──────────────────────────────────────┘
```

**After**:
```
┌─ CommitSection (16px padding) ──────┐
│                                      │
│  [Textarea──────────────────────]   │ ← Equal spacing both sides
│                                      │
└──────────────────────────────────────┘
```

---

## Files Modified
- `src/renderer/components/GitPanel.tsx` - Added `boxSizing: 'border-box'` to commitInput style

---

## Testing

### Manual Testing
- [x] Commit box has equal left/right spacing
- [x] Commit box not touching right panel border
- [x] Spacing matches left side (16px)
- [x] Textarea functionality unchanged
- [x] Build completes successfully
- [x] No linter errors
- [x] No visual regressions

### Measurements
- Parent padding: 16px on all sides
- Effective textarea left margin: 16px ✓
- Effective textarea right margin: 16px ✓
- Symmetry achieved ✓

---

## Root Cause

This is a common CSS issue when using `width: 100%` on elements with padding and borders. The default `box-sizing: content-box` behavior causes the element to extend beyond its container when padding/borders are added.

### Why it happened
1. Textarea set to `width: 100%`
2. Textarea has `padding: 10px` (left + right = 20px)
3. Textarea has `border: 1px` (left + right = 2px)
4. Total overflow = 22px
5. Right side padding absorbed by overflow

### Standard Solution
Always use `box-sizing: border-box` for input elements, textareas, and other form controls that need to fit within a specific width.

---

## Best Practices Applied

### CSS Reset Consideration
Many modern CSS frameworks (Bootstrap, Tailwind, etc.) apply `box-sizing: border-box` globally:

```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

**Why Nova doesn't have this yet**:
- We're using inline React styles, not a global CSS file
- Each component defines its own styles
- For now, adding `box-sizing` per-component as needed

**Future Enhancement**:
Consider adding a global CSS reset file that includes `box-sizing: border-box` for all elements. This would prevent this issue across all components.

---

## Related Fixes

This same issue might exist in other components with form inputs. Should check:
- [ ] `SettingsPanel` input fields
- [ ] `ActionHUD` search input
- [ ] Other textarea/input elements in the codebase

---

## User Impact

**Before**: Commit message box looked cramped on the right side, inconsistent spacing  
**After**: Clean, professional appearance with balanced spacing on all sides

This improves the overall polish and professionalism of the Git panel UI.

---

## Commit Message
```
Sprint4 Task4: Fix commit box right padding with box-sizing

- Added boxSizing: 'border-box' to commitInput style
- Ensures textarea width includes padding and border
- Equal 16px spacing on both left and right sides
- No more flush-against-border appearance
```

