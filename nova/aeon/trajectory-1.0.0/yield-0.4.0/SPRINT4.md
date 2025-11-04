# SPRINT 4 — Integration Layer
**Version Target:** `0.4.0`  
**Focus:** Monaco Enhancements · File System Browser · Git Integration · CLI Expansion  
**Status:** Planned  

---

### 🎯 Objective
Transform Nova from a standalone editor into an integrated, modular development environment.  
This sprint establishes the **integration layer** — combining Monaco, File I/O, Git visibility, and a command interface — while maintaining Nova’s clean, composable design philosophy.

---

## 🧩 Task 1 — React Framework Integration
**Description:**  
Introduce React as Nova’s renderer framework to support dynamic UI components, modular state management, and cleaner updates between editor, file tree, and status bar.

**Acceptance Criteria:**  
- [ ] Nova starts successfully and renders a React root component.  
- [ ] No runtime or TypeScript compilation errors.  
- [ ] Renderer updates dynamically when UI changes occur (HMR working).  
- [ ] Existing preload and IPC communication remain functional.  
- [ ] All future renderer work (Monaco, File Browser, Settings Panel) implemented as React components.

**Notes for Claude:**  
- Install React 18 and React DOM, along with `@types/react` and `@types/react-dom`.  
- Replace the current static renderer bootstrap with a React entry in `src/renderer/index.tsx` that mounts a top-level `App` component into the root DOM node.  
- Have `App` own the high-level layout and composition of the UI: it should render the file browser, editor view, and status bar in a consistent layout suitable for future expansion.  
- Configure Vite/Webpack (whichever Nova is using) to support `.tsx` files and enable hot module reloading for renderer changes.  
- Ensure `contextIsolation: true` remains enabled; React components should communicate with the main process exclusively via the preload IPC bridge.  
- Verify that converting to React does **not** break existing preload usage, logging, or window creation logic.  

---

## 🧩 Task 2 — Enhanced Monaco Editor Integration
**Description:**  
Expand the editor’s functionality to include syntax highlighting for additional languages, diagnostics, and core commands such as “Format Document” and “Peek Definition.”

**Acceptance Criteria:**  
- [ ] Editor auto-detects language mode by file extension.  
- [ ] Syntax highlighting verified for `.ts`, `.py`, `.json`, `.md`.  
- [ ] Format, Definition, and Peek commands work with no runtime errors.  
- [ ] Inline diagnostics appear and clear correctly.  
- [ ] `EditorService` exposes callable methods from preload without warnings.

**Notes for Claude:**  
- Extend Monaco configuration in the editor component (e.g., `EditorView.tsx`) to support additional languages beyond TypeScript, wiring language selection to file extensions.  
- Implement an `EditorService` module/class to centralize Monaco interactions: model creation, language changes, formatting, navigation commands, and diagnostics.  
- Add a small command API to `EditorService` (e.g., `formatDocument()`, `goToDefinition()`, `peekReferences()`) that can be called from React components or IPC handlers.  
- Wire diagnostics to Monaco’s marker system: when errors or lints are reported (initially via mock or simple checks), apply them to the current model and clear them when appropriate.  
- Ensure opening multiple files maps cleanly to separate Monaco models and that switching between them uses `editor.setModel` safely.  
- Confirm that invoking editor commands does not generate console warnings or unhandled promises.  

---

## 🧩 Task 3 — File System Browser
**Description:**  
Implement a live, interactive File Explorer supporting open, create, rename, and delete — all synchronized with the file system.

**Acceptance Criteria:**  
- [ ] User can navigate nested directories without lag.  
- [ ] Create, rename, delete actions update both UI and disk.  
- [ ] Selecting a file opens it in the editor.  
- [ ] File Tree and editor stay in sync after edits.  
- [ ] IPC logging confirms sandboxed file access.

**Notes for Claude:**  
- Create a `FileBrowser` UI component that renders a tree view of directories and files for the current workspace root.  
- Use the preload script as the bridge for all file system operations (read directory, create file, delete file, etc.); do **not** call Node APIs from the renderer directly.  
- Maintain an in-memory representation of the tree (e.g., nested objects keyed by path) so expansions/collapses of folders do not require re-reading the entire disk every time.  
- Add row interactions: single-click (select), double-click (open file in editor), and context menu actions for “New File,” “New Folder,” “Rename,” and “Delete.”  
- When a file is opened from the browser, emit an event or call back into the central workspace/editor controller to open or focus the corresponding tab/model.  
- Write all file operations (including failures) to a dedicated `logs/fs.log` file so we can trace behavior if something goes wrong.  

---

## 🧩 Task 4 — Git Integration
**Description:**  
Provide Git visibility, status icons, and simple commit/push/pull actions to embed version control into Nova’s UI.

**Acceptance Criteria:**  
- [ ] `.git` detected and current branch displayed.  
- [ ] File Tree icons update for modified/staged/untracked files.  
- [ ] Commit modal supports writing and submitting messages.  
- [ ] Push/pull succeed with valid credentials.  
- [ ] All operations logged with timestamps.

**Notes for Claude:**  
- Implement a `GitService` in the main process that wraps core Git commands (`git status`, `git branch`, `git diff`, `git commit`, `git push`, `git pull`) using `child_process`.  
- Expose Git status to the renderer via IPC, returning a structured object that includes branch name and file status (modified, staged, untracked).  
- Surface branch information in the `StatusBar` (e.g., `main`, `dev`, etc.) and decorate files in the `FileBrowser` with status indicators (icons or badges).  
- Implement a simple commit workflow:  
  - Open a modal from the UI that lets the user enter a commit message.  
  - On submit, call `GitService` to run the commit and report success/failure back to the renderer.  
- Add basic push/pull actions (button or menu entries) and ensure that errors (e.g., authentication failure, remote rejected) are surfaced clearly to the user.  
- Log all Git operations — command, timestamp, and result — to `logs/git.log` for later debugging.  

---

## 🧩 Task 5 — Command-Line Interface (Nova CLI)
**Description:**  
Allow launching and operating Nova directly from the terminal.

**Acceptance Criteria:**  
- [ ] `nova --version` outputs correct build.  
- [ ] `nova <file>` opens the file in Nova.  
- [ ] CLI commands write to `logs/cli.log`.  
- [ ] PATH registration verified on Windows/macOS/Linux.  
- [ ] Help text prints syntax and examples.

**Notes for Claude:**  
- Add a Node-based CLI entry script (e.g., `bin/nova.js`) and configure the `package.json` `"bin"` field so that `npm install -g` (or the packaged installer) places a `nova` executable on the user’s PATH.  
- Use a simple argument parser (like `commander` or `yargs`) to support:  
  - `nova .` to open a directory as a workspace.  
  - `nova <file>` to open a specific file directly.  
  - `nova --version` to print the current app version.  
  - `nova --help` to show usage.  
- For file/directory parameters, have the CLI either:  
  - launch Nova if it is not already running, or  
  - send a message to a running instance to open the given path.  
- Log each CLI invocation (arguments, timestamp, result) to `logs/cli.log`.  

---

## 🧩 Task 6 — Integrated Terminal (Optional)
**Description:**  
Prototype a terminal panel for quick command-line operations inside Nova.

**Acceptance Criteria:**  
- [ ] Terminal opens and responds to input.  
- [ ] Theme colors match current Nova theme.  
- [ ] Commands like `ls`, `git status` run normally.  
- [ ] No measurable performance drop.  
- [ ] Closing terminal releases all IPC handles.

**Notes for Claude:**  
- Use `xterm.js` in the renderer to create a terminal component that can be shown/hidden via a toggle control.  
- In the main process, use a pseudo-terminal library (e.g., `node-pty`) to spawn the user’s default shell and connect its input/output streams to the renderer via IPC.  
- Ensure that the terminal font, background, and foreground colors derive from Nova’s current theme so the experience feels cohesive.  
- Handle window resize events so the terminal adjusts its rows/columns when the Nova window is resized.  
- When the terminal panel is closed, tear down the pty session and any associated IPC listeners to avoid leaks.  

---

## 🧩 Task 7 — Workspace Management
**Description:**  
Implement persistence of workspace state, including open files, layout, and recent projects.

**Acceptance Criteria:**  
- [ ] Nova reopens with same layout and files.  
- [ ] “Recent Workspaces” lists five most recent entries.  
- [ ] Switching workspace updates title and logs event.  
- [ ] No data loss between sessions.

**Notes for Claude:**  
- Add a `WorkspaceManager` module in the main process that is responsible for loading and saving workspace metadata.  
- Define a small JSON schema that includes:  
  - workspace root path,  
  - list of open file paths,  
  - which file is active,  
  - layout information (e.g., sidebar visibility, terminal visibility),  
  - current branch (if available).  
- Store workspace state under a Nova-specific config directory (for example, `~/.nova/workspaces/`), using one JSON file per workspace.  
- On startup, load the last active workspace (if configured) and send the data to the renderer so it can restore tabs and layout.  
- Implement a simple “Recent Workspaces” list in the UI that lets the user quickly switch between known workspace roots.  
- Log workspace switch events and any failures (e.g., missing directories) to a dedicated section in the logs.  

---

## 🧩 Task 8 — Performance & Stability Pass
**Description:**  
Profile all integration systems and ensure smooth cross-platform performance.

**Acceptance Criteria:**  
Just do your best with this but don't spend too much time on it.


---

## 🧩 Task 9 — Documentation & Sprint Review
**Description:**  
Finalize all sprint deliverables and ensure documentation reflects the new architecture.

**Acceptance Criteria:**  
- [ ] `docs/NOVA_INTEGRATION.md` describes workspace, Git, and CLI systems clearly.  
- [ ] `README` updated to `0.4.0`.  
- [ ] All markdown passes lint.  

**Notes for Claude:**  

---

## ✅ Result
By the end of Sprint 4, Nova operates as a unified environment —  
combining editing, file system access, Git integration, and CLI functionality under a modular architecture.  
This establishes the groundwork for future agent-assisted editing and intelligent code orchestration.

---

### Review Checklist
- [ ] All acceptance criteria met per task  
- [ ] Code compiles and runs error-free  
- [ ] Tested on Sonnet (Windows), Vega (Linux), and Melody (macOS)  
- [ ] Documentation updated and merged  
- [ ] Sprint 4 tagged in repository  

---

*End of Sprint 4 — Integration Layer.*

