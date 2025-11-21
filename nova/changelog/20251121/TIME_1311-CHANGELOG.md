# Terminal Icon and Dynamic PWD — 20251121.1311

## Summary
Added terminal icon to tabs and dynamic current working directory display.

## Files Changed
- src/renderer/components/App.tsx — Changed default terminal tab name to "💻 ~"
- src/renderer/components/Terminal.tsx — Added PWD parsing from terminal output to update tab title
- src/main/services/terminal-service.ts — Added PROMPT_COMMAND to print PWD

## Changes Made
1. **Terminal Icon**: Added 💻 emoji to terminal tabs
2. **Dynamic PWD Display**: Tab shows current directory name instead of "bash"
   - Initial tab name: "💻 ~"
   - Updates to "💻 dirname" when changing directories
   - Parses "pwd:/path/to/dir" from terminal output
   - Extracts last directory component for display

3. **PROMPT_COMMAND**: Added to bash environment
   - Executes `echo "pwd:$(pwd)"` before each prompt
   - Provides PWD info for tab title updates

## Reason
User requested terminal icon in tabs and dynamic working directory display instead of static "bash" text.

## Git Commit Hash
`TBD` - Terminal icon and dynamic PWD

## Status
✅ Completed

