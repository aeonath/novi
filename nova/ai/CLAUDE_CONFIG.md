# Claude Configuration — Novi Project (dev-core)

# Claude Config

You are a AI software engineer at miranova studios.  Please read this config before
iterating on the tasks in the SPRINT plan documents or before doing an ad hoc modifications.

## 🚨 CRITICAL WORKFLOW RULE 🚨
**NEVER COMMIT ANY CHANGES WITHOUT CREATING A CHANGELOG ENTRY FIRST!**
This applies to ALL filesystem modifications - code, config, docs, renames, deletions, etc.

## 🎯 TASK COMPLETION REQUIREMENTS 🎯
**ALWAYS COMPLETE ONE TASK AT A TIME AND STOP!**
- **MANDATORY**: After completing any task, ALWAYS create:
  1. Changelog entry (nova/changelog/YYYYMMDD/HHMM-CHANGELOG.md)
  2. Sprint task summary (nova/aeon/trajectory-1.0.0/yield-0.x.x/SPRINTX_TASKX_SUMMARY.md)
  3. Commit changes
- **STOP EXECUTION** after task completion - do NOT proceed to next task
- **WAIT** for user instruction before starting next task
- **NEVER** implement multiple tasks in one session unless explicitly instructed

## 🖥️ SHELL ENVIRONMENT REMINDER 🖥️
**Your shell is git-bash**
- `date +"%Y%m%d/%H%M"`

## ⏰ DATE/TIME REQUIREMENT ⏰
**ALWAYS GET THE CURRENT DATE/TIME FIRST!**
- **MANDATORY**: At the start of ANY work session
- Use this date for ALL changelog and documentation files
- NEVER assume or guess the date - always verify with the system
- Changelog directory structure: `nova/changelog/YYYYMMDD/TIME_HHMM-CHANGELOG.md`
- If there's a conflict, append `.1`, `.2`, etc: `TIME_HHMM.1-CHANGELOG.md`

## User Control Configuration

### Git Commit Toggle

Should I commit changes to git and write changelog?
USER_RESPONSE: YES

**Options**
- **YES** – AI Agent will document, stage, commit, and write changelog entries.
- **NO** – Skip changelog and git operations; useful during debugging.

---

## Standard Development Process

### 1. Preparation
- Ensure `dev-core` branch is checked out.
- Verify `.gitignore` excludes build artifacts 
- Confirm toggles in this config are correct before each iteration.

### 2. Modify or Generate Code
AI agent will:
- Create or update files inside `/src/`, `/src/tests/`, `/src/main/`, `/src/preload/`, `/src/renderer/`.

- **🚨 COPYRIGHT HEADER REQUIREMENT 🚨**: **ALL NEW SOURCE FILES MUST INCLUDE COPYRIGHT HEADER!**
  ```typescript
  /**
   * © 2025-2026 MiraNova Studios. All rights reserved.
   */
  ```
  This applies to all `.ts`, `.tsx`, and `.js` files. Do NOT add to `.d.ts` declaration files.

- **IMPORTANT**: When instructed to iterate on a specific task (e.g., "SPRINT3_PLAN.md Task 1"), only implement that specific task and its requirements. Do not implement other tasks from the sprint unless explicitly instructed.

- **🚨 TEST DIRECTORY STRUCTURE 🚨**: Unit tests are organized by yield version:
  - Sprint 1 (yield 0.1.0) → `src/tests/core-0.1.0/`
  - Sprint 2 (yield 0.2.0) → `src/tests/core-0.2.0/`
  - Sprint 3 (yield 0.3.0) → `src/tests/core-0.3.0/`
  - **Sprint 4 (yield 0.4.0) → `src/tests/core-0.4.0/`** ← **CURRENT**
  - Future sprints follow the same pattern
  - **RULE**: Always create new tests in the directory matching the current yield version
  - Do NOT move existing tests from previous directories

- **TEST STRUCTURE**: Conform to the unit test structure defined in `nova/aeon/trajectory-1.0.0/TEST_STRUCTURE.md` if it exists. If no test structure exists, organize tests appropriately for the Novi Electron project (TypeScript/JavaScript).
- **🚨 CRITICAL TEST REQUIREMENT 🚨**: **ALL UNIT TESTS MUST PASS 100% BEFORE TASK COMPLETION!** You must implement unit tests for all features you implement. If there are no unit tests yet, you need to pick a framework (e.g., Jest, Mocha, Vitest) and write them. If you cannot achieve 100% test pass rate in a reasonable amount of time (typically 3-5 attempts), PAUSE EXECUTION and ask the user what should be done next. Do not consider any task complete until all tests are passing.
- **🚨 TEST AFTER EVERY CHANGE 🚨**: **RUN `npm test` AFTER EVERY BUG FIX, FEATURE, OR CODE CHANGE!** This applies to ALL changes - not just sprint tasks. Fix any failing tests immediately. Unit tests are what keep our velocity high and technical debt low. ALWAYS ensure 100% test pass rate before creating changelog and committing changes.

### 3. Write Detailed CHANGELOG (Conditional)
If **Git Commit Toggle = YES**, Claude writes a **DETAILED CHANGELOG** entry **AFTER** completing the task implementation:

**🚨 MANDATORY REQUIREMENT 🚨**: 
**ALWAYS CREATE BOTH CHANGELOG AND TASK SUMMARY - THESE ARE SEPARATE DOCUMENTS!**

**Changelog Path Format:**
```
nova/changelog/YYYYMMDD/TIME_HHMM-CHANGELOG.md
```

**MANDATORY REQUIREMENT**: Always get the current date and time before creating changelog files.

**Time Format**: Use 24-hour format (e.g., 1430 for 2:30 PM, 0915 for 9:15 AM)

**🚨 DUPLICATE TIMESTAMP HANDLING 🚨**:
If a changelog file already exists with the same timestamp, append a decimal suffix:
- First file: `TIME_2050-CHANGELOG.md`
- Second file: `TIME_2050.1-CHANGELOG.md` 
- Third file: `TIME_2050.2-CHANGELOG.md`
- And so on...

**Examples:**
- `nova/changelog/20251022/TIME_1430-CHANGELOG.md`
- `nova/changelog/20251022/TIME_1430.1-CHANGELOG.md`
- `nova/changelog/20251022/TIME_1430.2-CHANGELOG.md`

**PURPOSE**: Detailed technical documentation of ALL changes made

**Include in CHANGELOG (DETAILED):**
- Complete technical description of changes
- All files modified/created with explanations
- Code snippets and technical details
- Test results and coverage
- Implementation decisions and rationale
- User-facing impact
- Commit hash (TBD placeholder)
- Status (✅ done / ⏳ pending)
- Relevant sprint and task references

**CHANGELOG should be COMPREHENSIVE** - think of it as the technical documentation that another developer would need to understand what was done and why.

### 4. Write Sprint Task Summary (Conditional)
If **Git Commit Toggle = YES**, Claude writes a **HIGH-LEVEL SPRINT TASK SUMMARY** **AFTER** completing the task implementation:

**🚨 CRITICAL REQUIREMENT 🚨**: 
**ALWAYS CREATE SPRINT TASK SUMMARY - THIS IS MANDATORY AND SEPARATE FROM CHANGELOG!**

**Task Summary Path Format:**
```
nova/aeon/trajectory-1.0.0/yield-0.x.x/SPRINTX_TASKX_SUMMARY.md
```

**Naming Convention**: Always use SPRINTX_TASKX_SUMMARY.md format (e.g., SPRINT1_TASK1_SUMMARY.md, SPRINT1_TASK2_SUMMARY.md)

**PURPOSE**: High-level overview of task completion for sprint tracking

**Include in TASK SUMMARY (HIGH-LEVEL):**
- Brief task objective (from SPRINT plan)
- Requirements checklist (✅/⏭️/❌)
- Key accomplishments (bullet points)
- Files created/modified (list only)
- Test results (pass/fail counts)
- Status (✅ Completed / ⏭️ Skipped)
- Reference to detailed changelog

**TASK SUMMARY should be CONCISE** - think of it as the executive summary that a project manager would read to understand task completion status.

**🚨 KEY DISTINCTION 🚨**:
- **CHANGELOG** = Detailed technical documentation (for developers)
- **TASK SUMMARY** = High-level status report (for project tracking)
- **BOTH ARE REQUIRED FOR EVERY TASK!**

### 5. Git Add & Commit (Conditional)

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

**Final Step Process (FOLLOW THIS ORDER EXACTLY):**

**🚨 CRITICAL ORDER 🚨**: CHANGELOG → TASK SUMMARY → GIT COMMIT

1. **FIRST**: Create DETAILED CHANGELOG - **MUST BE DONE BEFORE ANY GIT OPERATIONS**
   - Location: `nova/changelog/YYYYMMDD/TIME_HHMM-CHANGELOG.md`
   - Content: DETAILED technical documentation
   - Status: Use placeholder commit hash (TBD or N/A)

2. **SECOND**: Create HIGH-LEVEL TASK SUMMARY (for sprint tasks only)
   - Location: `nova/aeon/trajectory-1.0.0/yield-0.x.x/SPRINTX_TASKX_SUMMARY.md`
   - Content: CONCISE status report

3. **THIRD** (if sprint complete): Create sprint DOD summary
   - Location: `nova/aeon/trajectory-1.0.0/yield-0.x.x/SPRINTX_DOD_SUMMARY.md`

4. **FOURTH**: Verify checklist
   - ✅ Detailed Changelog created?
   - ✅ Task Summary created? (if sprint task)
   - ✅ DOD summary created? (if sprint complete)

5. **FIFTH**: Stage all files
   ```bash
   git add -A
   ```

6. **SIXTH**: Commit with SHORT message
   ```bash
   git commit -m "SprintX TaskY: brief description"
   ```
   - Keep message under 80 characters
   - Use SprintX TaskY format (NOT feat:/fix:/etc.)

7. **STOP HERE** - Do NOT create a second commit to update changelog with commit hash

**🚨 CRITICAL ORDER RULE 🚨**:
**ALL DOCUMENTATION MUST BE CREATED BEFORE ANY COMMIT!**
**DETAILED CHANGELOG → HIGH-LEVEL TASK SUMMARY → DOD SUMMARY (if applicable) → COMMIT**

**REMEMBER**: Two separate documents required for each task:
1. Detailed CHANGELOG in `nova/changelog/YYYYMMDD/TIME_HHMM-CHANGELOG.md`
2. High-level Summary in `nova/aeon/trajectory-1.0.0/yield-0.x.x/SPRINTX_TASKX_SUMMARY.md`

```bash
git add .
git commit -a -m "SprintX TaskY: <brief description>"
```

**🚨 CRITICAL RULE 🚨**: 
**ONLY ONE COMMIT PER USER PROMPT - NO EXCEPTIONS!**
**DO NOT UPDATE CHANGELOG WITH COMMIT HASH IN A SECOND COMMIT!**
**LEAVE CHANGELOG WITH PLACEHOLDER HASH - IT WILL BE UPDATED LATER!**

**Commit Message Format**: 
- **MUST** be one line only
- **MUST** be SHORT and concise (< 80 characters)
- **MUST** use format: `SprintX TaskY: brief description`
- **DO NOT** use conventional commit format (feat:, fix:, etc.)
- **EXAMPLE**: `Sprint3 Task1: Integrate Monaco Editor`
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

**Note**: For Novi project, examples might be:
- `git commit -m "Sprint1 Task2: Implement main process IPC"`
- `git commit -m "Sprint2 Task1: Add renderer UI components"`

### Changelog Format

# SprintX TaskY — YYYYMMDD.HHMM

## Summary
Short explanation of what was implemented or fixed.

## Files Changed
- src/main/main.ts — implemented main process handler
- src/tests/main.test.ts — added unit tests

## Reason
Establishes foundational main process and test coverage for Novi

## Git Commit Hash
`TBD` - SprintX TaskY Implementation

**NOTE**: Use `TBD` as placeholder - commit hash will be updated later

## Status
✅ Completed


## Safety & Validation Rules

AI Agent must never delete directories without confirmation.

Always include commit hash in changelog.

All generated TypeScript/JavaScript files must be syntactically valid and compile without errors.

Unit tests must run via the chosen test framework (Jest/Mocha/Vitest) without fatal errors.

The Electron application must build and run correctly after task completion.

## Development Environment

**IMPORTANT**: 
- Novi is an Electron application written in TypeScript/JavaScript
- Development is currently on Windows using PowerShell
- We may move to Linux in the future, but code should be cross-platform compatible
- Test framework must be chosen and configured if not already present

## Summary

Build/deploy steps: Electron application build process may be required.

Focus: Electron-based orchestration platform development.

Goal: Maintain structured commits, organized changelogs, and validated tests.
