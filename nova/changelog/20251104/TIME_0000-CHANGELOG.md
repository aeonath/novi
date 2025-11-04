# Git Panel Fixes — Toggle Button and Workspace Tracking — 20251104.0000

## Summary
Fixed two critical Git panel issues: added toggle button to return to FileTree view, and fixed workspace root tracking so Git status properly detects changes.

## Files Changed
- `src/renderer/components/GitPanel.tsx` — Added folder toggle button in header
- `src/renderer/components/FileTree.tsx` — Added `onDirectoryOpen` callback
- `src/renderer/components/App.tsx` — Wired up directory tracking and Git status fetching

## Issues Fixed

### Issue 1: No Way to Return to FileTree
**Problem:**
When Git panel was open, there was no button to toggle back to the FileTree view. Users were stuck in Git panel once they opened it.

**Solution:**
Added a folder button (📁) to the Git panel header next to the refresh button:

```tsx
<div style={styles.headerButtons}>
  {onToggleFiles && (
    <button style={styles.refreshButton} onClick={onToggleFiles} title="Show Files">
      📁
    </button>
  )}
  <button style={styles.refreshButton} onClick={refreshStatus} title="Refresh">
    ⟳
  </button>
</div>
```

**User Flow:**
1. In FileTree → Click ⎇ → Git Panel opens
2. In Git Panel → Click 📁 → FileTree returns
3. Seamless two-way toggle

### Issue 2: Git Status Shows "No Changes" Despite File Modifications
**Problem:**
Git status wasn't detecting changes even when files were modified. The root cause was that `workspaceRoot` state in App.tsx was never being set when a directory was opened, so Git commands were either not running or running against the wrong directory.

**Root Causes:**
1. FileTree's `openDirectory` function wasn't notifying parent component
2. App.tsx wasn't tracking when directories were opened
3. Git status was only fetched when individual files were opened (not directory)

**Solution:**

**Step 1: FileTree Notification**
Added `onDirectoryOpen` prop and callback:
```tsx
export interface FileTreeProps {
  onDirectoryOpen?: (dirPath: string) => void;
}

const openDirectory = useCallback(async () => {
  // ... open directory logic ...
  
  // Notify parent of directory change
  if (onDirectoryOpen) {
    onDirectoryOpen(dirPath);
  }
}, [onDirectoryOpen]);
```

**Step 2: App.tsx Workspace Tracking**
Wired up the callback to set workspace root and fetch Git status:
```tsx
<FileTree
  onDirectoryOpen={async (dirPath: string) => {
    console.log('[App] Directory opened:', dirPath);
    setWorkspaceRoot(dirPath);
    
    // Fetch git status for workspace
    if (window.api?.gitGetStatus) {
      try {
        const status = await window.api.gitGetStatus(dirPath);
        console.log('[App] Git status fetched:', status);
        if (status.isRepo) {
          setGitStatus(status);
        } else {
          setGitStatus(null);
        }
      } catch (error) {
        console.error('[App] Failed to get git status:', error);
        setGitStatus(null);
      }
    }
  }}
/>
```

**Step 3: Removed Redundant File-Based Tracking**
Removed the previous logic that tried to extract workspace root from file paths, which was error-prone and didn't work when just browsing directories.

## How It Works Now

### Correct Workflow
1. **User opens directory** → FileTree's `openDirectory` is called
2. **FileTree calls `onDirectoryOpen(dirPath)`** → App.tsx receives directory path
3. **App.tsx sets `workspaceRoot` state** → State updated with correct path
4. **App.tsx calls `gitGetStatus(dirPath)`** → Git service checks status
5. **Git status returned** → Stored in AppContext
6. **GitPanel displays status** → Shows actual changes
7. **StatusBar shows branch** → Branch name appears

### Previous Broken Workflow
1. User opens directory → No notification to parent
2. `workspaceRoot` remains `null`
3. Git panel tries to fetch status with `null` → Fails or returns nothing
4. Shows "No changes" or "No workspace open"

## Data Flow

```
User clicks "Open Folder"
  ↓
FileTree.openDirectory()
  ↓
window.api.selectDirectory() (IPC)
  ↓
Directory path received
  ↓
FileTree.onDirectoryOpen(dirPath) callback
  ↓
App.setWorkspaceRoot(dirPath)
  ↓
window.api.gitGetStatus(dirPath) (IPC)
  ↓
GitService.getStatus(dirPath)
  ↓
git status --porcelain (CLI)
  ↓
Parse results
  ↓
Return GitStatus
  ↓
App.setGitStatus(status)
  ↓
GitPanel re-renders with files
  ↓
StatusBar shows branch
```

## Technical Details

### GitPanel Header Changes
Added `headerButtons` div to group toggle and refresh buttons:
```css
headerButtons: {
  display: 'flex',
  gap: '4px',
}
```

Both buttons now share the same styling (`refreshButton`), providing consistent UI.

### FileTree Enhancement
The `onDirectoryOpen` callback fires immediately after a directory is successfully loaded:
- Passes full directory path
- Only fires on successful directory open (not failures)
- Separate from `onFileOpen` (which fires when individual files are clicked)

### App.tsx State Management
- `workspaceRoot` state tracks currently open directory
- Set immediately when directory opens
- Used as `cwd` parameter for all Git operations
- Git status fetched synchronously after setting workspace root

## Testing Checklist
- [x] Can toggle from FileTree to Git Panel (⎇ button)
- [x] Can toggle from Git Panel to FileTree (📁 button)
- [x] Open directory → workspace root set correctly
- [x] Open directory with Git repo → branch appears in StatusBar
- [x] Modify file → Git Panel shows file in "CHANGES" section
- [x] Stage file → File moves to "STAGED CHANGES" section
- [x] Commit → Changes committed and panel updates
- [x] Non-Git directory → Shows "Not a Git repository"

## Edge Cases Handled
1. **Directory not a Git repo** → Sets `gitStatus` to `null`, panel shows appropriate message
2. **Git status fetch fails** → Error logged, `gitStatus` set to `null`
3. **Toggle button only shows when callback provided** → Conditional rendering
4. **Multiple directory opens** → Workspace root updates each time
5. **Switch between repos** → Git status refreshes for new repo

## User Impact
- **Can now navigate back to files** — No longer stuck in Git panel
- **Git changes detected correctly** — Accurate file status display
- **Better UX flow** — Clear visual navigation between views
- **More reliable** — Workspace tracking based on directory open, not file open

## Performance
- Git status fetched once per directory open (not per file)
- Auto-refresh continues every 5 seconds once in Git panel
- Console logging added for debugging workspace tracking

## Git Commit Hash
TBD - GitPanel: Add toggle button and fix workspace tracking

## Status
✅ Completed

## Related Sprint/Task
Sprint 4 Task 4 - Git Integration (Bug fixes)

