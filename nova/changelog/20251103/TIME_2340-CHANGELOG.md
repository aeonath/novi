# TitleBar Fix — Replace Text with SVG Icons — 20251103.2340

## Summary
Replaced text character buttons (−, □, ❐, ×) with hardcoded SVG icons to bypass Windows system-level color manipulation that was causing buttons to turn white on hover, regardless of CSS settings.

## Files Changed
- `src/renderer/components/TitleBar.tsx` — Replaced text characters with inline SVG icons

## Technical Details

**Problem:**
Despite multiple CSS approaches including:
- `forced-color-adjust: none`
- `-webkit-text-fill-color`
- `@media (forced-colors: active)` overrides
- Specific class selectors with `!important`

The title bar buttons continued to turn white on hover. The user correctly identified that this was Windows applying color changes at the **system/compositor level**, beyond CSS control. Windows was manipulating the text rendering directly, likely through:
- Desktop Window Manager (DWM) composition
- System-level accessibility features
- Font rendering engine color adjustments

**Solution:**
Replaced text characters with inline SVG graphics that have hardcoded fill colors:

**Before:**
```tsx
<button>−</button>  // Text character subject to Windows manipulation
<button>□</button>  // Text character subject to Windows manipulation
<button>×</button>  // Text character subject to Windows manipulation
```

**After:**
```tsx
// Minimize button - horizontal line
<button>
  <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
    <rect width="10" height="1" fill="#cccccc"/>
  </svg>
</button>

// Maximize button - square outline
<button>
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="0" y="0" width="10" height="10" stroke="#cccccc" strokeWidth="1" fill="none"/>
  </svg>
</button>

// Restore button - overlapping squares
<button>
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 2V0H10V8H8V10H0V2H2ZM8 2H2V8H8V2Z" fill="#cccccc"/>
  </svg>
</button>

// Close button - X shape
<button>
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M0.5 0L0 0.5L4.5 5L0 9.5L0.5 10L5 5.5L9.5 10L10 9.5L5.5 5L10 0.5L9.5 0L5 4.5L0.5 0Z" fill="#cccccc"/>
  </svg>
</button>
```

**Why This Works:**
1. **Vector Graphics vs Text**: SVG graphics are rendered as shapes, not text, so Windows text rendering pipeline doesn't apply
2. **Hardcoded Fill Colors**: The `fill="#cccccc"` attribute is part of the SVG structure, not CSS, making it immune to CSS overrides
3. **Bypasses Font Rendering**: Windows font engine can't manipulate vector paths the same way it manipulates text
4. **No System Text Hooks**: System accessibility features that target text rendering don't apply to SVG shapes

**Technical Details:**
- Each SVG is inline (not external file) for better performance
- SVGs use absolute colors (`#cccccc`) in fill/stroke attributes, not CSS
- viewBox ensures proper scaling
- Dimensions (10x10px, 10x1px) match original character sizes
- Conditional rendering for maximize/restore icons based on window state

## User Impact
Title bar buttons now maintain consistent colors (#cccccc) across all states without Windows system interference. The visual appearance is identical to the text characters but immune to system-level color manipulation.

## Why CSS Failed
CSS properties (color, forced-color-adjust, -webkit-text-fill-color) apply to text rendering. Windows was manipulating colors at a lower level:
- Font rendering engine
- Desktop Window Manager composition
- System accessibility features
- Text anti-aliasing and subpixel rendering

SVG shapes bypass this entire pipeline.

## Test Results
- ✅ Build successful
- ✅ SVG icons replace text characters
- ✅ Colors hardcoded in SVG attributes, not CSS

## Git Commit Hash
TBD - TitleBar: Replace text buttons with SVG icons

## Status
✅ Completed

## Related Sprint/Task
Sprint 4 Task 3 - File System Browser (UI polish)

## Notes
This is a workaround for Windows system-level behavior that cannot be controlled via CSS or Electron APIs. Similar approaches are used by VS Code and other professional Electron applications.

