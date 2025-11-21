# PWD Tracking Without PROMPT_COMMAND — 20251121.1317

## Summary
Refactored PWD tracking to parse bash prompt instead of modifying user's shell environment.

## Files Changed
- src/main/main.ts — Added PWD parsing from bash prompt in onData handler
- src/main/services/terminal-service.ts — Removed PROMPT_COMMAND modification
- src/renderer/components/App.tsx — Added terminalOnPwd listener
- src/renderer/components/Terminal.tsx — Removed PWD parsing from write()
- src/preload/preload.ts — Added terminalOnPwd and terminalRemovePwdListener
- src/types/global.d.ts — Added terminalOnPwd types

## Changes Made
1. **Removed PROMPT_COMMAND**: No longer modifies user's bash environment
2. **Parse Bash Prompt**: Extracts PWD from Git Bash prompt format "MINGW64 /c/path/to/dir"
3. **Separate IPC Channel**: Added 'terminal-pwd' IPC message for PWD updates
4. **Non-Intrusive**: User's shell experience unchanged, only passive monitoring

## How It Works
- Main process monitors PTY output for bash prompt lines
- Regex matches "MINGW64 /path" pattern from Git Bash prompts
- Sends PWD separately via IPC to update tab title
- No modification to user's shell configuration

## Reason
User correctly requested not to modify PROMPT_COMMAND as it affects their shell experience.

## Git Commit Hash
`TBD` - PWD tracking via prompt parsing

## Status
✅ Completed

