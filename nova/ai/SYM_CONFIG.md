# Claude Configuration — Lyric Project (dev-core)

## 🚨 CRITICAL WORKFLOW RULE 🚨
**NEVER COMMIT ANY CHANGES WITHOUT CREATING A CHANGELOG ENTRY FIRST!**
This applies to ALL filesystem modifications - code, config, docs, renames, deletions, etc.

## 🎯 TASK COMPLETION REQUIREMENTS 🎯
**ALWAYS COMPLETE ONE TASK AT A TIME AND STOP!**
- **MANDATORY**: After completing any task, ALWAYS create:
  1. Changelog entry (nova/changelog/YYYYMMDD/HHMM-CHANGELOG.md)
  2. Sprint task summary (nova/aeon/trajectory-0.9.1/yield-0.x.x/SPRINTX_TASKX_SUMMARY.md)
  3. Commit changes
- **STOP EXECUTION** after task completion - do NOT proceed to next task
- **WAIT** for user instruction before starting next task
- **NEVER** implement multiple tasks in one session unless explicitly instructed

## 🖥️ SHELL ENVIRONMENT REMINDER 🖥️
**YOU ARE RUNNING POWERSHELL, NOT BASH!**
- Use PowerShell commands: `Get-Date -Format "yyyyMMdd/HHmm"` NOT `date +"%Y%m%d/%H%M"`
- Use PowerShell syntax for all terminal operations
- Remember: Windows PowerShell environment in Cursor

## User Control Configuration

### Git Commit Toggle

Should I commit changes to git and write changelog?
USER_RESPONSE: YES


**Options**
- **YES** – Claude will document, stage, commit, and write changelog entries.
- **NO** – Skip changelog and git operations; useful during debugging.

### Deployment Toggle (Lyric Is Interpreted)

Should I deploy the project after changes?
USER_RESPONSE: NO


**Notes**
- Lyric is an interpreted language; it does not require compilation or S3 deployment.
- Deployment toggles exist only for future use if Nova adds publishing features.
- Setting `NO` means all work remains local and version-controlled only.

---

## Standard Development Process

### 1. Preparation
- Ensure `dev-core` branch is checked out.
- Verify `.gitignore` excludes build artifacts (`__pycache__`, `.egg-info`, etc.).
- Confirm both toggles in this config are correct before each iteration.

### 2. Modify or Generate Code
Claude will:
- Create or update files inside `/lyric/`, `/tests/`, and `/examples/`.
- Maintain imports and Python package integrity.
- Ensure new modules import cleanly.
- **IMPORTANT**: When instructed to iterate on a specific task (e.g., "SPRINT3_PLAN.md Task 1"), only implement that specific task and its requirements. Do not implement other tasks from the sprint unless explicitly instructed.
- **TEST STRUCTURE**: Conform to the unit test structure defined in `nova/aeon/trajectory-0.9.1/TEST_STRUCTURE.md` - organize tests by yield version in `lyric/tests/core-0.x.x/` directories
- **🚨 CRITICAL TEST REQUIREMENT 🚨**: **ALL UNIT TESTS MUST PASS 100% BEFORE TASK COMPLETION!** This is the END GOAL specified in TEST_STRUCTURE.md. If you cannot achieve 100% test pass rate in a reasonable amount of time (typically 3-5 attempts), PAUSE EXECUTION and ask the user what should be done next. Do not consider any task complete until all tests are passing.
- **🚨 STUDIO DIRECTORY RESTRICTION 🚨**: **DO NOT MODIFY FILES IN THE `studio/` DIRECTORY!** The studio directory contains example scripts that should remain unchanged unless explicitly instructed otherwise. Focus development work on core language files in `/lyric/`, `/tests/`, and `/examples/` directories only.

### 3. Write Summary (Conditional)
If **Git Commit Toggle = YES**, Claude writes a changelog entry **AFTER** completing the task implementation:

**MANDATORY REQUIREMENT**: Always get the current date and time before creating changelog files.

**Changelog Path Format:**
nova/changelog/YYYYMMDD/TIME_HHMM-CHANGELOG.md

**Time Format**: Use 24-hour format (e.g., 1430 for 2:30 PM, 0915 for 9:15 AM)

**🚨 DUPLICATE TIMESTAMP HANDLING 🚨**:
If a changelog file already exists with the same timestamp, append a decimal suffix:
- First file: `2050-CHANGELOG.md`
- Second file: `2050.1-CHANGELOG.md` 
- Third file: `2050.2-CHANGELOG.md`
- And so on...

**Examples:**
- `nova/changelog/20251022/1430-CHANGELOG.md`
- `nova/changelog/20251022/1430.1-CHANGELOG.md`
- `nova/changelog/20251022/1430.2-CHANGELOG.md`

**Include**
- Commit hash
- Files changed
- Summary of implementation
- Status (✅ done / ⏳ pending)
- Relevant sprint and task references

### 4. Write Sprint Task Summary (Conditional)
If **Git Commit Toggle = YES**, Claude writes a sprint task summary **AFTER** completing the task implementation:

**🚨 CRITICAL REQUIREMENT 🚨**: 
**ALWAYS CREATE SPRINT TASK SUMMARY - THIS IS MANDATORY!**

nova/aeon/trajectory-0.9.1/yield-0.x.x/SPRINTX_TASKX_SUMMARY.md


**Naming Convention**: Always use SPRINTX_TASKX_SUMMARY.md format (e.g., SPRINT1_TASK1_SUMMARY.md, SPRINT1_TASK2_SUMMARY.md)

**Include**
- Brief task completion summary
- Key accomplishments
- Files created/modified
- Status (✅ Completed)
- Reference to changelog for details

### 5. Write Sprint DOD Summary (Conditional)
If **Git Commit Toggle = YES** and sprint is complete, Claude writes a sprint definition of done summary **AFTER** completing all sprint tasks:


nova/aeon/trajectory-0.9.1/yield-0.x.x/SPRINTX_DOD_SUMMARY.md


**Include**
- Sprint objective summary
- All tasks completed status
- Definition of done criteria verification
- Overall sprint status (✅ Completed)
- Reference to all task summaries and changelogs

### 6. Git Add & Commit (Conditional)

**🚨 CRITICAL REQUIREMENT 🚨**: 
**NEVER COMMIT WITHOUT CREATING A CHANGELOG ENTRY FIRST!**

**This applies to ALL commits, including:**
- File modifications
- File deletions  
- File renames/moves
- Directory changes
- Configuration updates
- Documentation changes
- ANY filesystem modification

**Final Step Process:**
1. **REQUIRED**: Create changelog entry (Step 3) with placeholder commit hash - **MUST BE DONE FIRST**
2. **REQUIRED**: Create sprint task summary (Step 4) - **MUST BE DONE BEFORE COMMIT**
3. **REQUIRED**: Create sprint DOD summary (Step 5) if sprint complete - **MUST BE DONE BEFORE COMMIT**
4. **CHECKLIST**: ✅ Changelog created ✅ Task summary created ✅ DOD summary created (if applicable)
5. Stage all files: `git add *`
6. Commit all changes: `git commit -a -m "SprintX TaskY: <brief description>"`
7. **STOP HERE** - Do NOT create a second commit to update changelog with commit hash

**🚨 CRITICAL ORDER RULE 🚨**:
**ALL DOCUMENTATION MUST BE CREATED BEFORE ANY COMMIT!**
**CHANGELOG → TASK SUMMARY → DOD SUMMARY → COMMIT**

```bash
git add *
git commit -a -m "SprintX TaskY: <brief description>"
```

**🚨 CRITICAL RULE 🚨**: 
**ONLY ONE COMMIT PER USER PROMPT - NO EXCEPTIONS!**
**DO NOT UPDATE CHANGELOG WITH COMMIT HASH IN A SECOND COMMIT!**
**LEAVE CHANGELOG WITH PLACEHOLDER HASH - IT WILL BE UPDATED LATER!**

**Commit Message Format**: 
- **MUST** be one line only
- **MUST** include sprint number and task number
- **MUST** be concise (e.g., "Sprint1 Task2: Implement Lexer", "Sprint1 Task4: Implement Parser")
- **MUST NOT** include detailed descriptions (those go in changelog entries)
- **🚨 CRITICAL**: Keep commit messages SHORT - detailed information is in changelog files!

**Note**: This process ensures that:
- Changelog entries are ALWAYS created before commits
- New files created (changelog entries, task summaries, DOD summaries) are staged with `git add *`
- All modifications to existing files are included with `git commit -a`
- Both new documentation and code changes are committed together
- Commit messages are concise and follow the SprintX TaskY format

Keep commit messages short; details live in changelog entries.

**❌ WRONG - Too detailed:**
```
git commit -m "Sprint 4 Task 2: Update Specification and Grammar

- Updated Lyric Language Specification to version 0.4.0
- Corrected type names throughout (god→bool, float→flt)
- Enhanced grammar rules to match current implementation
- Added comprehensive multi-declaration examples and error messages
- Updated syntax examples to remove colons from control structures
- Updated implementation status and test counts (334+ tests)
- Added sample error messages for type mismatches and invalid types

The specification now accurately reflects the multi-variable declaration
feature implemented in Sprint 4 Task 1.

Closes: Sprint 4 Task 2"
```

**✅ CORRECT - Concise:**
```
git commit -m "Sprint4 Task2: Update specification and grammar"
```

### Changelog Format

# SprintX TaskY — YYYYMMDD.HHMM

## Summary
Short explanation of what was implemented or fixed.

## Files Changed
- lyric/lexer.py — implemented tokenizer
- tests/test_lexer.py — added baseline tests

## Reason
Establishes foundational lexer and test coverage for Lyric v0.1

## Git Commit Hash
`TBD` - SprintX TaskY Implementation

**NOTE**: Use `TBD` as placeholder - commit hash will be updated later

## Status
✅ Completed


## Safety & Validation Rules

Claude must never delete directories without confirmation.

Always include commit hash in changelog.

All generated Python files must be syntactically valid and importable.

Unit tests must run via pytest -q without fatal errors.

CLI command lyric run examples/hello.ly must work after Sprint 1 completion.

## Language Specification Maintenance

**IMPORTANT**: The Lyric Language Specification is now maintained manually at `../lyric-lang.org` and is no longer part of this project repository. Claude will NOT make updates to the language specification - this is handled manually by the user.

## Summary

No build/deploy steps.

Focus: Pure interpreted language development.

Goal: Maintain structured commits, organized changelogs, and validated tests.
