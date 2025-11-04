# Terminal Copy/Paste Context Menu — 20251104.0712

## Summary
Added right-click context menu to terminal with Copy and Paste options, enabling full clipboard integration for terminal content.

---

## Issue
User requested: "We will need cut and paste on the terminal window. add copy and paste options on a right click context menu opened when right clicking on the terminal pane"

---

## Solution

### Context Menu Implementation
Added right-click context menu to `Terminal.tsx` with:
- **Copy**: Copies selected terminal text to clipboard
- **Paste**: Pastes clipboard content to terminal input
- VS Code-style dark theme matching Nova UI
- Auto-dismiss on click outside

---

## Files Changed

### Modified: `src/renderer/components/Terminal.tsx`

#### 1. Added State for Context Menu
```typescript
const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
```

#### 2. Copy Handler
Uses xterm's built-in `getSelection()` API:
```typescript
const handleCopy = useCallback(() => {
  if (terminalRef.current) {
    const selection = terminalRef.current.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection).then(() => {
        console.log('[Terminal] Copied to clipboard:', selection.length, 'chars');
      }).catch((err) => {
        console.error('[Terminal] Failed to copy:', err);
      });
    }
  }
  setContextMenu(null);
}, []);
```

#### 3. Paste Handler
Uses Clipboard API to read and send to terminal:
```typescript
const handlePaste = useCallback(() => {
  if (terminalRef.current) {
    navigator.clipboard.readText().then((text) => {
      console.log('[Terminal] Pasting:', text.length, 'chars');
      if (onData) {
        onData(text);  // Send to PTY
      }
    }).catch((err) => {
      console.error('[Terminal] Failed to paste:', err);
    });
  }
  setContextMenu(null);
}, [onData]);
```

#### 4. Right-Click Handler
```typescript
const handleContextMenu = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY });
}, []);
```

#### 5. Auto-Dismiss on Click Outside
```typescript
useEffect(() => {
  if (contextMenu) {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }
}, [contextMenu]);
```

#### 6. Context Menu UI
Dark theme matching VS Code:
- Background: `#252526`
- Border: `#3e3e42`
- Text: `#cccccc`
- Hover: `#2a2d2e`
- Shadow: `0 2px 8px rgba(0, 0, 0, 0.3)`
- Font: `'Segoe UI', sans-serif` at `13px`

---

## How It Works

### Copy Flow
1. User selects text in terminal (drag mouse or Shift+Arrow keys)
2. User right-clicks on terminal
3. Context menu appears at cursor position
4. User clicks "Copy"
5. `terminal.getSelection()` retrieves selected text
6. `navigator.clipboard.writeText()` copies to system clipboard
7. Context menu closes

### Paste Flow
1. User right-clicks on terminal
2. Context menu appears
3. User clicks "Paste"
4. `navigator.clipboard.readText()` reads from system clipboard
5. Text sent to `onData()` callback
6. `App.tsx` forwards to `window.api.terminalWrite()`
7. PTY receives input and processes it
8. Context menu closes

### Auto-Dismiss
- Any click outside menu → closes menu
- Menu item clicked → action executes → closes menu
- Prevents orphaned menus

---

## UI Design

### Context Menu Styling
```css
position: fixed             /* Float above all content */
left: contextMenu.x         /* Position at cursor */
top: contextMenu.y
backgroundColor: #252526    /* VS Code dark background */
border: 1px solid #3e3e42   /* Subtle border */
borderRadius: 4px           /* Rounded corners */
boxShadow: 0 2px 8px rgba(0,0,0,0.3)  /* Elevation */
zIndex: 10000               /* Top layer */
minWidth: 150px             /* Consistent width */
```

### Menu Items
```css
padding: 8px 16px           /* Comfortable click area */
cursor: pointer
color: #cccccc              /* Light text */
fontSize: 13px
fontFamily: 'Segoe UI'
```

### Hover Effect
- Background changes to `#2a2d2e` on hover
- Returns to transparent on mouse leave
- Visual feedback for interactivity

---

## Testing

### Build and Run
```bash
npm run build
npm start
```

### Test Copy
1. Open terminal (`Ctrl+K` → "New Terminal")
2. Type: `ls -la`
3. Select some output text (drag mouse)
4. Right-click on selected text
5. Click "Copy"
6. **Expected:** Console logs "Copied to clipboard: N chars"
7. Open Notepad, paste (`Ctrl+V`)
8. **Expected:** Terminal text appears in Notepad ✅

### Test Paste
1. Copy some text from Notepad (`Ctrl+C`)
2. Right-click in terminal
3. Click "Paste"
4. **Expected:** Text appears in terminal and executes (if ends with newline) ✅

### Test Copy Without Selection
1. Right-click in terminal (no selection)
2. Click "Copy"
3. **Expected:** Nothing happens (no error) ✅

### Test Auto-Dismiss
1. Right-click to open menu
2. Click elsewhere in terminal (not on menu)
3. **Expected:** Menu disappears ✅

### Test Menu Position
1. Right-click in different terminal areas
2. **Expected:** Menu appears at cursor each time ✅

---

## Integration with Xterm.js

### Selection API
Xterm provides `getSelection()` method:
```typescript
terminal.getSelection(): string
```
- Returns currently selected text
- Handles multi-line selections
- Respects terminal formatting
- Empty string if no selection

### Clipboard Write
Uses modern Clipboard API:
```typescript
navigator.clipboard.writeText(text): Promise<void>
```
- Async operation
- Requires HTTPS or localhost (Electron is fine)
- Cross-platform

### Clipboard Read
```typescript
navigator.clipboard.readText(): Promise<string>
```
- Async operation
- May require user permission (browser)
- Electron automatically grants permission

---

## Console Logs

### Copy Operation
```
[Terminal] Copied to clipboard: 42 chars
```

### Paste Operation
```
[Terminal] Pasting: 15 chars
```

### Error Handling
```
[Terminal] Failed to copy: DOMException: ...
[Terminal] Failed to paste: DOMException: ...
```

---

## User Experience

### Before
- Had to manually type or use external copy/paste tools
- No native terminal clipboard integration
- Cumbersome workflow

### After
- Right-click → Copy/Paste
- Standard terminal UX
- Matches VS Code behavior
- Seamless workflow ✅

---

## Future Enhancements

### Keyboard Shortcuts (Future Sprint)
- `Ctrl+Shift+C` for copy
- `Ctrl+Shift+V` for paste
- Standard terminal shortcuts

### Additional Menu Items (Future Sprint)
- "Select All"
- "Clear Terminal"
- "Find..."
- Separator lines between groups

### Smart Paste (Future Sprint)
- Detect multi-line paste
- Confirm before pasting multiple commands
- Prevent accidental execution

---

## Related Components
- `Terminal.tsx` - Terminal component with context menu
- `App.tsx` - Wires `onData` callback for paste
- `terminal-service.ts` - PTY receives pasted input

---

## Accessibility Notes
- Context menu uses semantic HTML (`div` with event handlers)
- Focus management on menu open/close
- Keyboard shortcuts would improve accessibility (future)

---

## Git Commit Hash
`TBD` - Terminal Copy/Paste Context Menu

---

## Status
✅ Implemented - Terminal now supports copy/paste via right-click context menu

---

*Changelog created by: Claude (Sonnet 4.5)*  
*Type: Feature Addition*  
*Sprint: Sprint 4 Task 5 (Terminal) - UX Enhancement*

