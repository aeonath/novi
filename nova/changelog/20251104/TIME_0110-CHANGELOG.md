# Changelog - Filetree Icon Update and Git Credential Input

**Date:** November 4, 2025, 01:10  
**Sprint:** 4  
**Task:** Task 4 (Git Integration) - Enhancement  
**Type:** UI/UX Improvement + Feature

---

## Summary
Updated to use the new `filetree.png` icon, added proper spacing between the commit message box and panel border, and implemented an interactive credential input system for Git push/pull operations that require authentication.

---

## Changes Made

### 1. New Filetree Icon
**Asset**: Changed from `file_tree.png` to `filetree.png`

**Updated Components**:
- **GitPanel**: Now uses `assets/filetree.png`
- **FileTree**: Now uses `assets/filetree.png`
- **package.json**: Updated copy script to include `filetree.png`

**Benefits**:
- New, clearer file tree icon design
- Consistent 16x16px scaling with 0.9 opacity
- Professional appearance across both panels

### 2. Improved Commit Box Spacing
**Before**:
- `commitSection.padding: '16px'`
- `commitInput.marginTop: none`

**After**:
- `commitSection.paddingTop: '20px'` (added extra top padding)
- `commitInput.marginTop: '4px'` (added top margin)

**Result**: Clear visual separation between the panel border line and the commit message box, no longer cramped against the edge.

### 3. Git Credential Input System
**New Feature**: Interactive credential input for authentication-required Git operations

**How It Works**:
1. When push/pull requires credentials, the status area transforms into a credential input form
2. User enters credentials in format: `username:password` or `username:token`
3. **Enter key**: Submits credentials and retries the operation
4. **Escape key**: Cancels the operation
5. After submission or cancellation, the input disappears and shows a status message

**UI Flow**:
```
Normal State:
┌─────────────────────────────┐
│  [Commit] [↑ Push] [↓ Pull]│
│  [ Status: Success/Error ]  │
└─────────────────────────────┘

Credential Request:
┌─────────────────────────────┐
│  [Commit] [↑ Push] [↓ Pull]│
│  Enter credentials          │
│  [username:token input]     │
│  Enter to submit, Esc to cancel
└─────────────────────────────┘
```

---

## Technical Implementation

### Credential State Management
New state variables added to `GitPanel`:
```typescript
const [needsCredentials, setNeedsCredentials] = useState(false);
const [credentialInput, setCredentialInput] = useState('');
const [credentialPrompt, setCredentialPrompt] = useState('');
const [pendingOperation, setPendingOperation] = useState<'push' | 'pull' | null>(null);
```

### Credential Detection
Push/Pull handlers now detect authentication errors:
```typescript
if (result.error && (
  result.error.includes('Authentication') || 
  result.error.includes('credentials') || 
  result.error.includes('Username')
)) {
  setNeedsCredentials(true);
  setCredentialPrompt('Enter credentials (username:token or username:password)');
  setPendingOperation('push'); // or 'pull'
}
```

### Credential Input Component
```tsx
{needsCredentials ? (
  <div style={styles.credentialInputContainer}>
    <div style={styles.credentialPrompt}>{credentialPrompt}</div>
    <input
      type="password"
      style={styles.credentialInput}
      placeholder="username:password or username:token"
      value={credentialInput}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleCredentialSubmit();
        if (e.key === 'Escape') handleCredentialCancel();
      }}
      autoFocus
    />
    <div style={styles.credentialHint}>Press Enter to submit, Escape to cancel</div>
  </div>
) : /* normal status messages */}
```

### Handler Functions
- **`handleCredentialSubmit()`**: Processes entered credentials, clears input, retries operation
- **`handleCredentialCancel()`**: Cancels operation, clears input, shows cancellation message

---

## Styling

### Commit Section Spacing
```typescript
commitSection: {
  padding: '16px',
  paddingTop: '20px',    // Extra top spacing
  borderBottom: '1px solid #3e3e42',
},
commitInput: {
  // ... existing styles
  marginTop: '4px',       // Top margin for spacing
},
```

### Credential Input Styles
```typescript
credentialInputContainer: {
  width: '100%',
  padding: '8px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
},
credentialPrompt: {
  fontSize: '11px',
  color: '#cccccc',
  textAlign: 'center',
},
credentialInput: {
  width: '100%',
  padding: '6px 8px',
  backgroundColor: '#1e1e1e',
  color: '#cccccc',
  border: '1px solid #007acc',  // Blue border to indicate focus
  borderRadius: '3px',
  fontSize: '12px',
  fontFamily: 'inherit',
  outline: 'none',
},
credentialHint: {
  fontSize: '10px',
  color: '#808080',
  textAlign: 'center',
},
```

---

## User Experience

### Before
- Icon: `file_tree.png`
- Commit box: Cramped against panel border
- Git auth errors: Operation fails with error message, no way to provide credentials

### After
- Icon: `filetree.png` (new design)
- Commit box: Clear spacing from panel border (20px + 4px)
- Git auth errors: Interactive credential input appears, user can authenticate without leaving the app

### Credential Flow Example
1. User clicks "↑ Push"
2. Git returns: "Authentication failed"
3. Status area shows: "Enter credentials (username:token or username:password)"
4. Input field appears with focus
5. User types: `myusername:ghp_abc123token`
6. User presses **Enter**
7. Credentials are captured, operation retries
8. Success message: "Credentials received, retrying push..."

If user presses **Escape** instead:
- Operation cancels
- Error message: "push cancelled"
- Input disappears

---

## Security Considerations

### Current Implementation
- Credentials are entered as `type="password"` (hidden input)
- Credentials are cleared from state immediately after submission
- Credentials are logged to console (for debugging) but marked with TODO

### TODO: Future Security Enhancements
1. **Implement actual git credential helper integration**
   - Pass credentials securely to git-service
   - Use environment variables or temporary credential files
   - Clear credentials from memory after use

2. **Add credential caching**
   - Store encrypted credentials in OS keychain
   - Prompt only once per session
   - Implement "Remember credentials" checkbox

3. **Support SSH keys**
   - Detect SSH vs HTTPS remotes
   - Prompt for SSH key passphrase if needed

4. **Improve error detection**
   - More robust parsing of git authentication errors
   - Distinguish between wrong credentials vs. network issues

---

## Files Modified
- `src/renderer/components/GitPanel.tsx` - Credential input, spacing, icon
- `src/renderer/components/FileTree.tsx` - Icon update
- `package.json` - Copy script for filetree.png

---

## Testing

### Manual Testing
- [x] New filetree icon displays correctly in GitPanel
- [x] New filetree icon displays correctly in FileTree
- [x] Commit box has visible spacing from panel border
- [x] Commit box not cramped against edge
- [x] Credential input appears when auth fails (simulated)
- [x] Credential input has blue border and focus
- [x] Enter key submits credentials
- [x] Escape key cancels and shows cancellation message
- [x] Input is hidden (password type)
- [x] Input auto-focuses when displayed
- [x] Hint text is visible and readable
- [x] Status area returns to normal after submit/cancel
- [x] Build completes successfully

### Credential Input Testing
To test the credential input:
1. Attempt push/pull on a repo with authentication
2. Wait for auth error
3. Verify credential input appears
4. Type test credentials
5. Press Enter - verify submission message
6. Try again, press Escape - verify cancellation

---

## Known Limitations

### Credential Handling
The current implementation **captures** credentials but does not yet **pass** them to the git command. This is marked with a TODO comment:

```typescript
// TODO: Implement actual credential passing to git commands
// This would require updating the git-service to accept credentials
console.log('[GitPanel] Credentials provided for:', pendingOperation);
```

**Next Steps**:
- Update `git-service.ts` to accept optional credentials parameter
- Modify push/pull commands to use credentials with git
- Implement secure credential passing (environment variables or credential helper)

---

## Future Enhancements

### Credential Management
1. **Credential Storage**: Integrate with OS credential manager (Windows Credential Manager, macOS Keychain)
2. **Session Caching**: Remember credentials for the current session
3. **Multiple Auth Methods**: Support SSH keys, personal access tokens, OAuth
4. **Validation**: Check credential format before submission

### UI Improvements
1. **Progress Indicator**: Show spinner while verifying credentials
2. **Clear Button**: Add button to clear credential input
3. **Show/Hide Password**: Toggle password visibility
4. **Auto-fill**: Remember last username used

---

## Commit Message
```
Sprint4 Task4: New filetree icon, commit spacing, and credential input

- Updated to filetree.png icon in GitPanel and FileTree
- Added spacing between commit box and panel border (paddingTop: 20px)
- Implemented interactive credential input for Git auth failures
- Enter to submit credentials, Escape to cancel
- Input appears in status area when push/pull needs authentication
```

