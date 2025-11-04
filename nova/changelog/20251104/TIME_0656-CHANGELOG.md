# Terminal Debug Logging and Resize Fix — 20251104.0656

## Summary
Added comprehensive debug logging to diagnose terminal black screen issue and fixed terminal resize notification timing to ensure PTY receives correct dimensions after xterm.js fitting.

---

## Issue
Terminal tab shows black screen with no prompt after Sprint 4 Task 5 implementation. Need to diagnose whether:
1. Terminal data is being sent from main process
2. Renderer is receiving the data
3. Terminal API is being registered correctly
4. xterm.js is writing the data

---

## Files Changed

### Modified: `src/renderer/components/Terminal.tsx`
**Changes:**
1. **Improved resize notification timing**
   - Moved `onResize` callback to happen AFTER terminal fitting
   - Increased timeout from 0ms to 100ms to ensure container is rendered
   - Now correctly sends actual terminal dimensions to main process

2. **Added debug logging**
   - Log when terminal API is registered
   - Log when write() is called with data length
   - Log available terminal APIs
   - Log when API is unregistered

**Before:**
```typescript
setTimeout(() => {
  fitAddon.fit();
  console.log('[Terminal] Terminal fitted:', terminal.cols, 'x', terminal.rows);
}, 0);
```

**After:**
```typescript
setTimeout(() => {
  fitAddon.fit();
  const cols = terminal.cols;
  const rows = terminal.rows;
  console.log('[Terminal] Terminal fitted:', cols, 'x', rows);
  
  // Notify parent about the actual terminal size
  if (onResize && cols && rows) {
    onResize(cols, rows);
  }
}, 100); // Give it a bit more time to render
```

### Modified: `src/renderer/components/App.tsx`
**Changes:**
1. **Added comprehensive debug logging for terminal data flow**
   - Log when terminal data is received from main process
   - Log terminal ID and data length
   - Log when writing data to terminal API
   - Warn when terminal API is not found
   - Show available terminal APIs when lookup fails

**Before:**
```typescript
window.api.terminalOnData((terminalId: string, data: string) => {
  const terminalAPI = (window as any).__terminalAPI?.[terminalId];
  if (terminalAPI && terminalAPI.write) {
    terminalAPI.write(data);
  }
});
```

**After:**
```typescript
window.api.terminalOnData((terminalId: string, data: string) => {
  console.log('[App] Received terminal data for:', terminalId, 'length:', data.length);
  const terminalAPI = (window as any).__terminalAPI?.[terminalId];
  if (terminalAPI && terminalAPI.write) {
    console.log('[App] Writing data to terminal:', terminalId);
    terminalAPI.write(data);
  } else {
    console.warn('[App] No terminal API found for:', terminalId, 'Available:', Object.keys((window as any).__terminalAPI || {}));
  }
});
```

---

## Debug Logging Points

### Terminal Component
- `[Terminal] Registering terminal API for: {terminalId}` - When API is exposed to window
- `[Terminal] write() called for: {terminalId} data length: {length}` - When data is written
- `[Terminal] Terminal API registered. Available APIs: [...]` - Shows all registered terminals
- `[Terminal] Terminal fitted: {cols} x {rows}` - Shows terminal dimensions after fitting
- `[Terminal] Unregistering terminal API for: {terminalId}` - On cleanup

### App Component  
- `[App] Setting up terminal data listener` - On mount
- `[App] Received terminal data for: {terminalId} length: {length}` - When IPC data arrives
- `[App] Writing data to terminal: {terminalId}` - When forwarding to xterm
- `[App] No terminal API found for: {terminalId}` - When lookup fails (shows available APIs)

---

## Diagnostic Flow

With these logs, we can now trace the complete data flow:

1. **PTY Output** (main process)
   ```
   [Main] Terminal terminal-1 created with PTY successfully
   ```

2. **IPC Send** (main → renderer)
   ```
   mainWindowRef.webContents.send('terminal-data', terminalId, data);
   ```

3. **IPC Receive** (renderer)
   ```
   [App] Received terminal data for: terminal-1 length: 123
   ```

4. **API Lookup** (renderer)
   ```
   [App] Writing data to terminal: terminal-1
   ```
   OR
   ```
   [App] No terminal API found for: terminal-1 Available: []
   ```

5. **Terminal Write** (xterm.js)
   ```
   [Terminal] write() called for: terminal-1 data length: 123
   ```

---

## Expected Console Output

**On Successful Terminal Creation:**
```
[App] Setting up terminal data listener
[Terminal] Initializing xterm for: terminal-1
[Terminal] Terminal opened successfully
[Terminal] Terminal fitted: 100 x 30
[Terminal] Registering terminal API for: terminal-1
[Terminal] Terminal API registered. Available APIs: ['terminal-1']
[Main] Terminal terminal-1 created with PTY successfully
[App] Received terminal data for: terminal-1 length: 15
[App] Writing data to terminal: terminal-1
[Terminal] write() called for: terminal-1 data length: 15
```

**On Timing Issue (API not registered yet):**
```
[App] Received terminal data for: terminal-1 length: 15
[App] No terminal API found for: terminal-1 Available: []
```

---

## Potential Issues Being Diagnosed

### 1. Timing Issue
If terminal data arrives before `__terminalAPI` is registered:
- Solution: Add retry logic or queue data until ready

### 2. ID Mismatch  
If terminal session ID doesn't match tab ID:
- Solution: Verify ID consistency in `onNewTerminal` action

### 3. Terminal Not Rendering
If Terminal component never mounts:
- Solution: Check display logic in App.tsx

### 4. PTY Not Sending Data
If no "Received terminal data" logs:
- Solution: Check main process PTY initialization

---

## Testing Instructions

1. **Build and Run:**
   ```bash
   npm run build
   npm start
   ```

2. **Open Developer Console:**
   - Press `Ctrl+Shift+I`

3. **Create New Terminal:**
   - Press `Ctrl+K` → "New Terminal"

4. **Check Console Logs:**
   - Look for the debug messages listed above
   - Identify which step in the flow is failing

5. **Report Findings:**
   - Copy console output
   - Identify missing logs
   - This will pinpoint the exact issue

---

## Fix Implementation

### Terminal Resize Notification
**Problem:** PTY is created with 80x24, but terminal component fits to actual container size. The main process never receives the updated dimensions, so shell output may be formatted incorrectly.

**Solution:** After `fitAddon.fit()`, explicitly call `onResize(cols, rows)` to inform the main process of the actual terminal size. This ensures the PTY is resized to match the xterm.js display.

---

## Related Files
- `src/main/services/terminal-service.ts` - PTY service (no changes)
- `src/main/main.ts` - IPC handlers (no changes)
- `src/preload/preload.ts` - IPC bridge (no changes)

---

## Next Steps

After collecting console logs:
1. **If API registration logs are missing** → Terminal component not mounting
2. **If data reception logs are missing** → IPC communication broken
3. **If write logs are missing** → API lookup failing (timing issue)
4. **If all logs present but no display** → xterm.js issue

---

## Git Commit Hash
`TBD` - Terminal Debug Logging and Resize Fix

---

## Status
⏳ Pending Testing - Awaiting console log analysis to diagnose black screen issue

---

*Changelog created by: Claude (Sonnet 4.5)*  
*Type: Bug Fix / Debugging*  
*Sprint: Sprint 4 Task 5 (Terminal) - Follow-up*

