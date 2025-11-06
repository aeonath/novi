# Changelog: Fix 5-Second Flash - Race Condition in Ready Events

**Date:** 2025-11-05  
**Time:** 22:14  
**Type:** Bug Fix  
**Component:** Ready Events System  
**Severity:** Medium (Visual Glitch)

## Summary

Fixed annoying 5-second flash that occurred on every app startup. The issue was a race condition in the ready-events system where `waitForMultipleReady` didn't check if components were already ready before setting up event listeners.

## The Bug 🐛

**Symptom:** 
- Screen flashed briefly exactly 5 seconds after opening the app
- Happened consistently on every startup
- No errors in logs, just a visual glitch

**Root Cause:**

The `waitForMultipleReady` function called `waitForReady` directly instead of `ensureReady`:

```typescript
// BEFORE (Buggy):
export async function waitForMultipleReady(eventTypes, timeoutMs = 5000) {
  await Promise.all(eventTypes.map(type => waitForReady(type, timeoutMs)));
  // ❌ Always sets up listeners, even if events already fired!
}
```

**The Race Condition:**

In React, child components' useEffects run before parent useEffects:

1. **Monaco/TabBar/FileTree mount** (children)
2. **Their useEffects run** → call `markReady('monaco-ready')`, etc.
3. **Events fire** (but no listeners yet!)
4. **App's workspace restoration useEffect runs** (parent)
5. **Calls `waitForMultipleReady(['monaco-ready', 'tabbar-ready'])`**
6. **Sets up event listeners** ❌ But events already fired!
7. **Listeners wait forever...**
8. **5 seconds later: timeout fires** ⚡ Causes flash!

## The Fix ✅

Changed `waitForMultipleReady` to use `ensureReady` which checks if events already fired:

```typescript
// AFTER (Fixed):
export async function waitForMultipleReady(eventTypes, timeoutMs = 5000) {
  await Promise.all(eventTypes.map(type => ensureReady(type, timeoutMs)));
  // ✅ Checks if already ready, returns immediately if so!
}
```

**How `ensureReady` Works:**

```typescript
export async function ensureReady(eventType, timeoutMs = 5000) {
  if (isReady(eventType)) {
    console.log(`${eventType} already ready`);
    return Promise.resolve();  // ✅ Immediate return, no waiting!
  }
  return waitForReady(eventType, timeoutMs);  // Set up listener if not ready yet
}
```

## Additional Improvements

### 1. Prevent Duplicate Ready Signals

```typescript
export function markReady(eventType) {
  if (!readyStates.has(eventType)) {
    readyStates.add(eventType);
    signalReady(eventType);
    console.log(`Marked ready: ${eventType}`);
  } else {
    console.log(`Already ready (skipping duplicate): ${eventType}`);
  }
}
```

Now calling `markReady` multiple times only signals once, preventing listener churn.

### 2. Better Listener Cleanup

```typescript
export function waitForReady(eventType, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let resolved = false;  // ✅ Flag to prevent double-handling
    
    const handler = () => {
      if (resolved) return;  // ✅ Guard
      resolved = true;
      clearTimeout(timeout);
      window.removeEventListener(eventType, handler);
      console.log(`Received: ${eventType}`);
      resolve();
    };

    const timeout = setTimeout(() => {
      if (resolved) return;  // ✅ Guard
      resolved = true;
      window.removeEventListener(eventType, handler);
      console.warn(`Timeout waiting for ${eventType} after ${timeoutMs}ms`);
      reject(new Error(`Timeout waiting for ${eventType} after ${timeoutMs}ms`));
    }, timeoutMs);

    window.addEventListener(eventType, handler, { once: true });  // ✅ Auto-cleanup
  });
}
```

**Improvements:**
- Added `resolved` flag to prevent double-handling
- Used `{ once: true }` for automatic listener cleanup
- Better logging to track event flow
- Guards on both handler and timeout

## Why The 5-Second Timing?

The timeout duration in `waitForReady` is 5000ms (5 seconds). When the race condition occurred:

1. Listeners set up after events fired
2. Listeners never triggered (events already passed)
3. Exactly 5 seconds later → timeout fired
4. Timeout error caught, but caused React re-render
5. Re-render triggered visual flash

The timing was consistent because timeouts are precise!

## React useEffect Execution Order

Understanding the order helped debug this:

```
Component Tree:
  App
    ├─ MonacoEditor
    ├─ TabBar
    └─ FileTree

useEffect Execution Order (Bottom-Up):
  1. MonacoEditor useEffect  → markReady('monaco-ready')
  2. TabBar useEffect        → markReady('tabbar-ready')
  3. FileTree useEffect      → markReady('filetree-ready')
  4. App useEffect           → waitForMultipleReady(['monaco-ready', 'tabbar-ready'])
                                ❌ Events already fired!
```

**Key Insight:** Parent useEffects run AFTER child useEffects, so child components often signal ready before parent components start waiting!

## Files Changed

**src/renderer/utils/ready-events.ts:**
- Changed `waitForMultipleReady` to use `ensureReady` instead of `waitForReady`
- Added duplicate prevention in `markReady`
- Added `resolved` flag in `waitForReady` for guard
- Added `{ once: true }` to event listener for auto-cleanup
- Improved logging throughout

## Testing

**Before Fix:**
- ❌ Flash at 5 seconds on every startup
- ❌ Console shows timeout warnings
- ❌ Annoying visual glitch

**After Fix:**
- ✅ No flash
- ✅ No timeouts
- ✅ Console shows "already ready" for pre-fired events
- ✅ Smooth startup experience

Manual testing:
- ✅ Build successful
- ✅ No linter errors
- ✅ App starts smoothly
- ✅ No 5-second flash
- ✅ Workspace restoration works correctly
- ✅ All components initialize properly

## Prevention

To prevent similar issues in the future:

1. **Always use `ensureReady`** when you're not sure if event already fired
2. **Use `waitForReady`** only when setting up before component mounts
3. **Use `waitForMultipleReady`** for multiple events (now uses ensureReady internally)
4. **Remember React useEffect order**: Children run before parents
5. **Add guards** to prevent double-handling of async operations
6. **Use `{ once: true }`** for self-cleaning event listeners

## Lessons Learned

1. **Race conditions are subtle** - Worked sometimes, failed other times
2. **Timing gives clues** - The exact 5-second flash pointed to timeout
3. **React execution order matters** - useEffect ordering caused the race
4. **Always check if already done** - Before waiting for events
5. **Guard async operations** - Use flags to prevent double-handling

## Technical Details

### Event Lifecycle

**Healthy Flow (After Fix):**
```
1. Child component mounts
2. Child useEffect runs → markReady('component-ready')
3. Event added to readyStates Set
4. Event fires (window.dispatchEvent)
5. Parent useEffect runs → ensureReady('component-ready')
6. Checks readyStates Set → Found! ✅
7. Returns immediately (no waiting)
```

**Broken Flow (Before Fix):**
```
1. Child component mounts
2. Child useEffect runs → markReady('component-ready')
3. Event fires (but no listeners yet)
4. Parent useEffect runs → waitForMultipleReady(['component-ready'])
5. Calls waitForReady (skips ensureReady check)
6. Sets up event listener ❌ Too late!
7. Waits for event that already fired...
8. 5 seconds later → timeout → flash
```

### The Fix in Context

This bug only appeared AFTER the setTimeout elimination refactor because:
- Before: setTimeout delays gave components time to signal ready before listeners set up
- After: Event-driven is faster, so race condition became apparent
- The "magic numbers" were accidentally hiding the race condition!

**Ironic:** Eliminating setTimeout exposed a race condition that setTimeout was masking. But the proper fix is to handle the race condition correctly, not rely on arbitrary delays!

## Impact

**Before Fix:**
- ❌ Annoying flash every startup
- ❌ Poor user experience
- ❌ Looked unprofessional
- ❌ Timeout errors in logs

**After Fix:**
- ✅ Smooth startup, no flash
- ✅ Professional appearance
- ✅ Clean logs
- ✅ Proper race condition handling
- ✅ More reliable than before

## Conclusion

This fix completes the event-driven architecture refactor by properly handling the race condition between component initialization and workspace restoration. 

The 5-second flash is eliminated, and the ready-events system now correctly handles all timing scenarios. ✅

**No more flashes. No more timeouts. Just smooth, deterministic initialization.** 🎉

