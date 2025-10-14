# SPRINT 2 — Nova Interaction Layer

Sprint 2 focuses on bringing interactivity, structure, and basic extensibility to Nova.  
The goals are to move beyond foundation work and introduce user-facing elements that make Nova feel alive: basic commands, a lightweight file viewer, improved UI shell, and initial testing infrastructure.

---

## Task 1 — Command Palette Skeleton
**Objective:**  
Add a minimal in-app command palette accessible by keyboard shortcut (Ctrl/Cmd + K).

**Tasks:**  
1. Implement a basic modal overlay that opens and closes with the shortcut.  
2. Populate it with three placeholder commands:  
   - “About Nova” (shows version)  
   - “Toggle Theme” (switches light/dark placeholder styles)  
   - “Open Folder” (invokes a dummy IPC call)  
3. Use plain HTML/CSS/TypeScript — no external libraries.  
**Result:**  
A simple, working palette interface proving Nova’s command architecture.

---

## Task 2 — File Tree Mock
**Objective:**  
Display a lightweight, read-only file tree for a chosen directory.

**Tasks:**  
1. Add a left-hand panel listing files and folders from a selected path.  
2. Use IPC to request folder contents from the main process.  
3. Support expanding/collapsing folders and basic scroll.  
4. No editing or file preview yet — just structure.  
**Result:**  
A working visual mock of a file browser inside Nova.

---

## Task 3 — Settings Panel (UI)
**Objective:**  
Expose Nova’s existing settings via a small interface.

**Tasks:**  
1. Add a simple settings dialog accessible from the command palette.  
2. Show current values (e.g., window size, theme).  
3. Allow modifying a setting (such as theme or a “developer mode” toggle).  
4. Persist changes using the existing settings manager.  
**Result:**  
Visible, editable settings linked to Nova’s persistence layer.

---

## Task 4 — Custom Title Bar and Status Bar
**Objective:**  
Refine Nova’s presentation with custom window chrome and feedback area.

**Tasks:**  
1. Replace the default window title bar with a custom HTML/CSS bar.  
2. Add buttons for minimize, maximize/restore, and close.  
3. Add a bottom status bar showing basic messages (“Ready”, “Loading”, “Saved”).  
**Result:**  
A unified, frameless window with clean, minimal Nova-style UI.

---

## Task 5 — Theme System Foundation
**Objective:**  
Introduce a simple theme architecture that future components can build upon.

**Tasks:**  
1. Define a theme structure (colors, fonts, backgrounds).  
2. Provide two built-in themes: Light and Dark.  
3. Allow switching themes via the command palette or settings panel.  
4. Save selected theme in settings.json.  
**Result:**  
Theme switching fully operational and persistent between sessions.

---

## Task 6 — File Open and Preview Prototype
**Objective:**  
Demonstrate loading and displaying a text file inside Nova.

**Tasks:**  
1. Extend IPC bridge to open a chosen file via file dialog.  
2. Load text contents and display in a simple read-only editor area.  
3. No syntax highlighting or editing yet — just raw display.  
**Result:**  
The first tangible step toward Nova’s document editing capabilities.

---

## Task 7 — Unit Testing Setup
**Objective:**  
Establish a minimal automated test framework.

**Tasks:**  
1. Add Vitest or a similar lightweight TypeScript test runner.  
2. Write initial tests for settings manager and logger.  
3. Integrate tests into npm scripts (`npm test`).  
**Result:**  
Basic automated validation of core modules.

---

## Task 8 — Developer Diagnostics Command
**Objective:**  
Add a command that displays system info for debugging.

**Tasks:**  
1. Collect Node, Electron, and OS version details.  
2. Display results in a modal or log viewer panel.  
3. Optionally provide a “Copy Diagnostics” button.  
**Result:**  
Built-in tool for quick diagnostics and environment checks.

---

## Task 9 — Cross-Platform Verification
**Objective:**  
Ensure Nova behaves consistently on Windows, macOS, and Linux.

**Tasks:**  
1. Validate window creation, settings persistence, and logs across platforms.  
2. Fix any path or permissions issues.  
3. Update documentation for known differences.  
**Result:**  
Confirmed cross-platform stability.

---

## Task 10 — Documentation Update and Sprint Review
**Objective:**  
Capture learnings and prepare for the next sprint.

**Tasks:**  
1. Update README with new features and shortcuts.  
2. Update CHANGELOG with version 0.1.0 once features are verified.  
3. Document new modules (Command Palette, File Tree, Settings UI).  
4. Draft Sprint 3 planning notes.  
**Result:**  
Project documentation and roadmap aligned with Nova’s current state.

---

## Sprint 2 Summary
Sprint 2 transforms Nova from a static foundation into a lightly interactive desktop environment.  
By the end of this sprint, Nova will have a functional command system, a basic file tree, user-visible settings, custom chrome, theme switching, and automated testing — all achieved without sacrificing simplicity or elegance.

---

*End of Sprint 2.*
