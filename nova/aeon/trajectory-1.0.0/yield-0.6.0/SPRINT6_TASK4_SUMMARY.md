# Sprint 6 Task 4 — Cleanup Tasks

## Objective
Complete the eight cleanup items listed in SPRINT6_PLAN.md Task 4.

## Completed Items

### 1. Remove Novi Agile from Application Menu
- Removed "Novi Agile" from the Novi section in **menu.ts** (main process) and **TitleBar.tsx** (renderer dropdown).
- Removed `novi-agile` from MenuCommand type and removed the handler case in App.tsx.

### 2. set vimode response on its own line
- In NoviShell (formerly NoviPrompt), when the user presses Enter with a command, the next `novi>` prompt is now written **after** the async command completes: `executeCommand(terminal, command).then(() => { currentLineRef.current = ''; writePrompt(terminal); })`. Empty command still writes the prompt immediately.

### 3. Prompt tag novi> (was nova>)
- The in-shell prompt was already `novi>` (writePrompt). Tab labels and defaults that showed `nova>` in App.tsx were updated to `⚙ novi>` (see item 4).

### 4. System icon next to novi> on the tab
- New and restored Novi Shell tabs use tab label **`⚙ novi>`** (gear icon + novi>).
- The `list` command in Novi Shell shows **⚙** for `novi-prompt` tabs (same as terminal uses 💻).

### 5. Remove open and save commands from Novi Shell
- Removed the `open` and `save` commands from the switch in executeCommand.
- Removed **commandOpen** and **commandSave** functions.
- Removed "open" and "save" from the help text.

### 6. set command help alignment
- In commandHelp, the line for `set` was given one extra space so it aligns with the other commands: `'  \x1b[33mset\x1b[0m          - Set options ...'`.

### 7. Rename Novi Prompt to Novi Shell
- **Component and file**: Renamed component **NoviPrompt** → **NoviShell**, **NoviPromptProps** → **NoviShellProps**. File **NoviPrompt.tsx** replaced by **NoviShell.tsx** (old file deleted).
- **Application menu**: "Novi Prompt" → "Novi Shell" in menu.ts and TitleBar.tsx.
- **UI strings**: Welcome text "Novi Shell v0.4.0"; status bar "Novi Shell ready" / "Failed to create Novi Shell"; welcome screen and FileTree context menu "▶️ Novi Shell".
- **Internal names**: State and workspace keys (noviPromptTabs, onNoviPrompt, openNoviPrompts) left as-is for workspace file compatibility.

### 8. Command Palette menu option
- Command Palette is not implemented (TODO in code). Per task: gray out the option.
- **menu.ts**: Command Palette item has **enabled: false**.
- **TitleBar.tsx**: Command Palette item has **disabled: true**; MenuItem type extended with `disabled?: boolean`; renderMenuItem grays out (opacity 0.5) and does not invoke the command when disabled.

## References
- **SPRINT6_PLAN.md** — Task 4 list.
- **Changelog**: `nova/changelog/20260212/TIME_2237-CHANGELOG.md`.
