# NOVA_WORKFLOW_SPECIFICATION.md

## Overview
This document defines the **standard Nova workflow model** used across all MiraNova Studios projects.  
It governs directory structure, AI agent behavior, sprint documentation, and changelog generation.  
Nova provides a human-first, AI-assisted development process that is predictable, transparent, and fully documented.

---

## 1. Core Philosophy

- **Human-readable control:** All configuration files are Markdown, not JSON or YAML.  
- **AI-assisted iteration:** Agents like Claude and ChatGPT operate automatically by reading project state, without needing user prompts.  
- **Deterministic documentation:** Every action, whether in-sprint or ad-hoc, is recorded in a structured changelog or sprint file.  
- **Predictable automation:** Nova infers context (mode, sprint, changelog location) based on directory structure.

---

## 2. Directory Architecture

project_root/
├── nova/
│ ├── config/
│ │ ├── developer_behavior.md
│ │ ├── architect_behavior.md
│ │ └── README.md
│ │
│ ├── sprints/
│ │ ├── sprint1/
│ │ │ ├── SPRINT1_PLAN.md
│ │ │ ├── SPRINT1_TASK1_SUMMARY.md
│ │ │ ├── SPRINT1_DOD_SUMMARY.md
│ │ │ ├── SPRINT1_SUPERNOVA.md
│ │ │ ├── SPRINT1_SUPERNOVA_REMEDIATION_SUMMARY.md
│ │ │ └── ...
│ │ ├── sprint2/
│ │ │ ├── SPRINT2_PLAN.md
│ │ │ └── ...
│ │ └── ...
│ │
│ ├── CHANGELOG/
│ │ ├── 20251018/
│ │ │ ├── TIME_1600_CHANGELOG.md
│ │ │ ├── TIME_1715_CHANGELOG.md
│ │ │ └── ...
│ │ └── 20251019/
│ │ └── TIME_0900_CHANGELOG.md
│ │
│ ├── state/
│ │ └── session_status.md
│ │
│ └── NOVA_WORKFLOW_SPECIFICATION.md


---

## 3. Configuration System

### 3.1 Human-Readable Markdown Configs
Nova uses plain Markdown files in `/nova/config/` for behavior control.  
This ensures settings are editable by hand, versioned in Git, and automatically parsed by the AI.

#### developer_behavior.md
Controls **Claude’s** operational mode.

Example:

```
Developer Behavior Configuration

Mode: FULL
Auto-Deploy: YES
Auto-Changelog: YES
Active-Sprint: 7
Build-Verification: ENABLED
Preferred-Agent: CLAUDE
Commit-Strategy: Concise
```

#### architect_behavior.md
Controls **ChatGPT’s** orchestration of sprints and documentation.

Example:
```
Architect Behavior Configuration

Sprint-Planning: ENABLED
Definition-of-Done: STRICT
Auto-Verification: YES
Preferred-Agent: CHATGPT
Documentation-Mode: DETAILED
```


---

## 4. Sprint Management

### 4.1 Structure
Each sprint lives in its own directory:  
`nova/sprints/sprintX/`

Files include:
- `SPRINTX_PLAN.md` — Objectives, tasks, scope.  
- `SPRINTX_TASK#.md` or `_SUMMARY.md` — Detailed per-task logs.  
- `SPRINTX_DOD_SUMMARY.md` — Verification summary.  
- `SPRINTX_SUPERNOVA.md` — Major incident or regression.  
- `SPRINTX_SUPERNOVA_REMEDIATION_SUMMARY.md` — Follow-up and resolution.

### 4.2 Process
1. Architect defines sprint plan.  
2. Developer agent (Claude) executes tasks sequentially.  
3. Each completed task generates a `TASK#_SUMMARY.md`.  
4. Once all tasks and verification steps are complete, the sprint is closed with a DOD summary.

---

## 5. Change Log System

### 5.1 Structure
All non-sprint or ad-hoc changes are stored in:
`nova/CHANGELOG/YYYYMMDD/TIME_HHMM_CHANGELOG.md`

Example path:

```
nova/CHANGELOG/20251018/TIME_1715_CHANGELOG.md
```

### 5.2 Format

Change Log — 2025-10-18 17:15
Summary

Refined Nova changelog directory structure to align with project standards.
Type

Non-sprint configuration change
Technical Details

    Adjusted directory hierarchy in nova/sprints/

    Updated Claude’s config reader to detect sprint paths dynamically.

Reason

To standardize Nova integration across Lyric, Nova, and MikoPoker.
Impact

Improved automation consistency and reduced manual maintenance.
Build Verification

✅ Build passed (0 errors)
Git Commit: 9a3f3b2


### 5.3 Integration with Sprints
Sprint summaries may reference associated changelog entries:


Out-of-Scope Adjustments

Refer to:

20251018/TIME_1600_CHANGELOG.md

20251018/TIME_1715_CHANGELOG.md


---

## 6. Iteration and Execution Flow

1. **Read Behavior Configs**  
   Nova reads `/nova/config/developer_behavior.md` to determine current mode:  
   - `FULL` = build, verify, changelog, commit  
   - `DEBUG` = build/test only, no commit  

2. **Execute AI Task**  
   Claude performs the assigned sprint task or ad-hoc change.

3. **Detect Change Context**  
   - Path under `/nova/sprints/sprint*/` → sprint task  
   - Path outside sprints → changelog event  

4. **Conditional Commit**  
   - If `Mode: FULL`, Nova writes changelog or sprint summary and commits.  
   - If `Mode: DEBUG`, skip commit, record result in `/nova/state/session_status.md`.

---

## 7. Nova Editor Integration (Future)

Once Nova IDE has AI, Monaco, and filesystem integration:

### Editor Panels
- **AI Control Panel**  
  Toggle mode (Full / Debug), open config, or view status.  
- **Sprint Panel**  
  Displays current sprint, task summaries, and status icons.  
- **Changelog Panel**  
  Lists daily changelogs with timestamps.

### Command Palette Actions
- `Nova: Toggle AI Mode`  
- `Nova: Run Sprint Task`  
- `Nova: Generate Changelog`  
- `Nova: View Session Status`

---

## 8. Benefits

| Area | Benefit |
|------|----------|
| **Developers** | Direct control through Markdown configs; no dialog interruptions. |
| **AI Agents** | Clear structure for mode inference and documentation. |
| **Management** | Comprehensive audit trail of all iterations. |
| **Automation** | Repeatable process with consistent file paths. |
| **Scalability** | Works identically across Lyric, Nova, and MikoPoker. |

---

## 9. Summary

This workflow establishes a **universal AI-assisted iteration model** for MiraNova projects.  
Nova acts as the operational backbone for sprint execution, changelog management, and behavioral control—  
bridging human intent, AI execution, and documentation into one cohesive process.

---

