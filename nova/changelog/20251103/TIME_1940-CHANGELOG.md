# CHANGELOG - Update CLAUDE_CONFIG.md for commit workflow clarity

**Date:** November 3, 2025  
**Time:** 19:40  
**Type:** Configuration Update  
**Commit:** TBD

## Summary
Updated `CLAUDE_CONFIG.md` to make commit workflow and message format requirements crystal clear, emphasizing that CHANGELOG must be written BEFORE commits and that commit messages must be SHORT.

## Problem
Claude was not consistently following the required workflow:
1. Writing commits without creating CHANGELOG first
2. Using conventional commit format (`feat:`, `fix:`) instead of required `SprintX TaskY:` format
3. Writing overly long commit messages with detailed descriptions

## Changes Made

### File Modified: `nova/ai/CLAUDE_CONFIG.md`

**1. Enhanced Commit Message Format Section (lines 192-201)**
Added explicit requirements:
- **MUST** be SHORT and concise (< 80 characters)
- **MUST** use format: `SprintX TaskY: brief description`
- **DO NOT** use conventional commit format (feat:, fix:, refactor, etc.)
- **EXAMPLE**: `Sprint3 Task1: Integrate Monaco Editor`
- Added warning to keep messages SHORT - detailed info goes in changelog

**2. Restructured Final Step Process (lines 161-194)**
Made the order more explicit with numbered steps:
- **FIRST**: Create DETAILED CHANGELOG (before any git operations)
- **SECOND**: Create HIGH-LEVEL TASK SUMMARY (for sprint tasks only)
- **THIRD**: Create sprint DOD summary (if sprint complete)
- **FOURTH**: Verify checklist
- **FIFTH**: Stage all files (`git add -A`)
- **SIXTH**: Commit with SHORT message
- **STOP**: Do not create second commit

Added prominent visual markers:
- `**🚨 CRITICAL ORDER 🚨**: CHANGELOG → TASK SUMMARY → GIT COMMIT`
- Emphasized that CHANGELOG must be done BEFORE ANY GIT OPERATIONS

**3. Clarified Commit Message Examples**
- Changed from generic format to specific examples
- Emphasized keeping messages under 80 characters
- Explicitly prohibited conventional commit format

## Key Requirements Now Clearly Stated

### Workflow Order
```
1. Write DETAILED CHANGELOG (nova/changelog/YYYYMMDD/TIME_HHMM-CHANGELOG.md)
2. Write TASK SUMMARY (nova/aeon/.../SPRINTX_TASKX_SUMMARY.md) - sprint tasks only
3. Stage: git add -A
4. Commit: git commit -m "SprintX TaskY: brief description"
```

### Commit Message Format
- ✅ **DO**: `Sprint3 Task1: Integrate Monaco Editor`
- ❌ **DON'T**: `feat(editor): Integrate Monaco Editor as primary text editing component`
- ✅ **DO**: Keep under 80 characters
- ❌ **DON'T**: Include detailed descriptions (those go in CHANGELOG)

## Impact
- **Claude**: Will now consistently write CHANGELOG before commits
- **Claude**: Will use correct short commit message format
- **Git History**: Will be cleaner with consistent, concise messages
- **Documentation**: Will be properly created before each commit

## Files Modified
- `nova/ai/CLAUDE_CONFIG.md` - Enhanced commit workflow documentation

## Status
✅ Complete

## Notes
This config update addresses user feedback about commit workflow. Going forward, all commits will follow the correct order: CHANGELOG → (TASK SUMMARY if sprint task) → GIT COMMIT.

