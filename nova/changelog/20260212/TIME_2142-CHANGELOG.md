# Sprint6 Task1 — Rebrand Nova as Novi — 20260212.2142

## Summary
Rebranded the Nova IDE as the Novi Editor across all source code, package.json, and unit tests. All user-facing and code references to "Nova" (product) and "Nova IDE" now use "Novi" and "Novi Editor". The `./nova` directory name was left unchanged per task requirements.

## Files Changed

### package.json
- `name`: "nova" → "novi"
- `description`: "Nova AI IDE" → "Novi Editor"
- `build.productName`: "Nova" → "Novi"
- `build.appId`: "studio.miranova.nova" → "studio.miranova.novi"

### Main process
- **src/main/main.ts** — `setAppUserModelId('com.miranova.nova')` → `'studio.miranova.novi'`
- **src/main/menu.ts** — Menu commands and labels: 'nova-prompt'/'nova-agile' → 'novi-prompt'/'novi-agile'; "Nova", "Nova Prompt", "Nova Agile", "About Nova" → "Novi", "Novi Prompt", "Novi Agile", "About Novi"
- **src/main/services/workspace-service.ts** — `WorkspaceState.openNovaPrompts` → `openNoviPrompts`; config key `openNovaPrompts=` → `openNoviPrompts=`; prompt name 'nova>' → 'novi>'; load supports both keys for backward compatibility
- **src/main/services/terminal-service.ts** — (no Nova references; unchanged)

### Types
- **src/types/global.d.ts** — `openNovaPrompts` → `openNoviPrompts`; `'nova-prompt'` → `'novi-prompt'`

### Renderer
- **src/renderer/components/NovaPrompt.tsx** — Renamed to **NoviPrompt.tsx**; component and interface NovaPrompt/NoviPromptProps; all strings "Nova" → "Novi", "Nova IDE" → "Novi Editor"; events `nova-close-context-menus` → `novi-close-context-menus`; prompt prefix `nova>` → `novi>`
- **src/renderer/components/App.tsx** — Import NoviPrompt; all `nova-prompt`, `openNovaPrompts`, `novaPromptTabs`, `onNovaPrompt`, "Nova Prompt", "Nova Agile", "Nova" (welcome), `nova-layout` → Novi equivalents
- **src/renderer/components/FileTree.tsx** — `onNoviPrompt`, `novi-close-context-menus`, "▶️ Novi Prompt"
- **src/renderer/components/TabBar.tsx** — `'novi-prompt'` in type and logic
- **src/renderer/components/MonacoEditor.tsx** — "Novi themes", `defineNoviThemes`, `novi-light`/`novi-dark`, "Novi's custom", `novi-close-context-menus`
- **src/renderer/components/Terminal.tsx** — `novi-close-context-menus`
- **src/renderer/components/TitleBar.tsx** — title "Novi Editor"; menu "Novi", "Novi Prompt", "Novi Agile", "About Novi"; logo alt "Novi Editor"
- **src/renderer/index.tsx** — "[Novi]" in logs; "Novi Editor" in init message; `novi-prompt` tab type
- **src/renderer/editor/monaco-editor.ts** — theme names `novi-light`/`novi-dark`; `applyNoviTheme`; comment "Apply Novi theme"
- **src/renderer/services/editor-service.ts** — `setModelMarkers` owner 'nova' → 'novi'

### Core
- **src/core/extension-loader.ts** — All log prefixes "[Nova]" → "[Novi]"

### Tests
- **src/tests/core-0.1.0/packaging.test.ts** — Expectations productName "Novi", appId "studio.miranova.novi"
- **src/tests/core-0.3.0/monaco-editor.test.ts** — "Novi Theme", `novi-light`/`novi-dark`, `applyNoviTheme`
- **src/tests/core-0.4.0/editor-service.test.ts** — setModelMarkers owner 'novi'
- **src/tests/core-0.4.0/workspace-service.test.ts** — `openNoviPrompts`, `openNoviPrompts=`, 'novi>'
- **src/tests/core-0.5.0/extension-loader.test.ts** — "[Novi]" in expected log strings and regex

## Reason
Sprint 6 Task 1: Rebrand the Nova IDE as the Novi Editor for product identity. Only `src/`, `package.json`, and `tsconfig.json` (and Jest config if needed) were in scope; `./nova` directory name unchanged.

## Test Results
- `npm test` — 29 suites, 574 tests passed, 0 failed.

## Git Commit Hash
`TBD` — Sprint6 Task1 Implementation

## Status
✅ Completed
