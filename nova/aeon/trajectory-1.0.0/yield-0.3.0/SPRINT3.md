# SPRINT 3 — Nova Editing Core (Refined)

**target version** 0.3.0

Sprint 3 introduces the Monaco Editor as Nova’s text editing core.  
This sprint maintains Nova’s simplicity and transparency while expanding capability — the editor feels native, integrated, and directly responsive to user interaction.

---

## Adjusted Principles for Sprint 3
- All editor configuration is handled through Nova’s Settings Panel (no config files).  
- All commands are accessed through the Action HUD or contextual UI, not a palette.  
- Monaco should appear seamless — no web-like chrome or clutter.

---

## Task 1 — Monaco Integration (Core)
**Objective:**  
Embed the Monaco Editor as Nova’s primary text editing component.

**Tasks:**  
1. Add monaco-editor as a local dependency and ensure it builds correctly with Nova’s bundler (Vite or Webpack).

2. Create an EditorView container in src/renderer/editor/. Mount Monaco inside a <div id="editor"> that fills the window.

3. Initialize the editor with basic options (language: 'plaintext', automaticLayout: true, theme: 'vs-dark').  You may use our dark or light themes that are alraedy implemented.

4. Load a static sample file or test string to confirm proper rendering.

5. Verify smooth input, scrolling, resizing, and no renderer errors on window reload.
**Result:**  
Monaco runs natively within Nova.

---

## Task 2 — File Open and Save Integration
**Objective:**  
Connect editor content to Nova’s file I/O layer.

**Tasks:**  
1. Load selected files into Monaco via IPC.  
2. Implement Save and Save As actions.  
3. Handle unsaved changes elegantly.  
**Result:**  
Files can be opened, edited, and saved seamlessly.

---

## Task 3 — Tabbed Document System
**Objective:**  
Allow multiple files to be open simultaneously.

**Tasks:**  
1. Create a minimal tab bar above the editor.  
2. Support tab switching and closing.  
3. Track unsaved state visually.  
**Result:**  
Multi-document editing with intuitive UI.

---

## Task 4 — Theme Synchronization
**Objective:**  
Unify Monaco and Nova themes.

**Tasks:**  
1. Extend Nova’s theme system to define syntax colors.  
2. Apply Light and Dark themes dynamically.  
3. Persist user choice through Settings Panel.  
**Result:**  
Consistent appearance across all UI elements.

---

## Task 5 — Editor Settings Persistence
**Objective:**  
Preserve editor-specific preferences and disale minimap for now

**Tasks:**  
1. Store font size, and wrap settings via Settings Panel. 
Font size already seems to be working 
2. Apply instantly and persist on exit.
3. Disable the minimap in the app for now.  
**Result:**  
A personalized editing experience that “just works.”

---

## Task 6 — Basic Language Awareness
**Objective:**  
Enable syntax highlighting and minimal IntelliSense.

**Tasks:**  
1. Activate Monaco’s JS/TS/JSON, md, etc.  modes.  
2. Load proper syntax automatically by file extension.  
**Result:**  
Intelligent, context-aware editing.

---

## Task 7 — Search and Replace
**Objective:**  
Provide efficient text search within the editor.

**Tasks:**  
1. Implement Monaco’s search and replace UI.  
2. Support keyboard shortcuts (Ctrl/Cmd + F / H).  
**Result:**  
Smooth and intuitive search operations.

---

## Task 8 — Auto-Save and Recovery
**Objective:**  
Ensure work safety through automatic backups.

**Tasks:**  
1. Implement timed auto-save for unsaved buffers.  
2. Restore recovered files on restart.  
3. Log recovery operations.  
**Result:**  
Work is preserved even after interruption.

---

## Task 9 — Performance Verification
**Objective:**  
Verify performance after editor integration.

**Tasks:**  
1. Measure startup time and editor load latency.  
2. Confirm smooth performance for typical workloads.  
**Result:**  
Nova remains lightweight and responsive.

---

## Task 10 — Documentation and Review
**Objective:**  
Finalize Sprint 3 and update all docs.

**Tasks:**  
1. Update README and CHANGELOG for version 0.2.0.  
2. Document the editor system in DEV_NOTES.md.  
**Result:**  
Clear documentation reflecting a functional Nova editing environment.

---

## Sprint 3 Summary
Sprint 3 introduces the Monaco Editor and delivers a cohesive, theme-aware, user-friendly editing environment — without adopting any of the clutter or bloat of traditional IDEs.

---

*End of Sprint 3 (Refined).*
