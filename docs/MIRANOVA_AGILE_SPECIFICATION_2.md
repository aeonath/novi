# MiraNova Agile Specification

## Overview

The **MiraNova Agile Specification** defines the long-term organizational structure for all MiraNova and Lyric development.  
It was **conceived and designed by Michael "Aeonath" Emch**, who established the terminology and hierarchy of **Aeon → Trajectory → Yield** to describe the studio's iterative release process.

This framework blends *Agile discipline* with *MiraNova’s creative identity*, ensuring each stage of progress is both traceable and thematically coherent.

---

## 🔷 Hierarchical Model

### 1. **Aeon**
**Path:** `/nova/aeon/`

An **Aeon** represents the eternal span of the project — a continuous record of all major trajectories in Lyric's evolution that lasts the eternity of the project.  
The Aeon contains multiple **Trajectories**, each targeting a significant milestone or release goal.

Example:
```
/nova/aeon/
trajectory-0.9.1/
trajectory-1.0.0/
trajectory-2.0.0/
```


---

### 2. **Trajectory**
**Path:** `/nova/aeon/trajectory-x.x.x/`

A **Trajectory** is a focused path of development aimed at a specific *major* or *intermediate* release version.  
Each trajectory begins where the previous one concluded.

Example:

```
/nova/aeon/trajectory-0.9.1/
yield-0.1.0/
yield-0.2.0/
yield-0.3.0/
yield-0.3.4/
yield-0.9.1/
```


---

### 3. **Yield**
**Path:** `/nova/aeon/trajectory-x.x.x/yield-x.x.x/`

A **Yield** represents a single iteration of focused work — what would traditionally be called a *sprint*.  
Each Yield directory contains the planning, execution, and completion artifacts that produced a specific version of the system.

Example:

```
/nova/aeon/trajectory-0.9.1/yield-0.3.0/
SPRINT3_PLAN.md
SPRINT3_TASK1_SUMMARY.md
SPRINT3_DOD_SUMMARY.md
SPRINT3_CODE_REVIEW.md
```


---

## 🧭 Versioning Philosophy

| Prefix | Example | Meaning |
|---------|----------|---------|
| `dev-` | `dev-0.3.0` | Internal milestone tags during development |
| `alpha-` | `alpha-0.9.1` | Public early preview (feature-complete but unstable) |
| `beta-` | `beta-0.9.5` | Wider testing before a major version |
| `rel-` | `rel-1.0.0` | Stable public release milestone |
| `fix-` | `fix-1.0.1` | Minor hotfix or patch release |

Each Yield corresponds to one of these tag states in Git.  
Collectively, the Yields within a Trajectory lead up to that Trajectory’s final milestone tag.

---

## 🌌 Example: Active Aeon Layout
```
/nova
/aeon
README.md
/trajectory-0.9.1
yield-0.1.0/ → early syntax prototype
yield-0.2.0/ → interpreter foundation
yield-0.3.0/ → type system integration
yield-0.3.4/ → lazy proxy & reflection
yield-0.9.1/ → public alpha build
alpha-0.9.1 tag
/trajectory-1.0.0
yield-0.9.5/ → pre-beta polish
yield-0.9.9/ → beta testing & stability
yield-1.0.0/ → first stable release
rel-1.0.0 tag
```


---

## 🌱 Terminology Summary

| Term | Meaning |
|------|----------|
| **Aeon** | The eternal span of Lyric's evolution — all trajectories combined, lasting the eternity of the project |
| **Trajectory** | A development cycle leading toward a major or intermediate release |
| **Yield** | A discrete iteration (formerly “sprint”) that produces a new version |
| **Version Tag** | The Git label marking a yield or release milestone |
| **DoD** | Definition of Done document marking yield completion |
| **Plan** | The blueprint for work performed during that yield |


### ⚠️ NOVA and SUPERNOVA Events

| Event | Scope | Description | Typical Response |
|--------|--------|--------------|------------------|
| **NOVA** | Localized failure | A single catastrophic defect (e.g., infinite loop or control flow bug) that halts yield progression but remains contained. | Isolate, debug, and resume trajectory once fixed. |
| **SUPERNOVA** | Systemic failure | A full regression or multi-module breakdown (e.g., parser, CLI, and type system failing simultaneously). | Freeze all development, run rollback analysis, and perform structured remediation. |

### 🔁 Pivot

A **Pivot** is a short, focused deviation from the main sprint plan.  
It’s used to address an unexpected issue, explore an idea, or implement a targeted improvement that directly supports the sprint’s objectives without creating a new yield.

Pivots are documented as `PIVOTx.y_SUMMARY.md` files within the active yield directory and merge back into the sprint’s Definition of Done once complete.

> **Purpose:** Adapt quickly without breaking momentum.


### 🚀 Sprint

A **Sprint** is a structured development cycle composed of **small, iterable tasks** executed by both human and AI contributors.  
Each sprint represents a focused, time-bound effort toward delivering a measurable improvement to the system — such as a feature, subsystem, or stability milestone.

In MiraNova’s process model, sprints are:
- **Atomic:** Each sprint delivers one cohesive version increment.
- **AI-Driven:** Tasks are intentionally small and modular to enable rapid iteration with AI assistance.
- **Traceable:** Every sprint contains its plan, task summaries, and a Definition of Done (DoD).
- **Yield-Producing:** When complete, the sprint’s output becomes a new yield (e.g., `yield-0.3.0`).

> **Purpose:**  
> To create a repeatable loop of ideation, implementation, and validation — enabling AI-assisted development to evolve predictably and transparently.


All NOVA and SUPERNOVA events are recorded in their respective trajectory under `NOVA_EVENTS.md` or `SUPERNOVA_REMEDIATION.md`.  

> **Symbolism:**  
> - *NOVA* — a contained eruption, forcing correction and refinement.  
> - *SUPERNOVA* — a total collapse, demanding systemic renewal.


---

## ✨ Design Philosophy

The Aeon System ensures that every step in Lyric's evolution is transparent, traceable, and meaningful —  
from internal dev builds to public releases — forming a complete living history of MiraNova’s development journey.

---

**Authors:** Michael (Aeonath) Emch and ChatGPT
**Architectural Documentation:** Michael and ChatGPT  
**Engineering Implementation:** Claude  
**Last Updated:** October 2025

