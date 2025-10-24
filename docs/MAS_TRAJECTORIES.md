# Nova Trajectory 0.9.1 Directory

The **`/nova/arcs/trajectory-0.9.1/`** directory contains the full record of Nova's AI-driven sprint history for Trajectory 0.9.1 — including plans, task summaries, definitions of done, and retrospectives.  
Each yield lives in its **own subdirectory** named after the target version (e.g. `yield-0.1.0/`, `yield-0.2.0/`, etc.) to maintain organization, readability, and automation-friendly consistency.

This trajectory represents the complete development cycle leading to Lyric version 0.9.1 (alpha release).

---

## 🧭 Directory Structure

```
/nova/arcs/trajectory-0.9.1/
├── yield-0.1.0/
│ ├── SPRINT1_PLAN.md
│ ├── SPRINT1_TASK1_SUMMARY.md
│ ├── SPRINT1_TASK2_SUMMARY.md
│ ├── SPRINT1_DOD_SUMMARY.md
│ └── README.md
├── yield-0.2.0/
│ ├── SPRINT2_PLAN.md
│ ├── SPRINT2_TASK1_SUMMARY.md
│ ├── SPRINT2_TASK2_SUMMARY.md
│ ├── SPRINT2_TASK3_SUMMARY.md
│ ├── SPRINT2_DOD_SUMMARY.md
│ └── README.md
├── yield-0.3.0/
│ └── ...
├── yield-0.3.4/
│ └── SPRINT3_PLAN_PART_2.md
└── README.md ← (this file)
```


---

## 🧩 File Naming Convention

All sprint files follow a standardized format for easy parsing by Nova:

| File | Purpose |
|------|----------|
| **SPRINT_PLAN.md** | Outlines the sprint goals, tasks, and acceptance criteria. Created before iteration begins. |
| **SPRINT_TASK#_SUMMARY.md** | Summarizes the implementation and results of a specific task within the sprint. Each major unit of work receives one. |
| **SPRINT_DOD_SUMMARY.md** | “Definition of Done” summary. Verifies deliverables, test results, and documentation compliance before the sprint closes. |
| **README.md** | Optional sprint-specific overview or notes (especially for pivots or NOVA remediation events). |

---

## ⚙️ Automation Notes

When **Nova** runs in full orchestration mode, it will:

1. Create a new sprint subdirectory automatically (`sprintN/`) from a template.
2. Read and populate `SPRINT_PLAN.md` with goals and acceptance criteria.
3. Append task summaries (`SPRINT_TASKx_SUMMARY.md`) as Claude completes each iteration.
4. Generate `SPRINT_DOD_SUMMARY.md` once all tasks are verified.
5. Tag and archive the sprint before beginning the next.

---


## 📜 Naming and Versioning

- Yield directories are named after their target version: `yield-0.1.0/`, `yield-0.2.0/`, `yield-0.3.0/`, `yield-0.3.4/`, etc.
- Each yield directly targets a specific release milestone (e.g., yield-0.3.4 targets version 0.3.4)
- Tags and changelog entries in Git will reference yield completion (e.g. `dev-core@SPRINT1_COMPLETE`).
- Major NOVA events (e.g. SUPERNOVA or PIVOT) will have their own markdown notes inside the relevant yield folder.

---

## 🧩 Example: `yield-0.1.0/` Contents

```
yield-0.1.0/
├── SPRINT1_PLAN.md
├── SPRINT1_TASK1_SUMMARY.md
├── SPRINT1_TASK2_SUMMARY.md
├── SPRINT1_DOD_SUMMARY.md
└── README.md
```


---

## 🧭 Future Integration

Once Nova is fully operational, it will:

- Parse this directory structure automatically.
- Populate sprints dynamically based on `CLAUDE_CONFIG.md`.
- Validate consistency between `SPRINT_PLAN.md` and `SPRINT_DOD_SUMMARY.md`.
- Auto-tag completed sprints in Git.

---

**“Build. Learn. Iterate.” — MiraNova Studios**

