# Nova Editor System

**Document Version:** 1.0  
**Nova Version:** 0.3.0  
**Last Updated:** 2025-11-04

## Overview

Nova's editor system is built on the Monaco Editor, the same powerful editor that powers Visual Studio Code. This document details the architecture, features, and integration of Monaco within Nova's design philosophy.

---

## Architecture

### Component Structure

```
src/
├── renderer/
│   ├── editor/
│   │   ├── index.ts              # Editor module exports
│   │   └── monaco-editor.ts      # Monaco Editor wrapper
│   ├── components/
│   │   ├── tab-bar.ts            # Multi-document tab management
│   │   └── recovery-dialog.ts    # Auto-save recovery UI
│   └── services/
│       └── auto-save.ts          # Auto-save service
└── main/
    └── recovery.ts               # Recovery file management (main process)
```

### Monaco Editor Wrapper (`monaco-editor.ts`)

**Purpose:** Wraps Monaco Editor with Nova-specific configuration and theme integration.

**Key Features:**
- Theme synchronization (Nova Dark/Light → Monaco)
- File loading and language detection
- Dirty state tracking
- Change listeners for auto-save
- Custom editor options (disabled minimap, etc.)

**Public API:**
```typescript
class MonacoEditorView {
  // Initialization
  constructor(container: HTMLElement, options?: EditorOptions)
  
  // Content Management
  getValue(): string
  setValue(value: string): void
  loadFile(filePath: string, content: string): void
  
  // File State
  isDirty(): boolean
  markAsSaved(): void
  getFilePath(): string | null
  
  // Theme & Settings
  setTheme(theme: 'light' | 'dark'): void
  applyNovaTheme(theme: Theme): void
  updateOptions(options: Partial<EditorOptions>): void
  
  // Language
  setLanguage(language: string): void
  
  // Event Listeners
  onDirtyChange(callback: (isDirty: boolean) => void): void
}
```

---

## Features

### 1. Monaco Editor Integration

**What:** Full-featured code editor embedded in Nova.

**Features:**
- Syntax highlighting for 30+ languages
- IntelliSense for JS/TS
- Multi-cursor editing (Alt+Click)
- Find/Replace with regex (Ctrl+F / Ctrl+H)
- Code folding, bracket matching
- Auto-indentation

**Implementation:** AMD loader for Monaco modules, no bundler required.

### 2. Language Awareness

**Automatic Language Detection:**

Nova detects the programming language based on file extension and applies appropriate syntax highlighting:

**Supported Languages:**
- **JavaScript/TypeScript:** `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`
- **Web:** `.html`, `.htm`, `.css`, `.scss`, `.sass`, `.less`, `.xml`
- **Markup:** `.md`, `.markdown`, `.yaml`, `.yml`, `.json`
- **Systems:** `.c`, `.h`, `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hxx`, `.go`, `.rs`, `.swift`, `.cs`
- **Scripting:** `.py`, `.pyw`, `.rb`, `.sh`, `.bash`, `.zsh`, `.php`
- **JVM:** `.java`, `.kt`, `.kts`, `.scala`
- **Other:** `.sql`, `.r`, `.dart`

**IntelliSense:**
- Enabled for JavaScript and TypeScript
- Auto-completion, parameter hints, hover documentation
- Type checking for TypeScript files

### 3. Tabbed Document System

**Purpose:** Allow multiple files to be open simultaneously.

**Features:**
- Visual tabs with file names
- Active tab highlighting
- Close buttons on tabs
- Dirty state indicator (`*` for unsaved changes)
- Tab switching with click
- Seamless content switching

**Implementation:**
- `TabBar` component manages tab state
- Syncs with `MonacoEditorView` for content
- Tracks dirty state per tab
- Confirms before closing unsaved tabs

**User Experience:**
```
[file1.js *] [file2.ts] [README.md *] [+]
     ↑          ↑             ↑         ↑
  unsaved    clean      unsaved    (future: new file)
```

### 4. Theme Synchronization

**Purpose:** Unify Nova's UI themes with Monaco's syntax colors.

**Nova Dark Theme:**
```typescript
{
  base: 'vs-dark',
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#ffffff',
    'editor.lineHighlightBackground': '#2d2d30',
    'editor.selectionBackground': '#264f78',
    // ... more colors
  },
  rules: [
    { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
    { token: 'string', foreground: 'ce9178' },
    { token: 'number', foreground: 'b5cea8' },
    { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
    { token: 'function', foreground: 'dcdcaa' },
    // ... more syntax rules
  ]
}
```

**Nova Light Theme:**
- Based on `vs` (Visual Studio Light)
- Optimized for daytime coding
- High contrast for readability

**Dynamic Switching:**
- Settings Panel theme change applies instantly
- Monaco theme updates without reload
- All open tabs reflect new theme

### 5. Editor Settings

**Configurable via Settings Panel:**

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `fontSize` | number | 14 | Font size (10-24px) |
| `wordWrap` | boolean | true | Word wrap on/off |
| `autoSave` | boolean | true | Auto-save enable/disable |
| `tabSize` | number | 2 | Tab/indent size (2-8 spaces) |

**Fixed Settings (for Nova's philosophy):**
- **Minimap:** Disabled (reduces clutter)
- **Line Numbers:** Enabled (always on)
- **Bracket Pair Colorization:** Enabled
- **Scroll Beyond Last Line:** Disabled
- **Automatic Layout:** Enabled

**Persistence:**
- All settings saved to `userData/settings.json`
- Loaded on startup
- Apply to all open files immediately

### 6. Auto-Save & Recovery

**Auto-Save Service (`src/renderer/services/auto-save.ts`)**

**Purpose:** Automatically backup unsaved work to prevent data loss.

**How It Works:**
1. Every 30 seconds (configurable), service checks for dirty tabs
2. Dirty tabs (with unsaved changes) are backed up
3. Recovery files stored in `userData/recovery/`
4. Each file gets unique ID and metadata
5. Status bar shows "Auto-saved" notification

**Recovery File Format:**
```
userData/recovery/
├── 1699123456789-abc123.recovery     # Content file
├── 1699123456789-abc123.meta.json   # Metadata
├── 1699123457890-def456.recovery
└── 1699123457890-def456.meta.json
```

**Metadata:**
```json
{
  "id": "1699123456789-abc123",
  "originalPath": "C:/Work/project/app.js",
  "timestamp": 1699123456789,
  "recoveryPath": "C:/Users/User/AppData/Roaming/Nova/recovery/1699123456789-abc123.recovery"
}
```

**Recovery Dialog (`src/renderer/components/recovery-dialog.ts`)**

**Purpose:** UI for restoring unsaved work on startup.

**Appears When:**
- Nova starts and recovery files exist
- Previous session ended unexpectedly
- Files have unsaved changes from last session

**User Options:**
1. **Restore** - Opens file as new tab (marked dirty)
2. **Discard** - Deletes recovery file for that file
3. **Discard All** - Clears all recovery files

**Cleanup:**
- Automatic deletion after restore
- 7-day retention for stale files
- Runs cleanup on app startup

### 7. Find & Replace

**Built-in Monaco Feature:**

**Find (Ctrl+F):**
- Search widget appears at top of editor
- Highlights all matches
- Shows match count (e.g., "1 of 5")
- Navigate with Enter/Shift+Enter
- Close with Esc

**Replace (Ctrl+H):**
- Find and replace input fields
- Replace single match or all matches
- Preview before replacing
- Undo support (Ctrl+Z)

**Options:**
- **Match Case** (Alt+C): Case-sensitive search
- **Match Whole Word** (Alt+W): Complete words only
- **Use Regular Expression** (Alt+R): Regex patterns
- **Find in Selection**: Search within selected text

**Regex Support:**
- Full regex patterns: `.`, `*`, `+`, `?`, `[abc]`, `(group)`, `\d`, `\w`, `\s`, `^`, `$`
- Capture groups in replace: `$1`, `$2`, etc.
- Example: Find `function (\w+)\(` → Replace `const $1 = (`

---

## File Operations

### Open File

**Workflow:**
1. User triggers "Open File" action (Ctrl+K → Open File)
2. System dialog opens for file selection
3. File content loaded via IPC (`window.api.readFile`)
4. Language detected from file extension
5. New tab created with file name and content
6. Monaco loads content with syntax highlighting

**Code:**
```typescript
const fileData = await window.api.readFile(filePath);
const language = detectLanguage(fileName);
const tab: Tab = {
  id: filePath,
  filePath: filePath,
  fileName: fileName,
  isDirty: false,
  content: fileData.content,
  language: language,
};
tabBar.addTab(tab);
```

### Save File

**Workflow:**
1. User triggers "Save File" action
2. Current tab content retrieved from Monaco
3. Content saved via IPC (`window.api.saveFile`)
4. Dirty state cleared
5. Status bar shows "Saved: filename"
6. Tab `*` indicator removed

**Auto-Save:**
- Runs automatically every 30 seconds
- Saves to recovery files (not actual file)
- Non-blocking, async operation
- Status bar shows "Auto-saved" notification

### Save File As

**Workflow:**
1. User triggers "Save File As..." action
2. System dialog opens for save location
3. Content saved to new location
4. Old tab removed (if applicable)
5. New tab created with new file path
6. Status bar shows "Saved as: filename"

### Dirty State Tracking

**Purpose:** Indicate when files have unsaved changes.

**How It Works:**
1. Monaco editor fires `onDidChangeModelContent` event
2. Wrapper compares current content to `savedContent`
3. If different, sets `isDirtyFlag = true`
4. Callback fires: `onDirtyChange(true)`
5. Tab bar adds `*` to tab name
6. Status bar updates: "Editing: file.js *"

**Clearing Dirty State:**
- After successful save
- After "Save As" to new file
- Manually via `markAsSaved()`

---

## Performance

### Startup Performance

**Metrics (from Sprint 3 Task 9):**
- Monaco Load Time: 50-500ms (varies by system)
- Total Startup: 200-1000ms (including all initialization)
- Editor Creation: < 50ms

**Tracking:**
```javascript
const monacoStartTime = performance.now();
const monacoLoaded = await waitForMonaco();
const monacoLoadTime = performance.now() - monacoStartTime;
console.log(`[Performance] Monaco load time: ${monacoLoadTime.toFixed(2)}ms`);
```

### Runtime Performance

**Optimizations:**
- **Automatic Layout:** Monaco handles resize automatically
- **Async Operations:** File I/O is non-blocking
- **Smart Dirty Checking:** Only compares content on change events
- **Lazy Loading:** Monaco loads language modules on-demand

**Typical Workloads:**
- File Open: < 100ms (small-medium files)
- Tab Switch: < 50ms
- Theme Change: < 100ms
- Auto-Save: < 50ms (async, non-blocking)
- Find/Replace: Instant for typical files

---

## Keyboard Shortcuts

### Editor-Specific

|| Shortcut | Action |
||----------|--------|
|| `Ctrl/Cmd + F` | Find |
|| `Ctrl/Cmd + H` | Find and Replace |
|| `F3` | Find Next |
|| `Shift + F3` | Find Previous |
|| `Ctrl/Cmd + D` | Add Selection to Next Find Match |
|| `Alt + Click` | Add Cursor (multi-cursor) |
|| `Ctrl/Cmd + Z` | Undo |
|| `Ctrl/Cmd + Shift + Z` | Redo |
|| `Ctrl/Cmd + /` | Toggle Line Comment |
|| `Ctrl/Cmd + [` | Outdent Line |
|| `Ctrl/Cmd + ]` | Indent Line |
|| `Home` | Go to Line Start |
|| `End` | Go to Line End |
|| `Ctrl/Cmd + Home` | Go to File Start |
|| `Ctrl/Cmd + End` | Go to File End |

### Nova Actions (via Action HUD)

|| Shortcut | Action |
||----------|--------|
|| `Ctrl/Cmd + K` or `Ctrl/Cmd + Space` | Open Action HUD |
|| Select "Open File" | Open file for editing |
|| Select "Save File" | Save current file |
|| Select "Save File As..." | Save with new name |

---

## Configuration

### Default Editor Options

```typescript
{
  theme: 'nova-dark',          // or 'nova-light'
  fontSize: 14,                // 10-24px
  wordWrap: 'on',              // or 'off'
  lineNumbers: 'on',           // always on
  minimap: { enabled: false }, // always disabled
  automaticLayout: true,
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  guides: {
    bracketPairs: true,
    indentation: true,
  },
}
```

### Theme Customization

**Nova Dark Theme Colors:**
```typescript
const novaDarkColors = {
  keyword: '569cd6',      // blue
  string: 'ce9178',       // orange
  number: 'b5cea8',       // light green
  comment: '6a9955',      // green (italic)
  function: 'dcdcaa',     // yellow
  variable: '9cdcfe',     // light blue
  type: '4ec9b0',         // teal
  operator: 'd4d4d4',     // white
};
```

**To modify themes, edit:**
- `src/renderer/editor/monaco-editor.ts` → `defineNovaThemes()`
- `src/renderer/theme.ts` → Theme definitions

---

## Integration Points

### With Action HUD

**Actions:**
- Open File
- Save File
- Save File As...

**Registration:**
```typescript
const actionContext: ActionContext = {
  onOpenFile: async () => { /* ... */ },
  onSaveFile: async () => { /* ... */ },
  onSaveFileAs: async () => { /* ... */ },
};
const actions = createDefaultActions(actionContext);
```

### With Settings Panel

**Settings:**
- Theme (applies to Monaco)
- Font Size (updates Monaco)
- Word Wrap (updates Monaco)
- Auto-Save (controls service)

**Change Handler:**
```typescript
settingsPanel.onChange(async (id, value) => {
  switch (id) {
    case 'theme':
      editorInstance.applyNovaTheme(currentTheme);
      break;
    case 'fontSize':
      editorInstance.updateOptions({ fontSize: Number(value) });
      break;
    case 'wordWrap':
      editorInstance.updateOptions({ wordWrap: value ? 'on' : 'off' });
      break;
    case 'autoSave':
      autoSaveService.updateOptions({ enabled: Boolean(value) });
      break;
  }
});
```

### With Status Bar

**Updates:**
- File name when switching tabs
- Dirty state indicator (`*`)
- "Auto-saved" notifications
- "Saved: filename" confirmations

### With Tab Bar

**Syncing:**
- Content updates on tab switch
- Dirty state per tab
- Close confirmation for unsaved tabs
- Active tab highlighting

---

## Testing

### Test Coverage

**Monaco Editor Tests:** 11 tests
- Initialization
- Content management
- Theme switching
- Language detection
- Options updates

**Tab Bar Tests:** 11 tests
- Tab management (add, remove, switch)
- Dirty state tracking
- Event callbacks

**Auto-Save Tests:** 25 tests
- Service lifecycle
- Periodic saving
- Manual triggers
- Error handling

**Recovery Dialog Tests:** 11 tests
- Display logic
- Restore/discard actions
- API integration

**Total:** 58 tests for editor system (all passing)

### Manual Testing Checklist

**Basic Editing:**
- [ ] Open file with syntax highlighting
- [ ] Type and edit content
- [ ] Multi-cursor editing (Alt+Click)
- [ ] Undo/Redo works correctly
- [ ] Find/Replace works
- [ ] Code folding works

**Multi-File:**
- [ ] Open multiple files
- [ ] Switch between tabs
- [ ] Close tabs
- [ ] Dirty state shows `*`
- [ ] Close confirmation for unsaved tabs

**Saving:**
- [ ] Save file removes `*`
- [ ] Save As creates new file
- [ ] Auto-save runs every 30 seconds
- [ ] Status bar shows save confirmation

**Recovery:**
- [ ] Crash with unsaved work
- [ ] Recovery dialog appears on restart
- [ ] Restore opens file as tab
- [ ] Discard removes recovery file

**Themes:**
- [ ] Switch theme applies to Monaco
- [ ] Syntax colors match Nova theme
- [ ] All UI elements update

---

## Future Enhancements

**Potential Features for Sprint 4+:**
- Bracket pair guides (configurable colors)
- Custom key bindings
- Snippets and code templates
- Diff editor for file comparison
- Multi-root workspace support
- Terminal integration within editor
- Git diff indicators in gutter
- Breadcrumb navigation
- Outline/symbol view

---

## Troubleshooting

### Monaco Not Loading

**Symptoms:** Editor area blank, console errors about Monaco/vs/

**Solutions:**
1. Check `monaco-loader.js` and `monaco-init.js` are copied to `dist/renderer/`
2. Verify `vs/` folder exists in `dist/renderer/`
3. Run `npm run copy:monaco` manually
4. Check CSP headers in `main.ts` allow `blob:` and `data:`

### Syntax Highlighting Not Working

**Symptoms:** File opens but no colors, all text white

**Solutions:**
1. Check language detection: `console.log` should show detected language
2. Verify file extension is in `detectLanguage()` map
3. Ensure Monaco theme is loaded: check `defineNovaThemes()` called
4. Try manually setting language: `editorInstance.setLanguage('javascript')`

### Auto-Save Not Working

**Symptoms:** No "Auto-saved" messages, recovery files not created

**Solutions:**
1. Check Settings Panel: Auto-Save toggle should be ON
2. Verify dirty state: tab should show `*` for unsaved changes
3. Check console for `[AutoSave]` log messages
4. Verify `userData/recovery/` directory exists and is writable

### Performance Issues

**Symptoms:** Slow typing, laggy scrolling, high CPU

**Solutions:**
1. Check file size: very large files (> 10MB) may be slow
2. Disable word wrap for large files
3. Close unused tabs to free memory
4. Check for infinite loops in change listeners
5. Monitor `[Performance]` logs in console

---

## References

- **Monaco Editor:** https://microsoft.github.io/monaco-editor/
- **Monaco API:** https://microsoft.github.io/monaco-editor/api/index.html
- **VS Code Themes:** https://code.visualstudio.com/api/references/theme-color

---

**Nova Editor** - Powerful editing, elegant simplicity.

MiraNova Studios © 2025

