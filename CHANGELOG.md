# CHANGELOG

All notable changes to the Nova project will be documented in this file.  
Nova follows a simplicity-first philosophy — every change listed here represents a deliberate, meaningful step forward.

---

## [Unreleased]
- Placeholder for upcoming changes and issues currently under development.

---

## [0.0.2] — Released
**Focus:** Persistent settings, stability, and security hardening  
**Issues:**  
- ISSUE 4 — Basic Settings Storage  
- Follow-ups from ISSUE 3 — Secure Preload Bridge  

**Highlights:**  
- Implemented local JSON settings under Electron `userData` for persistence.  
- Window size/position now saved automatically (move/resize/close/SIGINT) and restored on relaunch.  
- Hardened main process lifecycle to avoid crashes on window destroy and process signals.  
- Preload bridge expanded with `api.getSetting`/`api.setSetting` for safe renderer access.  
- Minimal CSP added to renderer to reduce security warnings.

---

## [0.0.1] — Released
**Versioning:** Managed manually by Aeon (Michael) through direct updates to `package.json` and git tags.  
Versioning follows intuition and creative judgment rather than fixed rules.  

**Focus:** Initial foundation and welcome interface  
**Completed Issues:**  
- ISSUE 1 — Initialize Project Structure  
- ISSUE 2 — Add Nova Welcome Screen  
- ISSUE 3 — Secure Preload Bridge  

**Highlights:**  
- Project bootstrapped with Electron + TypeScript (strict).  
- Nova window opens successfully with the Miranova Studios logo and tagline.  
- Secure preload bridge established between renderer and main processes.  

**Notes:**  
- No external build tools or frameworks used.  
- Manual restart workflow confirmed for development.  
- Versioning and tagging handled directly by Aeon.

---

## Entry Format
Each version section should include:
- **Focus:** A brief description of the goal or main improvement.  
- **Issues:** A list of tracked issues or features completed.  
- **Highlights:** Major achievements or functional changes.  
- **Notes:** Optional remarks or relevant context for the build.

---

*End of file.*
