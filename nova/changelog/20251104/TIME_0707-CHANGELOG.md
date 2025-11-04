# Window Focus Keyboard Access Fix — 20251104.0707

## Summary
Improved window focus handling to ensure Ctrl+K works immediately when Nova window comes to foreground, without requiring a mouse click first. Added visibility change detection and dual focus calls for reliable keyboard access.

---

## Issue
User reported: "When the window comes to the foreground I need to be able to hit CTRL+K to bring up the menu. I have to click on the window first before CTRL+K works"

**Problem:** Window gains focus but body element doesn't receive keyboard focus automatically, requiring manual click to enable keyboard shortcuts.

---

## Root Cause

The existing focus handler only used:
- Single `window.focus` event listener
- Single `document.body.focus()` call with 0ms timeout

This wasn't sufficient because:
1. **Timing issue** - 0ms timeout wasn't enough for focus to settle
2. **Missing visibility detection** - Window minimize/restore didn't trigger focus
3. **Single focus attempt** - One call sometimes failed

---

## Solution

### 1. Dual Focus Strategy
Focus body **twice** with a delay to ensure it takes:
```typescript
document.body.focus();           // Immediate attempt
setTimeout(() => {
  document.body.focus();          // Retry after 50ms
  console.log('[Renderer] Body focused, Ctrl+K should work now');
}, 50);
```

### 2. Visibility Change Detection
Added listener for window becoming visible (minimize/restore):
```typescript
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('[Renderer] Window became visible');
    ensureFocus();
  }
});
```

### 3. Extracted Focus Function
Created reusable `ensureFocus()` function:
```typescript
const ensureFocus = () => {
  console.log('[Renderer] Ensuring keyboard focus');
  // Ensure body is focusable
  if (!document.body.hasAttribute('tabindex')) {
    document.body.setAttribute('tabindex', '-1');
  }
  // Focus body immediately and again after a short delay
  document.body.focus();
  setTimeout(() => {
    document.body.focus();
    console.log('[Renderer] Body focused, Ctrl+K should work now');
  }, 50);
};
```

---

## Files Changed

### Modified: `src/renderer/index.tsx`

**Before:**
```typescript
window.addEventListener('focus', () => {
  console.log('[Renderer] Window gained focus');
  if (!document.body.hasAttribute('tabindex')) {
    document.body.setAttribute('tabindex', '-1');
  }
  setTimeout(() => {
    document.body.focus();
  }, 0);
});

window.dispatchEvent(new Event('focus'));
```

**After:**
```typescript
const ensureFocus = () => {
  console.log('[Renderer] Ensuring keyboard focus');
  if (!document.body.hasAttribute('tabindex')) {
    document.body.setAttribute('tabindex', '-1');
  }
  document.body.focus();
  setTimeout(() => {
    document.body.focus();
    console.log('[Renderer] Body focused, Ctrl+K should work now');
  }, 50);
};

window.addEventListener('focus', ensureFocus);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('[Renderer] Window became visible');
    ensureFocus();
  }
});

ensureFocus();
```

---

## How It Works

### Focus Triggers

1. **On Startup:**
   - `ensureFocus()` called immediately
   - Body gets focus before user interaction

2. **On Window Focus:**
   - User clicks on window title bar
   - User Alt+Tabs to Nova
   - `window.focus` event → `ensureFocus()`

3. **On Visibility Change:**
   - Window restored from minimize
   - Window brought to foreground
   - `visibilitychange` event → `ensureFocus()`

### Dual Focus Strategy

**Why focus twice?**
- First call: Attempt immediate focus
- Second call (50ms later): Ensure focus if first failed
- **Result:** Reliable focus even if timing is tricky

**Why 50ms?**
- 0ms was too fast (browser hasn't processed focus yet)
- 50ms gives browser time to stabilize
- Small enough to be imperceptible to user

---

## Testing

### Build and Run
```bash
npm run build
npm start
```

### Test Scenarios

**1. Alt+Tab to Nova:**
- Alt+Tab from another application to Nova
- **Expected:** Immediately press `Ctrl+K` → Action HUD opens
- **NO mouse click required** ✅

**2. Minimize and Restore:**
- Minimize Nova window
- Click taskbar to restore
- **Expected:** Immediately press `Ctrl+K` → Action HUD opens
- **NO mouse click required** ✅

**3. Click Window Title:**
- Click another window
- Click Nova title bar
- **Expected:** Immediately press `Ctrl+K` → Action HUD opens
- **NO mouse click required** ✅

**4. Startup:**
- Launch Nova
- **Expected:** Immediately press `Ctrl+K` → Action HUD opens
- **NO mouse click required** ✅

---

## Console Logs

### On Window Focus
```
[Renderer] Ensuring keyboard focus
[Renderer] Body focused, Ctrl+K should work now
```

### On Minimize/Restore
```
[Renderer] Window became visible
[Renderer] Ensuring keyboard focus
[Renderer] Body focused, Ctrl+K should work now
```

---

## User Experience Improvement

### Before
1. Alt+Tab to Nova
2. Press `Ctrl+K` → **Nothing happens** ❌
3. Click anywhere in window
4. Press `Ctrl+K` → Action HUD opens ✅

### After
1. Alt+Tab to Nova
2. Press `Ctrl+K` → **Action HUD opens immediately** ✅

**Result:** Faster workflow, no unnecessary clicks, better UX!

---

## Technical Notes

### Why `tabindex="-1"`?
- Makes `document.body` programmatically focusable
- `-1` means focusable but not in tab order
- Doesn't interfere with normal tab navigation

### Why Not `autofocus` Attribute?
- `autofocus` only works on page load
- We need dynamic focus on every focus event
- JavaScript `focus()` gives us control

---

## Related Files
- `src/renderer/components/ActionHUD.tsx` - Handles `Ctrl+K` event (no changes needed)
- All keyboard shortcuts now work immediately on focus

---

## Git Commit Hash
`TBD` - Window Focus Keyboard Access Fix

---

## Status
✅ Fixed - Ctrl+K and all keyboard shortcuts work immediately on window focus

---

*Changelog created by: Claude (Sonnet 4.5)*  
*Type: UX Improvement / Bug Fix*  
*Sprint: Sprint 4 Task 5 (Terminal) - UX Polish*

