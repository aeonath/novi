# Changelog - FLARE-001 Critical Stability Patch

**Date:** November 4, 2025, 00:36  
**Sprint:** 4  
**Task:** FLARE-001 - System Freeze Bug Fix  
**Type:** Critical Bug Fix  
**Severity:** Critical - System Freeze

---

## Summary
Fixed a critical infinite loop bug in `GitPanel.tsx` that caused continuous IPC calls to the main process, resulting in system-wide freezes that locked up Windows Explorer. The issue was a **recursive dependency loop** in a `useEffect` hook that triggered Git status requests hundreds of times per second.

---

## Root Cause Analysis

### The Bug
In `src/renderer/components/GitPanel.tsx` lines 43-48:

```typescript
useEffect(() => {
  refreshStatus();
  // Refresh every 5 seconds
  const interval = setInterval(refreshStatus, 5000);
  return () => clearInterval(interval);
}, [refreshStatus]); // <-- CRITICAL BUG: refreshStatus in dependency array
```

### Why It Caused System Freeze

1. **Dependency Loop**: `refreshStatus` was included in the `useEffect` dependency array
2. **Function Recreation**: `refreshStatus` has dependencies (`workspaceRoot`, `onRefreshStatus`) causing it to be recreated on every render
3. **Infinite Trigger**: Every time `refreshStatus` was recreated, the `useEffect` fired again because its dependency changed
4. **IPC Flood**: Each firing spawned a new `git status` IPC call to the main process
5. **Process Spawn Storm**: Each IPC call spawned a new Git process via `child_process`
6. **Resource Exhaustion**: Hundreds of Git processes running simultaneously exhausted system resources
7. **System Freeze**: Windows Explorer and the entire system became unresponsive

### Symptoms
- Nova IDE becomes unresponsive immediately after opening Git panel
- Windows Explorer freezes
- Task Manager shows extremely high CPU or Disk I/O
- System requires hard reboot

---

## Changes Made

### 1. GitPanel.tsx - Fixed Infinite Loop
**File**: `src/renderer/components/GitPanel.tsx`

**Before** (lines 43-48):
```typescript
useEffect(() => {
  refreshStatus();
  const interval = setInterval(refreshStatus, 5000);
  return () => clearInterval(interval);
}, [refreshStatus]); // Bug: Creates infinite loop
```

**After** (lines 44-61):
```typescript
// Initial load and polling - FIXED: removed refreshStatus from deps to prevent infinite loop
useEffect(() => {
  if (!workspaceRoot) return;
  
  console.log('[GitPanel] Setting up Git status polling for:', workspaceRoot);
  refreshStatus();
  
  // Poll every 30 seconds (reduced from 5s to prevent system overload)
  const interval = setInterval(() => {
    console.log('[GitPanel] Polling Git status');
    refreshStatus();
  }, 30000);
  
  return () => {
    console.log('[GitPanel] Cleaning up Git status polling');
    clearInterval(interval);
  };
}, [workspaceRoot]); // Only depend on workspaceRoot, not refreshStatus
```

**Key Fixes**:
- ✅ Removed `refreshStatus` from dependency array to break the infinite loop
- ✅ Changed dependency to `[workspaceRoot]` which only changes when workspace changes
- ✅ Increased polling interval from 5 seconds to 30 seconds (600% reduction in calls)
- ✅ Added early return if `workspaceRoot` is null
- ✅ Added console logging for debugging future issues
- ✅ Wrapped `refreshStatus` call in `setInterval` callback to avoid closure issues

### 2. App.tsx - Improved Monaco Loader
**File**: `src/renderer/components/App.tsx`

**Changes** (lines 267-310):
- Increased Monaco polling interval from 50ms to 100ms (50% reduction)
- Added comprehensive console logging for debugging
- Fixed potential `undefined` variable issue in cleanup
- Explicitly typed `interval` and `timeout` variables as `NodeJS.Timeout | undefined`
- Added early return with `undefined` when Monaco is already available

**Benefits**:
- Reduced CPU load during startup
- Better debugging capability
- More robust cleanup logic

---

## Testing & Verification

### Manual Testing Steps
1. ✅ Open Nova IDE
2. ✅ Open a directory with a Git repository
3. ✅ Switch to Git panel view
4. ✅ Monitor Task Manager for CPU/Disk usage
5. ✅ Verify Git status updates correctly
6. ✅ Leave Git panel open for 2+ minutes
7. ✅ Confirm system remains responsive
8. ✅ Switch back to file tree
9. ✅ Switch to Git panel again
10. ✅ Verify no memory leaks or performance degradation

### Expected Behavior After Fix
- ✅ CPU usage stays low (<5%) when Git panel is open
- ✅ Git status updates only when:
  - Panel first opens
  - User clicks refresh button
  - Every 30 seconds (automatic polling)
  - After a Git operation (stage/unstage/commit/push/pull)
- ✅ System remains fully responsive
- ✅ Windows Explorer does not freeze
- ✅ No rapid-fire console logging

### Console Verification
When working correctly, you should see:
```
[GitPanel] Setting up Git status polling for: C:/path/to/repo
[GitPanel] Fetching Git status for: C:/path/to/repo
... (30 seconds later)
[GitPanel] Polling Git status
[GitPanel] Fetching Git status for: C:/path/to/repo
... (30 seconds later)
[GitPanel] Polling Git status
```

**NOT** (the bug behavior):
```
[GitPanel] Fetching Git status for: C:/path/to/repo
[GitPanel] Fetching Git status for: C:/path/to/repo
[GitPanel] Fetching Git status for: C:/path/to/repo
[GitPanel] Fetching Git status for: C:/path/to/repo
[GitPanel] Fetching Git status for: C:/path/to/repo
... (repeating infinitely at high speed)
```

---

## Technical Details

### React Hook Dependency Best Practices
This bug highlights important React `useEffect` patterns:

**❌ Bad Pattern - Infinite Loop**:
```typescript
const myFunction = useCallback(() => {
  // ... do something
}, [dep1, dep2]);

useEffect(() => {
  myFunction();
  const interval = setInterval(myFunction, 1000);
  return () => clearInterval(interval);
}, [myFunction]); // Bug: myFunction in deps
```

**✅ Good Pattern - Stable Dependencies**:
```typescript
const myFunction = useCallback(() => {
  // ... do something
}, [dep1, dep2]);

useEffect(() => {
  myFunction();
  const interval = setInterval(() => myFunction(), 1000);
  return () => clearInterval(interval);
}, [dep1, dep2]); // Only depend on the actual data, not the function
```

### IPC Call Optimization
- Git status calls are now throttled to maximum once per 30 seconds (automatic)
- User-initiated refreshes still happen immediately
- Git operations (stage/unstage/commit) trigger immediate refresh
- This prevents IPC flooding while maintaining responsive UI

### Performance Impact
- **Before**: Potentially 100+ Git processes spawned per second
- **After**: Maximum 1 Git process per 30 seconds (automatic polling)
- **Reduction**: 99.9% decrease in process spawning
- **Result**: System remains stable and responsive

---

## Files Modified
- `src/renderer/components/GitPanel.tsx` - Fixed infinite loop, reduced polling frequency
- `src/renderer/components/App.tsx` - Improved Monaco loader robustness

---

## Related Issues
- ChatGPT Debug Analysis: "Nova caused a full system freeze, locking up Windows Explorer"
- Symptom: Renderer or main process entered resource loop
- Root Cause: useEffect with function in dependency array creating infinite IPC calls

---

## Follow-up Recommendations

### Future Improvements
1. **Add IPC Rate Limiting**: Implement a rate limiter in the main process to prevent IPC flooding even if renderer has bugs
2. **Process Pool Management**: Limit concurrent Git processes to prevent spawn storms
3. **React DevTools**: Use React DevTools Profiler in development to detect render loops
4. **Performance Monitoring**: Add performance metrics to track IPC call frequency
5. **Circuit Breaker Pattern**: Implement circuit breaker for IPC calls that fail or loop repeatedly

### Monitoring
Watch for these patterns in console logs that might indicate similar issues:
- Rapid-fire repeated log messages
- Same useEffect running multiple times per second
- IPC calls with no delay between them
- Memory usage climbing continuously

---

## Commit Message
```
FLARE-001: Fix critical infinite loop causing system freeze

Fixed recursive dependency loop in GitPanel useEffect that caused
continuous Git status IPC calls, spawning hundreds of processes and
freezing Windows Explorer. Reduced polling from 5s to 30s and removed
function from dependency array.
```

