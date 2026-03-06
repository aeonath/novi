# Changelog — 2026-03-05 20:16

## Phase 5: Strip React dependency entirely

### Summary
Removed React, ReactDOM, and all related type packages from the project. Updated tsconfig, build config, and CLAUDE.md to reflect the new vanilla TypeScript architecture. Novi no longer depends on any UI framework.

### Files Changed
- **`package.json`** — Removed `react`, `react-dom` from dependencies; removed `@types/react`, `@types/react-dom`, `@testing-library/react` from devDependencies. 17 packages removed from node_modules.
- **`package-lock.json`** — Updated by npm install (React dependency tree pruned).
- **`tsconfig.renderer.json`** — Removed `"jsx": "react"` setting and `.test.tsx` from exclude patterns.
- **`scripts/build-renderer.js`** — Already updated in Phase 4 (entry point changed, JSX config removed). Linter-formatted whitespace preserved.
- **`CLAUDE.md`** — Updated project description ("Electron and TypeScript" instead of "Electron, React, and TypeScript"), architecture diagrams (`.ts` files instead of `.tsx`), component system documentation, state management docs (appState singleton instead of AppContext), testing section, import conventions example, and copyright header rule.

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds (tsc + esbuild + asset copy)
- Renderer bundle: 6.8MB (includes Monaco Editor assets)

### Commit Hash
TBD
