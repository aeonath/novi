# Changelog: Fix Gray Screen Bug in Workspace Restoration

**Date:** 2025-11-05  
**Time:** 21:18  
**Type:** Critical Bug Fix (P0)  
**Component:** App (Workspace Restoration)

## Summary

Fixed the gray screen crash on startup caused by incorrect handling of the `readFile` API return value in workspace restoration code. The bug was introduced in commit `3bedc30`.

## The Bug 🐛

**Symptom:**
- Gray screen on app startup
- Welcome screen flashed briefly then disappeared
- Nothing clickable, app completely frozen
- Could not access developer tools

**Root Cause:**
The `window.api.readFile()` IPC handler returns an **object** with structure:
```typescript
{
  path: string,
  content: string,
  size: number,
  modified: Date
}
```

But the workspace restoration code was treating it as a **string**:
```typescript
const content = await window.api.readFile(file.filePath);
tabBarAPI.addTab({ content: content }); // ❌ Passing object as string!
monacoAPI.loadFile(filePath, content);  // ❌ Monaco expects string, got object!
```

**Result:**
- Monaco editor received an object instead of string content
- This caused a silent failure or render issue
- The app showed nothing (gray screen)

## The Fix ✅

**Change in `src/renderer/components/App.tsx`:**

```typescript
// Before (BROKEN):
const content = await window.api.readFile(file.filePath);
tabBarAPI.addTab({ content: content });
monacoAPI.loadFile(filePath, content);

// After (FIXED):
const fileData = await window.api.readFile(file.filePath);
tabBarAPI.addTab({ content: fileData.content }); // ✅ Extract .content property
monacoAPI.loadFile(filePath, fileData.content); // ✅ Pass string, not object
```

**Change in `src/renderer/components/actions.ts`:**

Added missing `onNovaPrompt` to `ActionContext` interface (fixing linter errors):
```typescript
export interface ActionContext {
  // ... other properties
  onNovaPrompt?: () => void | Promise<void>; // ✅ Added
  // ...
}
```

## Debugging Process

1. **Disabled all modal overlays** - Not the culprit
2. **Disabled workspace restoration** - ✅ **App worked!**
3. **Identified the specific bug** - `readFile` return value mishandled
4. **Fixed the bug** - Extract `.content` property from returned object
5. **Re-enabled everything** - All features working again

## Files Changed

1. **src/renderer/components/App.tsx**
   - Line 202: Changed `const content` to `const fileData`
   - Line 212: Changed `content: content` to `content: fileData.content`
   - Line 218: Changed `monacoAPI.loadFile(filePath, content)` to `monacoAPI.loadFile(filePath, fileData.content)`
   - Added comment explaining the fix

2. **src/renderer/components/actions.ts**
   - Added `onNovaPrompt?: () => void | Promise<void>;` to `ActionContext` interface

## Impact

**Before Fix:**
- ❌ App completely unusable on startup
- ❌ Gray screen of death
- ❌ No way to recover without clearing workspace data

**After Fix:**
- ✅ App starts normally
- ✅ Workspace restoration works correctly
- ✅ Files load with proper content
- ✅ All features functional

## Prevention

**For Future Development:**
1. Always check IPC handler return types
2. Use TypeScript interfaces for IPC return values
3. Test workspace restoration with real data
4. Add unit tests for workspace loading

## Related Commits

- `3bedc30` - Introduced the bug (workspace restoration implementation)
- `5abed54` - Attempted fix but didn't address root cause
- This commit - Actual fix for the gray screen issue

## Testing

- ✓ Build successful
- ✓ No linter errors  
- ✓ App starts with welcome screen
- ✓ Workspace restoration loads files correctly
- ✓ File content displays in Monaco editor
- ✓ All modal components working

**Status:** FIXED ✅  
The app is fully functional again!

