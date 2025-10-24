# Nova Trajectory 2.0.0 Directory

The **`/nova/arcs/trajectory-2.0.0/`** directory contains the full record of Nova's AI-driven sprint history for Trajectory 2.0.0 — including plans, task summaries, definitions of done, and retrospectives.  
Each sprint lives in its **own subdirectory** named after the target version (e.g. `sprint-1.1.0/`, `sprint-1.2.0/`, etc.) to maintain organization, readability, and automation-friendly consistency.

This trajectory represents the complete development cycle leading to Lyric version 2.0.0.

---

## 🧭 Directory Structure

```
/nova/arcs/trajectory-2.0.0/
├── sprint-1.1.0/
│ └── SPRINT4_PLAN.md
├── sprint-1.2.0/
│ └── SPRINT5_PLAN.md
├── sprint-1.3.0/
│ └── SPRINT6_PLAN.md
├── sprint-1.4.0/
│ └── SPRINT7_PLAN.md
├── sprint-1.5.0/
│ └── SPRINT8_PLAN.md
└── README.md ← (this file)
```

---

## 🧩 File Naming Convention

All sprint files follow a standardized format for easy parsing by Nova:

| File | Purpose |
|------|----------|
| **SPRINT_PLAN.md** | Outlines the sprint goals, tasks, and acceptance criteria. Created before iteration begins. |
| **SPRINT_TASK#_SUMMARY.md** | Summarizes the implementation and results of a specific task within the sprint. Each major unit of work receives one. |
| **SPRINT_DOD_SUMMARY.md** | "Definition of Done" summary. Verifies deliverables, test results, and documentation compliance before the sprint closes. |
| **README.md** | Optional sprint-specific overview or notes (especially for pivots or NOVA remediation events). |

---

## ⚙️ Automation Notes

When **Nova** runs in full orchestration mode, it will:

1. Create a new sprint subdirectory automatically (`sprint-X.Y.Z/`) from a template.
2. Read and populate `SPRINT_PLAN.md` with goals and acceptance criteria.
3. Append task summaries (`SPRINT_TASKx_SUMMARY.md`) as Claude completes each iteration.
4. Generate `SPRINT_DOD_SUMMARY.md` once all tasks are verified.
5. Tag and archive the sprint before beginning the next.

---

## 🧠 Historical Context

Earlier Lyric development stored all sprint files flatly in `/docs/` (e.g. `SPRINT3_TASK1_SUMMARY.md`).
This trajectory-based system introduces clarity, automation readiness, and improved traceability.
Each sprint is now self-contained — including its plan, implementation notes, and verification logs.

The trajectory structure allows for clear version targeting, with each trajectory representing a complete development cycle leading to a specific release milestone.

---

## 📜 Naming and Versioning

- Sprint directories are named after their target version: `sprint-1.1.0/`, `sprint-1.2.0/`, `sprint-1.3.0/`, etc.
- Each sprint directly targets a specific release milestone (e.g., sprint-1.2.0 targets version 1.2.0)
- Tags and changelog entries in Git will reference sprint completion (e.g. `dev-core@SPRINT4_COMPLETE`).
- Major NOVA events (e.g. SUPERNOVA or PIVOT) will have their own markdown notes inside the relevant sprint folder.

---

## 🧩 Example: `sprint-1.1.0/` Contents

```
sprint-1.1.0/
├── SPRINT4_PLAN.md
├── SPRINT4_TASK1_SUMMARY.md
├── SPRINT4_TASK2_SUMMARY.md
├── SPRINT4_DOD_SUMMARY.md
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

**"Build. Learn. Iterate." — MiraNova Studios**
