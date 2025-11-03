# SPRINT 4 — Nova Integration Layer  
**Version Target:** `0.4.0`  
**Focus:** Monaco Enhancements · File System Browser · Git Integration · CLI Expansion  
**Status:** Planned  

---

Sprint 4 expands Nova beyond a standalone editor into a fully integrated development environment.  
This sprint focuses on deep integration — file management, version control, and command execution — while maintaining Nova’s signature simplicity and clarity.

---

## Task 0 — React Framework Integration
**Objective:**  
Introduce React as Nova’s renderer framework to support dynamic UI components and modular architecture.

**Tasks:**  
1. Install React 18 and React DOM:  
   ```bash
   npm install react react-dom
   npm install --save-dev @types/react @types/react-dom
   ```
Replace the static HTML renderer with a React root in src/renderer/index.tsx.

Establish the base component structure:

<App /> → Root container (manages layout, theme, context)

<EditorView /> → Monaco wrapper

<FileBrowser /> → Interactive file tree

<StatusBar /> → App state and Git status

Configure Webpack/Vite for JSX and TypeScript (TSX) support.

Verify HMR (hot module reloading) and renderer rebuilds without restart.

### Acceptance Criteria:

 Nova starts successfully and renders a React root component.

 No runtime or TypeScript compilation errors.

 Renderer updates dynamically when UI changes occur.

 Existing preload and IPC communication remain functional.

 All future renderer work (Monaco, File Browser, Settings Panel) implemented as React components.

### 🧱 **Why Add It Now**
- **Monaco and File Tree require reactive state.** Without React, managing component-level updates will quickly get messy.  
- **The Action HUD and Settings Panel** can reuse modular React components for consistency.  
- **Testing and Theming become simpler** — React allows unified context providers for theme and settings.  
- It aligns with the long-term vision: Nova = Electron + React + TypeScript.

---


## Task 1 — Enhanced Monaco Editor Integration  
**Objective:**  
Extend Nova’s editor core with advanced capabilities and plugin hooks.

**Tasks:**  
1. Add syntax highlighting for additional languages (Python, JSON, Markdown).  
2. Implement inline error markers and diagnostics via TypeScript APIs.  
3. Enable editor commands — “Format Document”, “Go to Definition”, “Peek References”.  
4. Expose a unified `EditorService` coordinating all Monaco interactions.  

**Acceptance Criteria:**  
- [ ] Editor loads and switches language modes automatically by file extension.  
- [ ] Syntax highlighting appears correct for .ts, .py, .json, .md files.  
- [ ] Format / Definition / Peek commands execute without runtime errors.  
- [ ] Error markers appear inline and clear correctly on fix.  
- [ ] `EditorService` exposes callable methods from preload and logs no warnings.

---

## Task 2 — File System Browser  
**Objective:**  
Introduce a full-featured file explorer with read/write and create/delete capabilities.

**Tasks:**  
1. Expand the existing File Tree mock into an interactive browser.  
2. Add context menu actions: New File, New Folder, Rename, Delete.  
3. Reflect all changes instantly in the UI and file system via IPC.  
4. Maintain focus synchronization between File Tree ↔ open editors.  

**Acceptance Criteria:**  
- [ ] User can navigate nested directories without lag or crash.  
- [ ] Create, rename, and delete actions update the actual file system.  
- [ ] File Tree selection opens the correct file in the editor.  
- [ ] File Tree and editor remain visually synchronized after edits.  
- [ ] IPC logging confirms safe, sandboxed file access.

---

## Task 3 — Git Integration  
**Objective:**  
Provide built-in version control visibility and actions.

**Tasks:**  
1. Detect Git repositories in the active workspace.  
2. Display branch name and file change indicators in the Status Bar.  
3. Implement stage, commit, and push actions using Node `child_process`.  
4. Add a commit-message modal with diff preview.  
5. Log all Git operations to Nova’s internal log.  

**Acceptance Criteria:**  
- [ ] Nova detects `.git` directory and displays current branch.  
- [ ] Modified / staged / untracked icons appear correctly in File Tree.  
- [ ] Commit modal supports writing and submitting commit messages.  
- [ ] Push / pull complete successfully when credentials are valid.  
- [ ] Logs record each Git operation with timestamp and status.

---

## Task 4 — Command Line Interface (Nova CLI)  
**Objective:**  
Enable Nova to launch, open files, and perform operations directly from the command line.

**Tasks:**  
1. Add a `nova` executable with flags:  
   - `nova .` → open current directory  
   - `nova <file>` → open specific file  
2. Support `--log`, `--version`, and `--help`.  
3. Register Nova to PATH on Windows/macOS/Linux.  

**Acceptance Criteria:**  
- [ ] `nova --version` outputs correct build number.  
- [ ] Running `nova <file>` opens the specified file in Nova.  
- [ ] CLI commands log correctly to logs/cli.log.  
- [ ] PATH registration verified on all platforms.  
- [ ] Help text displays syntax examples.

---

## Task 5 — Integrated Terminal (Optional)  
**Objective:**  
Prototype a built-in terminal for quick shell access.

**Tasks:**  
1. Embed xterm.js in a bottom panel.  
2. Connect to user’s default shell.  
3. Synchronize terminal colors with Nova theme.  

**Acceptance Criteria:**  
- [ ] Terminal opens and responds to input.  
- [ ] Color scheme matches current theme.  
- [ ] Basic commands (`ls`, `dir`, `git status`) run normally.  
- [ ] No performance drop while terminal active.  
- [ ] Closing terminal frees resources and IPC channels.

---

## Task 6 — Workspace Management  
**Objective:**  
Allow saving and restoring of project workspaces.

**Tasks:**  
1. Store last-opened files, layout state, and Git branch.  
2. Add “Recent Workspaces” to the Action HUD.  
3. Restore session on startup.  

**Acceptance Criteria:**  
- [ ] Nova reopens with same files and layout as previous session.  
- [ ] “Recent Workspaces” lists at least five entries.  
- [ ] Switching workspace updates window title and logs event.  
- [ ] No data loss between sessions.

---

## Task 7 — Performance and Stability Pass  
**Objective:**  
Optimize and validate the new integration systems.

**Tasks:**  
1. Profile startup time and resource usage.  
2. Resolve IPC or file-watcher leaks.  
3. Confirm cross-platform reliability.  

**Acceptance Criteria:**  
- [ ] Startup time < 3 seconds on reference machine.  
- [ ] CPU usage idle < 5 %.  
- [ ] Memory footprint < 350 MB steady-state.  
- [ ] No unhandled exceptions in log after 30 minutes runtime.  
- [ ] Passes build and runtime tests on Windows, macOS, Linux.

---

## Task 8 — Documentation and Sprint Review  
**Objective:**  
Update documentation to reflect the new systems and integration philosophy.

**Tasks:**  
1. Add `INTEGRATION.md` detailing editor, Git, and CLI architecture.  
2. Update `README` and `CHANGELOG` to version 0.3.0.  
3. Record lessons learned and Sprint 5 planning notes.  

**Acceptance Criteria:**  
- [ ] `INTEGRATION.md` exists and accurately describes new systems.  
- [ ] README and CHANGELOG show version 0.3.0 and new features.  
- [ ] All markdown passes lint and renders correctly.  
- [ ] Sprint 4 marked complete in `docs/TRAJECTORY_LOG.md`.

---

## Sprint 4 Summary  
Sprint 4 transforms Nova into a complete, extensible development environment —  
a seamless fusion of editor, file system, and version control, unified by design and simplicity.  

---

*End of Sprint 4 (Integration Layer).*  
