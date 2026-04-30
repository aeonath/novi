# Ad Hoc Summary 1 — Migrate Novi Shell Settings to Settings Page

**Sprint**: Sprint 8 (yield-0.8.x)
**Goal**: Move every configurable option out of the Novi Shell REPL and into the
visual Settings page, then remove the Novi Shell entirely once it is empty.

---

## Motivation

The Novi Shell (`novi>` REPL) currently doubles as both a command interface and a
settings panel. Settings belong in the Settings page. Removing them from the REPL
reduces duplication, makes settings discoverable to users who do not know the REPL
exists, and clears the path to deleting the Novi Shell component.

---

## Migration Checklist

Each row is one ad hoc task. Complete them in order — the Novi Shell is removed last.

| # | Setting | Shell command | Settings section | Status |
|---|---------|---------------|------------------|--------|
| 1 | VI Mode | `set vimode on/off` | Editor | ✅ Done |
| 2 | Compat mode | `set compat on/off` | Editor | ⬜ Pending |
| 3 | Single file tree | `set singlefiletree on/off` | Novi | ✅ Done |
| 4 | Keep tabs | `set keeptabs on/off` | Novi | ✅ Done |
| 5 | Git enabled | `set gitenabled on/off` | Novi | ✅ Done |
| 6 | Show hidden files | `set showhiddenfiles on/off` | Editor or Novi | ⬜ Pending |
| 7 | Remove Novi Shell | — | — | ⬜ Pending (after all above) |

---

## Task 1 — VI Mode → Editor Settings (this task)

**What moved**: `set vimode on/off` removed from the Novi Shell REPL.
VI Mode toggle added to the **Editor** section of the Settings page.

**Files changed**:
- `src/renderer/components/SettingsTab.ts` — `renderEditorSettings()` added with VI Mode toggle
- `src/renderer/components/NoviShell.ts` — `vimode` removed from valid options, display, and event map

**How it works**: The toggle calls `window.api.setSetting('vimode', value)` and
dispatches `novi-vimode-changed` so `MonacoEditor.ts` picks up the change immediately
without a restart — same mechanism the REPL used.
