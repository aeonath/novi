# Sprint 6 Task 1 — Summary

## Task objective
Rebrand Nova as Novi: anywhere we refer to Nova use Novi; anywhere we refer to Nova IDE use Novi Editor. Do not change the `./nova` directory name. Scope: `src/`, `package.json`, `tsconfig.json`, Jest config if necessary.

## Requirements checklist
- ✅ All source files in `src/` checked and updated (Nova → Novi, Nova IDE → Novi Editor)
- ✅ package.json updated (name, description, productName, appId)
- ✅ tsconfig.json reviewed (no Nova references)
- ✅ Jest config reviewed (no changes needed)
- ✅ Unit tests updated and passing
- ✅ `./nova` directory name unchanged

## Key accomplishments
- Renamed component NovaPrompt → NoviPrompt (file NoviPrompt.tsx); updated all imports and references
- Rebranded menu commands and labels (novi-prompt, novi-agile, Novi, Novi Prompt, Novi Agile, About Novi)
- Updated workspace state and config: openNoviPrompts, openNoviPrompts=; backward compatibility for openNovaPrompts when loading
- Rebranded themes: nova-light/nova-dark → novi-light/novi-dark; applyNovaTheme → applyNoviTheme
- Rebranded events: nova-close-context-menus → novi-close-context-menus
- Updated all tests and extension-loader/renderer log prefixes to [Novi]

## Files created/modified
- package.json, src/main/main.ts, menu.ts, workspace-service.ts
- src/types/global.d.ts
- src/renderer/components: NoviPrompt.tsx (new), App.tsx, FileTree.tsx, TabBar.tsx, MonacoEditor.tsx, Terminal.tsx, TitleBar.tsx; NovaPrompt.tsx (removed)
- src/renderer/index.tsx, editor/monaco-editor.ts, services/editor-service.ts
- src/core/extension-loader.ts
- src/tests: packaging.test.ts, monaco-editor.test.ts, editor-service.test.ts, workspace-service.test.ts, extension-loader.test.ts

## Test results
- 29 test suites passed, 574 tests passed, 0 failed

## Status
✅ Completed

## Reference
Detailed changelog: `nova/changelog/20260212/TIME_2142-CHANGELOG.md`
