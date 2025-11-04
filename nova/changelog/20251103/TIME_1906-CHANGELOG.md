# CHANGELOG — TIME_1906

**Date:** November 3, 2025  
**Time:** 19:06  
**Type:** Version Bump - Sprint 2 Release

---

## Summary

Updated Nova version from 0.0.1 to 0.2.0, marking the official completion of Sprint 2 (Interaction Layer). This version includes all features and improvements delivered during Sprint 2.

---

## Changes

### Version Update

**File:** `package.json`

**Change:**
```json
"version": "0.0.1"  →  "version": "0.2.0"
```

**Impact:**
- Electron app now reports version 0.2.0
- System Diagnostics panel shows "Application Version: 0.2.0"
- Package builds will be named "Nova 0.2.0.exe"
- npm commands show "nova@0.2.0"

---

## Version History

### v0.0.1 (Sprint 1 - Foundation)
- Core infrastructure
- Settings and logging systems
- Crash reporting
- Basic Electron setup
- 46 tests

### v0.2.0 (Sprint 2 - Interaction Layer) ✅ **CURRENT**
- Action HUD
- Visual Settings Panel
- Custom Title Bar & Status Bar
- Theme System (Light/Dark)
- File Viewer
- File Tree
- System Diagnostics Panel
- 271 tests (100% pass rate)

---

## Sprint 2 Feature Summary

### Major Features Delivered in v0.2.0

1. **Action HUD** - Contextual action menu (Ctrl/Cmd + K)
2. **Visual Settings Panel** - No JSON editing required
3. **Custom Window Chrome** - Title bar with window controls
4. **Status Bar** - Contextual information display
5. **Theme System** - Instant Light/Dark switching
6. **File Viewer** - Read-only text file viewer with line numbers
7. **File Tree** - File system browser
8. **System Diagnostics** - Environment information viewer

### Statistics

- **8 UI Components** created
- **271 tests** (up from 46, +489%)
- **13 test suites**
- **18 new files**
- **7 files modified**
- **100% test pass rate**

---

## Verification

### Build Test
```bash
npm run build
```

**Output:**
```
> nova@0.2.0 build
```

Confirms version updated successfully.

### Runtime Test
```bash
npm start
```

**Expected:**
1. Application title shows "Nova IDE"
2. System Diagnostics shows "Application Version: 0.2.0"
3. All Sprint 2 features functional:
   - Ctrl + K opens Action HUD
   - Theme switching works
   - File operations work
   - Settings panel accessible

### Packaging Test
```bash
npm run pack:win
```

**Expected Output:**
- `dist/Nova 0.2.0.exe` (or similar)

---

## README Status

The README was already updated in Sprint 2 Task 10 to reflect version 0.2.0:
```markdown
**Version:** 0.2.0 (Sprint 2 - Interaction Layer)
**Status:** Active Development
```

No further README changes needed.

---

## Files Changed

### Modified
- `package.json` - Version bumped from 0.0.1 to 0.2.0

---

## User-Facing Impact

Users will now see:
- **Application Version:** 0.2.0 in System Diagnostics
- **Window Title:** Nova IDE
- **About/Version Info:** 0.2.0

**No functional changes** - this is purely a version identifier update to mark Sprint 2 completion.

---

## Next Version

### v0.3.0 (Sprint 3 - Editor Foundation) - Planned
- Text editing capabilities
- Syntax highlighting
- Multi-file tabs
- Save/Save As functionality

---

## Status

✅ **Complete** - Nova version updated to 0.2.0 marking Sprint 2 completion

---

## Git Commit Hash

`TBD` - Version 0.2.0 release

---

**Type:** Version Bump  
**Priority:** Normal (Sprint completion)  
**Sprint:** Sprint 2 - Interaction Layer  
**Release Date:** November 3-4, 2025

