# Changelog — 2026-03-05 17:45

## React Refactor Phase 0: Core Infrastructure

### Summary
Added foundational modules for the React-to-vanilla-TypeScript migration. These are purely additive — no existing code was changed.

### Files Added
- `src/renderer/core/event-bus.ts` — Typed pub/sub event bus for cross-component communication
- `src/renderer/core/component.ts` — Base class for vanilla DOM components with mount/unmount lifecycle and automatic cleanup
- `src/renderer/core/dom.ts` — Lightweight DOM helpers (`el()`, `clearChildren()`, `setStyles()`, `setVisible()`) for readable element creation without JSX
- `src/renderer/core/app-state.ts` — Shared application state store replacing React AppContext, emits events on changes
- `src/tests/core-0.7.0/event-bus.test.ts` — 10 tests for EventBus
- `src/tests/core-0.7.0/component.test.ts` — 9 tests for Component base class
- `src/tests/core-0.7.0/dom.test.ts` — 11 tests for DOM helpers
- `src/tests/core-0.7.0/app-state.test.ts` — 6 tests for AppStateStore
- `nova/trajectory-1.0.0/yield-0.7.x/REACT_REFACTOR_PLAN.md` — Full migration plan

### Test Results
- All 654 tests pass (36 suites), including 36 new tests across 4 new test files
- Zero failures

### Commit Hash
TBD
