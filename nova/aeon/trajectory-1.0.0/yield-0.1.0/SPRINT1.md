# SPRINT 1 — Nova Foundations

**target version** 0.1.0

This document outlines the first development sprint for the Nova project.  
Sprint 1 establishes the core structure, identity, and stability of the application — taking Nova from a blank window to a functional, stateful, and logged desktop app.  
Each task builds upon the previous one in logical order.

---

## Task 1 — Initialize Project Structure
**Objective:**  
Create a clean Electron + TypeScript workspace to serve as Nova’s foundation.

**Tasks:**  
1. Initialize npm project using Node 22.  
2. Install Electron, TypeScript, ts-node, and all required type definitions.  
3. Create the folder layout:  
   - src/main  
   - src/preload  
   - src/renderer  
4. Configure TypeScript (strict mode, ESM modules, output to `dist/`).  
5. Add npm scripts:  
   - build → `tsc`  
   - start → `npm run build && electron ./dist/main/main.js`  
6. Confirm that `npm start` compiles and opens a blank Electron window.

---

## Task 2 — Add Nova Welcome Screen
**Objective:**  
Introduce Nova’s visual identity with a simple welcome interface.

**Tasks:**  
1. Add the Miranova Studios logo and tagline “Build. Learn. Iterate.” centered on screen.  
2. Use minimal CSS — no frameworks or dependencies.  
3. Ensure window resizing maintains centered layout.  
4. Include all assets locally.  
**Result:** Nova launches with a clean, centered welcome screen.

---

## Task 3 — Secure Preload Bridge
**Objective:**  
Connect the renderer and main processes safely through a minimal preload layer.

**Tasks:**  
1. Enable `contextIsolation` and `sandbox` in BrowserWindow configuration.  
2. In `preload.ts`, expose `window.api` with:  
   - `getVersion()` returning app version.  
   - `ping()` returning “pong”.  
3. Call these functions in the renderer and log outputs to console.  
**Result:** A verified, secure communication bridge between processes.

---

## Task 4 — Implement Basic Settings Storage
**Objective:**  
Allow Nova to remember simple preferences such as window size and position.

**Tasks:**  
1. Create `settingsManager` in the main process.  
2. Store configuration in `app.getPath('userData')/settings.json`.  
3. Save and restore window bounds (width, height, x, y).  
4. Add preload bridge for `getSetting` and `setSetting`.  
**Result:** Nova reopens in the same size and position as last use.

---

## Task 5 — Logging and Error Handling
**Objective:**  
Add internal visibility and resilience through logging and crash capture.

**Tasks:**  
1. Log to `userData/logs/YYYY-MM-DD.log`.  
2. Include timestamp, level, and message format.  
3. Print all log entries to both console and log file.  
4. Catch unhandled exceptions and promise rejections.  
5. Show simple alert in renderer when critical errors occur.  
**Result:** Nova maintains clear logs and handles errors gracefully.

---

## Task 6 — Windows Packaging
**Objective:**  
Distribute Nova as a runnable Windows application.

**Tasks:**  
1. Use `electron-builder` to generate installer or portable EXE.  
2. Configure productName “Nova” and appId “studio.miranova.nova”.  
3. Verify that packaged build launches cleanly on Windows.  
**Result:** A working Windows build for testing and distribution.

---

## Task 7 — Documentation and Team Alignment
**Objective:**  
Ensure clarity and alignment across all contributors (human and AI).

**Tasks:**  
1. Write `README.md` with setup, build, and run instructions.   

---

## Task 8 — Future Foundation (Optional)
**Objective:**  
Lay placeholders for upcoming systems without adding dependencies.

**Tasks:**  
1. Create placeholder modules for Command Palette, File Tree, or similar.  
2. Include only TODO comments — no implementation yet.  
3. Verify that build and runtime remain stable.  
**Result:** Nova compiles cleanly with placeholders for future expansion.

---

## Task 9 — Quality and Type Enforcement
**Objective:**  
Introduce light code quality checks for long-term maintainability.

**Tasks:**  
1. Add ESLint and Prettier configurations with strict rules.  
2. Add npm scripts: `lint`, `lint:fix`, and `fmt`.  
3. Ensure all TypeScript files pass lint and type checks.  
**Result:** Consistent code style and predictable builds.

---

## Task 10 — Error Boundary and Crash Reporting
**Objective:**  
Add a final layer of robustness for the initial release cycle.

**Tasks:**  
1. Implement global handlers for `uncaughtException` and `unhandledRejection`.  
2. Create a basic crash report output in `userData/crashes/`.  
3. Provide a “Copy Diagnostics” option for logs and environment info.  
**Result:** Nova can capture and preserve crash data for review.

---

## Sprint Summary
Sprint 1 establishes Nova’s entire foundation: structure, branding, settings persistence, logging, and basic documentation.  
Upon completion of these ten tasks, Nova will be considered ready for feature development in Sprint 2.

---

*End of Sprint 1.*
