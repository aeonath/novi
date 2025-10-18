# SPRINT 2 — Nova Interaction Layer (Revised)

Sprint 2 focuses on introducing intuitive interaction and visibility into Nova.  
This phase replaces the traditional command palette and JSON configuration model with systems that prioritize clarity, discoverability, and elegance.

---

## Task 1 — Action HUD Prototype
**Objective:**  
Create a minimal contextual action interface to replace the command palette concept.

**Tasks:**  
1. Implement a small on-screen overlay (HUD) that appears when the user presses a shortcut (e.g., Ctrl/Cmd + Space).  
2. The HUD displays only a handful of *context-relevant actions*, such as:  
   - Open File  
   - Toggle Theme  
   - Settings  
3. Use arrow keys or mouse to navigate options.  
4. Actions invoke the same internal command system for reusability, but the UI remains simple and focused.  
**Result:**  
A visible, discoverable action interface that feels direct and intuitive — Nova’s answer to the bloated command palette.

---

## Task 2 — File Tree Mock
**Objective:**  
Display a lightweight, read-only file tree for a selected directory.

**Tasks:**  
1. Add a left-hand panel listing files and folders from a selected path.  
2. Use IPC to request folder contents from the main process.  
3. Support expand/collapse and scrolling.  
**Result:**  
A basic visual file browser that provides spatial awareness inside Nova.

---

## Task 3 — Visual Settings Panel
**Objective:**  
Introduce Nova’s first configuration interface — entirely visual, no manual JSON editing.

**Tasks:**  
1. Create a simple modal or tabbed panel listing available settings (theme, font size, etc.).  
2. Use toggles, sliders, and dropdowns for changes.  
3. Persist values via the existing settings manager.  
4. Apply changes in real time.  
**Result:**  
A fully interactive, UI-based settings system that eliminates file-based configuration.

---

## Task 4 — Custom Title Bar and Status Bar
**Objective:**  
Unify Nova’s visual presentation with custom window chrome.

**Tasks:**  
1. Replace the default title bar with a custom HTML/CSS version.  
2. Add native-feeling minimize, maximize, and close controls.  
3. Add a bottom status bar displaying contextual information (“Ready”, “Loading”, etc.).  
**Result:**  
A frameless window consistent with Nova’s design aesthetic.

---

## Task 5 — Theme System Foundation
**Objective:**  
Implement the core theme framework used by all renderer components.

**Tasks:**  
1. Define a theme structure (colors, fonts, padding, accents).  
2. Include Light and Dark themes.  
3. Integrate theme selection with the Settings Panel.  
**Result:**  
Theme switching is instant and persists between sessions.

---

## Task 6 — File Open and Preview Prototype
**Objective:**  
Demonstrate opening and displaying text files inside Nova.

**Tasks:**  
1. Add IPC “Open File” and “Read File” commands.  
2. Display the file contents in a basic read-only viewer.  
3. Add “Reload File” and “Close File” options to Action HUD.  
**Result:**  
The first visible step toward an integrated editor.

---

## Task 7 — Unit Testing Setup
**Objective:**  
Establish minimal automated test coverage.

**Tasks:**  
1. Add a lightweight test runner (Vitest or equivalent).  
2. Test the settings manager and logger.  
3. Integrate with npm scripts (`npm test`).  
**Result:**  
Automated validation for Nova’s key systems.

---

## Task 8 — Developer Diagnostics Panel
**Objective:**  
Provide a small diagnostics viewer for environment details.

**Tasks:**  
1. Collect Electron, Node, and OS version data.  
2. Display it in a modal panel, accessible from the Action HUD.  
3. Include a “Copy Info” button for quick sharing.  
**Result:**  
Built-in developer info tool for easier debugging.

---

## Task 9 — Cross-Platform Verification
**Objective:**  
Validate stability on Windows, macOS, and Linux.

**Tasks:**  
1. Test startup, settings, and logs across all platforms.  
2. Fix any path or permission issues.  
**Result:**  
Cross-platform stability confirmed.

---

## Task 10 — Documentation and Sprint Review
**Objective:**  
Document the new interactive systems and update development notes.

**Tasks:**  
1. Update README with Action HUD and Settings Panel features.  
2. Add entries to CHANGELOG for version 0.1.0.  
3. Outline Sprint 3 planning notes.  
**Result:**  
All documentation matches Nova’s current design philosophy.

---

## Sprint 2 Summary
Sprint 2 introduces user-facing interaction and configuration that are visual, contextual, and intuitive.  
It firmly separates Nova from legacy IDE patterns by removing the command palette and JSON-based settings in favor of clear, elegant UI systems.

---

*End of Sprint 2 (Revised).*
