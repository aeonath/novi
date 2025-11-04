# TitleBar Fix — Specific CSS Classes for Button Colors — 20251103.2336

## Summary
Fixed white button hover issue by adding specific CSS class names (`title-bar-button`) to title bar buttons and targeting them with more specific CSS selectors instead of generic `button` selectors.

## Files Changed
- `src/renderer/components/TitleBar.tsx` — Added specific class names to title bar buttons
- `src/renderer/index.html` — Updated CSS selectors to target specific button classes

## Technical Details

**Problem:**
From the user's screenshot, the title bar buttons (minimize, maximize, close) were still appearing white on hover despite previous attempts to fix with global `button` CSS rules. The generic `button` selector was either:
1. Being overridden by more specific CSS elsewhere
2. Not having enough specificity to override browser defaults
3. Conflicting with other button styles in the application

**Solution:**
Added specific CSS class names to identify title bar buttons and target them with higher specificity:

1. **Updated TitleBar.tsx** - Added class names to each button:
```tsx
<button
  className="title-bar-button title-bar-minimize"
  // ... other props
>
```

2. **Updated index.html** - Changed from generic `button` selector to specific class:
```css
/* Before */
button {
  color: #cccccc !important;
}
button:hover {
  color: #cccccc !important;
}

/* After */
.title-bar-button {
  color: #cccccc !important;
}
.title-bar-button:hover {
  color: #cccccc !important;
}
.title-bar-button:focus {
  color: #cccccc !important;
}
.title-bar-button:active {
  color: #cccccc !important;
}
```

**Why This Approach:**
- Class-based selectors have higher specificity than element selectors
- Avoids affecting other buttons in the application
- More maintainable and explicit
- Covers all interactive states (hover, focus, active)
- Prevents side effects on Monaco editor buttons or other UI elements

## User Impact
Title bar buttons now correctly maintain the theme color (#cccccc) in all states without turning white, providing a consistent and professional appearance.

## Test Results
- ✅ Build successful
- ✅ Specific CSS classes applied
- ✅ No side effects on other buttons

## Git Commit Hash
TBD - TitleBar: Use specific CSS classes for button colors

## Status
✅ Completed

## Related Sprint/Task
Sprint 4 Task 3 - File System Browser (UI polish)

