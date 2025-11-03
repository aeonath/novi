# Lyric Testing Structure

## Overview
Lyric’s unit testing framework is organized **per sprint**, mirroring the project’s iterative development cycle.  
Each sprint introduces new functionality or refactors existing components, and its test suite serves as the validation layer for that sprint’s deliverables.

This model aligns with the MiraNova Rapid Sprint philosophy:
> Every sprint builds upon a validated foundation.  
> All prior sprints’ tests must continue to pass before a new sprint is considered complete.

---

## Directory Layout

```
lyric/tests/
├─ core-0.1.0/
├─ core-0.2.0/
├─ core-0.3.0/
└─ core-0.4.0/
```

### Folder Descriptions
- **core-0.x.x/**  
  Each folder represents the complete test suite for a given sprint version.  
  Tests validate all new or modified functionality introduced during that sprint.

Older sprint folders remain permanently in the repository as historical validation checkpoints.

### Implementation Decisions
- **Location**: Test directories are created within `lyric/tests/core-0.x.x/`
- **Migration Strategy**: Option B - Move existing tests and reorganize them by sprint functionality
- **Examples Directory**: Lyric source examples for testing live in `lyric/tests/examples/` (flat structure, no subfolders)
- **Version Targeting**: Unit tests for each sprint target the current sprint version number
- **Sprint Completion**: When a sprint is done, the directory contains all tests for that sprint and remains available for subsequent sprints

---

## Testing Philosophy
All tests across all sprints are executed together to ensure full regression stability.  
Prior sprints are implicitly shared — if an earlier feature breaks, its original tests will detect the regression.

There is no need for a `shared/` directory or global fixture set;  
the cumulative collection of sprint folders *is* the shared validation baseline.

---

## Running Tests

Run all tests (recommended):
```bash
pytest lyric/tests/
```

Run tests for a specific sprint:

```
pytest lyric/tests/core-0.3.0
```


Run a specific module:


```
pytest lyric/tests/core-0.3.0/test_types.py
```


## Older tests handling failures
If we make significant changes to the code older tests may need to be updated
to work with our changes

## THE GOAL
Our goal is to have all unit tests 100% passing at the end of each iteration (at the completion of each Task in a Sprint)


