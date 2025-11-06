# Nova IDE Development Changelog
**Session Date:** November 6, 2025, 12:46 AM  
**Developer:** Claude (AI Assistant)  
**Session Focus:** Git Credential Integration & SSH Support

---

## 🎯 Session Overview
Implemented integrated Git credential authentication within Nova's UI to replace external Windows Git Credential Manager. Enhanced support for both HTTPS and SSH remotes, improved UX with streamlined password input, and enhanced git watcher to better detect remote repository changes.

---

## ✅ Completed Tasks

### 1. Integrated Git Credential System
**Files Modified:**
- `src/main/services/git-credential-helper.ts` (NEW)
- `src/main/services/git-service.ts`
- `src/main/main.ts`
- `src/preload/preload.ts`
- `src/types/global.d.ts`
- `src/renderer/components/GitPanel.tsx`

**Changes:**
- Created `GitCredentialHelper` service to manage credential requests between main and renderer processes
- Implemented secure credential flow that never stores passwords
- Added environment variables to bypass external credential managers (`GIT_TERMINAL_PROMPT`, `GCM_INTERACTIVE`)
- Enhanced `push()` and `pull()` operations to detect authentication errors and request credentials
- Added IPC handlers for `git-credential-request` and `git-credential-response`
- Exposed credential APIs in preload bridge and global types

**Commit:** `a9bdbef` - "feat(git): Implement integrated credential authentication within Nova UI"

### 2. Credential UX Improvements & SSH Support
**Files Modified:**
- `src/main/services/git-service.ts`
- `src/renderer/components/GitPanel.tsx`
- `src/main/services/git-watcher.ts`

**Changes:**
- **Removed username field** from credential UI (only password/token input shown)
- **Added SSH remote detection** (`isSshRemote()`, `isHttpsRemote()`)
- **Auto-detect username** from git config for HTTPS authentication
- **SSH support** with proper environment variables for ssh-agent integration
- **Fixed padding** on credential input to match left/right margins (8px 12px)
- **Enhanced git watcher** to monitor `.git/FETCH_HEAD` and `.git/ORIG_HEAD` for better detection of push/pull operations

**Improvements:**
- Credential input now only shows single password field (cleaner UX)
- Automatically uses git config username for HTTPS auth
- SSH keys work seamlessly when loaded in ssh-agent
- Consistent padding prevents UI elements from being scrunched against edges
- Better detection of external git operations (command-line push/pull)

**Commit:** `e9a108d` - "fix(git): Improve credential UX and SSH support, enhance git watcher for remote changes"

---

## 🔐 Security Features

### Credential Handling
✅ **Never stored** - Credentials only exist in memory during the operation  
✅ **Immediate cleanup** - Cleared after each use  
✅ **No logging** - Passwords never written to logs or console  
✅ **Sandboxed** - Uses Electron IPC for secure main↔renderer communication  
✅ **HTTPS injection** - Credentials injected into git URLs for single operation only  
✅ **SSH-agent compatible** - Works with existing SSH key configurations

---

## 🎨 User Experience Flow

### HTTPS Authentication
1. User clicks **Push** or **Pull** button
2. If authentication needed, prompt appears in GitPanel status area
3. Prompt shows: *"Enter credentials for github.com"*
4. Single password field displayed (username auto-detected from git config)
5. User enters password or Personal Access Token
6. Press **Enter** to submit, **Escape** to cancel
7. Nova securely passes credentials to git
8. Operation completes
9. Credentials immediately cleared from memory

### SSH Authentication  
1. If SSH keys are loaded in ssh-agent, operations work seamlessly
2. No credential prompt needed for configured SSH keys
3. Falls back to credential prompt for HTTPS remotes only

---

## 🔧 Technical Details

### Credential Helper Architecture
```
┌─────────────┐     IPC Request      ┌──────────────────┐
│  Git Push   │ ───────────────────> │ GitCredentialHelper│
│  (git-service) │                      │  (main process)  │
└─────────────┘                      └──────────────────┘
                                              │
                                              │ IPC Send
                                              ▼
┌─────────────┐     User Input       ┌──────────────────┐
│  GitPanel   │ <─────────────────── │   Renderer UI    │
│  (password) │ ───────────────────> │  (credential form)│
└─────────────┘     IPC Response     └──────────────────┘
```

### Git Watcher Enhancements
- Now monitors `.git/FETCH_HEAD` - Updated during fetch/pull operations
- Now monitors `.git/ORIG_HEAD` - Updated during merge/rebase operations  
- Monitors `.git/refs/remotes/` - Remote tracking branches (push/pull)
- Debounced file change events (100ms) to avoid excessive refreshes

### Environment Variables
- `GIT_TERMINAL_PROMPT=0` - Disables interactive prompts
- `GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no` - SSH configuration
- `SSH_ASKPASS_REQUIRE=never` - Prevents SSH passphrase prompts (uses ssh-agent)
- `GCM_INTERACTIVE=never` - Disables Windows Git Credential Manager

---

## 🐛 Issues Resolved

### Issue 1: External Credential Manager
**Problem:** Windows Git Credential Manager opened outside Nova for authentication  
**Solution:** Implemented integrated credential system that prompts within Nova UI  
**Impact:** Seamless authentication experience without leaving the IDE

### Issue 2: Username Field Confusion
**Problem:** Username field shown even for SSH remotes (where it doesn't make sense)  
**Solution:** Removed username field, auto-detect from git config for HTTPS  
**Impact:** Cleaner UI, less user confusion

### Issue 3: Inconsistent Padding
**Problem:** Credential input scrunched against right edge  
**Solution:** Added symmetric padding (8px 12px) to credential input container  
**Impact:** Consistent visual spacing matching other UI elements

### Issue 4: Push Button Active After CLI Push
**Problem:** Push button remained active after pushing from command line  
**Solution:** Enhanced git watcher to monitor FETCH_HEAD and ORIG_HEAD for external operations  
**Impact:** UI state correctly reflects repository status after external git commands

---

## 📊 Code Statistics
- **Files Created:** 1 (`git-credential-helper.ts`)
- **Files Modified:** 6
- **Lines Added:** ~477
- **Lines Removed:** ~94
- **Net Change:** +383 lines
- **Commits:** 2

---

## 🧪 Testing Notes

### HTTPS Repositories
- ✅ Push with credentials works
- ✅ Pull with credentials works
- ✅ Token authentication supported (GitHub PAT, etc.)
- ✅ Credentials never persisted

### SSH Repositories  
- ✅ Push with ssh-agent works seamlessly
- ✅ Pull with ssh-agent works seamlessly
- ✅ No credential prompt when keys loaded
- ⚠️ SSH key passphrase entry not yet supported (requires ssh-agent)

### Git Watcher
- ✅ Detects local file changes
- ✅ Detects branch switches (HEAD changes)
- ✅ Detects commits (refs changes)
- ✅ Detects push/pull (FETCH_HEAD/remotes changes)
- ✅ Debounces rapid file changes

---

## 📝 Developer Notes

### SSH Passphrase Support
For future enhancement: To support SSH key passphrases directly in Nova (without ssh-agent), we would need to:
1. Create a custom SSH_ASKPASS script
2. Set SSH_ASKPASS environment variable to point to our script
3. Have the script communicate with Nova via named pipe or socket
4. Display passphrase prompt in Nova UI
5. Return passphrase to SSH via stdout

This is complex and ssh-agent is the standard approach, so current implementation assumes keys are loaded in ssh-agent.

### Remote URL Detection
```typescript
// HTTPS: https://github.com/user/repo.git or http://...
isHttpsRemote(url): url.startsWith('https://') || url.startsWith('http://')

// SSH: git@github.com:user/repo.git or ssh://git@github.com/user/repo.git
isSshRemote(url): url.startsWith('git@') || url.startsWith('ssh://')
```

### Credential Injection (HTTPS Only)
```typescript
// Original: https://github.com/user/repo.git
// Injected: https://username:password@github.com/user/repo.git
const url = new URL(remoteUrl);
url.username = encodeURIComponent(username);
url.password = encodeURIComponent(password);
```

---

## 🎓 Key Learnings

1. **Electron IPC Security**: Credential flow uses proper IPC channels, never exposing sensitive data
2. **Git Internals**: Understanding `.git/refs/`, `.git/FETCH_HEAD` structure crucial for monitoring
3. **Chokidar Patterns**: Negative lookahead regex patterns can selectively watch within ignored directories
4. **SSH vs HTTPS**: Different authentication mechanisms require different approaches
5. **UX Simplicity**: Removing unnecessary fields (username) improves user experience

---

## 🚀 Next Steps

### Potential Future Enhancements
1. ✨ Support for SSH key passphrase entry within Nova (complex, low priority)
2. ✨ Credential caching for session (optional, with user consent)
3. ✨ Support for OAuth device flow authentication (GitHub, GitLab)
4. ✨ Multiple remote support (origin, upstream, etc.)
5. ✨ Git credential helper integration (git-credential-manager, etc.)

### Related Work
- Consider implementing git-credential-manager integration as alternative
- Add settings for preferred authentication method
- Visual feedback during authentication (spinner, progress)

---

## 📌 Session Summary

Successfully transformed Nova's Git authentication from an external, disruptive experience to an integrated, seamless workflow. The implementation prioritizes security (no credential storage), simplicity (single password field), and compatibility (both HTTPS and SSH). Enhanced git watcher ensures UI stays synchronized with repository state even when using external git commands.

**Status:** ✅ Complete and tested  
**Build:** ✅ Passing  
**Commits:** 2 (`a9bdbef`, `e9a108d`)

---

*Changelog generated during Nova IDE development session*  
*© 2025 MiraNova Studios. All rights reserved.*

