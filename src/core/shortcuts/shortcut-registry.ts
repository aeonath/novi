/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Static registry of every user-configurable keyboard shortcut in Novi, plus
 * pure helpers for resolving the effective (default-or-overridden) binding
 * and detecting conflicts. No DOM/Electron dependency — safe to unit test
 * and to import from both the main and renderer processes.
 */

export type ShortcutCategory = 'novi' | 'editorTerminal';

export interface ShortcutDef {
  /** Stable id used as the settings-override key. Never rename once shipped. */
  id: string;
  category: ShortcutCategory;
  label: string;
  description?: string;
  /** Electron accelerator format, e.g. "CmdOrCtrl+Shift+N". */
  defaultAccelerator: string;
  /** Present when this entry also maps to a real Monaco editor command id. */
  monacoCommandId?: string;
}

export interface ShortcutCategorySettings {
  useDefaults: boolean;
  /** commandId -> accelerator override, or null for "explicitly unbound". */
  overrides: Record<string, string | null>;
}

export interface KeyboardShortcutsSettings {
  novi: ShortcutCategorySettings;
  editorTerminal: ShortcutCategorySettings;
}

export function defaultShortcutCategorySettings(): ShortcutCategorySettings {
  return { useDefaults: true, overrides: {} };
}

export function defaultKeyboardShortcutsSettings(): KeyboardShortcutsSettings {
  return {
    novi: defaultShortcutCategorySettings(),
    editorTerminal: defaultShortcutCategorySettings(),
  };
}

/**
 * Novi (app-level) shortcuts — commands that mean the same thing regardless
 * of which tab/context is focused. Only commands that already have a real
 * default binding are listed (there's no "default" to override otherwise).
 */
export const NOVI_SHORTCUTS: ShortcutDef[] = [
  { id: 'new-file', category: 'novi', label: 'New File', defaultAccelerator: 'CmdOrCtrl+N' },
  { id: 'open-file', category: 'novi', label: 'Open File', defaultAccelerator: 'CmdOrCtrl+O' },
  { id: 'close-file', category: 'novi', label: 'Close File', defaultAccelerator: 'CmdOrCtrl+W' },
  // menu.ts branches this to 'Cmd+Q' on macOS at the actual OS-accelerator layer;
  // this module has no `process` access in the renderer, and the target
  // platform for this app is Windows, so the registry's reference default is Alt+F4.
  { id: 'exit', category: 'novi', label: 'Exit', defaultAccelerator: 'Alt+F4' },
  { id: 'toggle-fullscreen', category: 'novi', label: 'Toggle Full Screen', defaultAccelerator: 'F11' },
  { id: 'zoom-in', category: 'novi', label: 'Zoom In (App)', description: 'Zooms the whole app window, not the editor', defaultAccelerator: 'CmdOrCtrl+=' },
  { id: 'zoom-out', category: 'novi', label: 'Zoom Out (App)', description: 'Zooms the whole app window, not the editor', defaultAccelerator: 'CmdOrCtrl+-' },
  { id: 'zoom-reset', category: 'novi', label: 'Reset Zoom (App)', defaultAccelerator: 'CmdOrCtrl+0' },
  { id: 'settings', category: 'novi', label: 'Open Settings', defaultAccelerator: 'CmdOrCtrl+,' },
  { id: 'new-terminal', category: 'novi', label: 'New Terminal', defaultAccelerator: 'CmdOrCtrl+`' },
  { id: 'toggle-devtools', category: 'novi', label: 'Toggle Developer Tools', defaultAccelerator: 'CmdOrCtrl+Shift+I' },
  { id: 'reload-file', category: 'novi', label: 'Reload File from Disk', defaultAccelerator: 'CmdOrCtrl+R' },
  { id: 'git-refresh', category: 'novi', label: 'Refresh Git Status', defaultAccelerator: 'CmdOrCtrl+Shift+G' },
  { id: 'cycle-tab-next', category: 'novi', label: 'Cycle to Next Tab', defaultAccelerator: 'CmdOrCtrl+Tab' },
  { id: 'cycle-tab-prev', category: 'novi', label: 'Cycle to Previous Tab', defaultAccelerator: 'CmdOrCtrl+Shift+Tab' },
];

/**
 * Terminal + Editor shortcuts — combined into one section because several
 * commands (Copy, Paste, Select All, etc.) are a single shared binding that
 * must behave identically whether a file/image tab or a terminal tab is
 * focused. `monacoCommandId`, when present, is also applied to Monaco's own
 * keybinding table (phase 3's addKeybindingRules wiring) so Monaco's
 * internal default un-registers when the user rebinds the shared command.
 */
export const EDITOR_TERMINAL_SHORTCUTS: ShortcutDef[] = [
  { id: 'save', category: 'editorTerminal', label: 'Save', defaultAccelerator: 'CmdOrCtrl+S' },
  { id: 'save-as', category: 'editorTerminal', label: 'Save As', defaultAccelerator: 'CmdOrCtrl+Shift+S' },
  { id: 'undo', category: 'editorTerminal', label: 'Undo', defaultAccelerator: 'CmdOrCtrl+Z', monacoCommandId: 'undo' },
  { id: 'redo', category: 'editorTerminal', label: 'Redo', defaultAccelerator: 'CmdOrCtrl+Y', monacoCommandId: 'redo' },
  { id: 'cut', category: 'editorTerminal', label: 'Cut', defaultAccelerator: 'CmdOrCtrl+X', monacoCommandId: 'editor.action.clipboardCutAction' },
  { id: 'copy', category: 'editorTerminal', label: 'Copy', defaultAccelerator: 'CmdOrCtrl+C', monacoCommandId: 'editor.action.clipboardCopyAction' },
  { id: 'paste', category: 'editorTerminal', label: 'Paste', defaultAccelerator: 'CmdOrCtrl+V', monacoCommandId: 'editor.action.clipboardPasteAction' },
  { id: 'find', category: 'editorTerminal', label: 'Find', description: 'Editor only — no find UI in the terminal', defaultAccelerator: 'CmdOrCtrl+F', monacoCommandId: 'actions.find' },
  { id: 'replace', category: 'editorTerminal', label: 'Replace', description: 'Editor only — no replace UI in the terminal', defaultAccelerator: 'CmdOrCtrl+H', monacoCommandId: 'editor.action.startFindReplaceAction' },
  { id: 'select-all', category: 'editorTerminal', label: 'Select All', defaultAccelerator: 'CmdOrCtrl+A', monacoCommandId: 'editor.action.selectAll' },
  {
    id: 'increase-font-size', category: 'editorTerminal', label: 'Increase Font Size',
    description: 'Distinct from Zoom In under Novi, which resizes the whole app window',
    defaultAccelerator: 'CmdOrCtrl+Shift+=',
  },
  {
    id: 'decrease-font-size', category: 'editorTerminal', label: 'Decrease Font Size',
    description: 'Distinct from Zoom Out under Novi, which resizes the whole app window',
    defaultAccelerator: 'CmdOrCtrl+Shift+-',
  },
  {
    id: 'reset-font-size', category: 'editorTerminal', label: 'Reset Font Size',
    description: 'Distinct from Reset Zoom under Novi, which resizes the whole app window',
    defaultAccelerator: 'CmdOrCtrl+Shift+0',
  },
];

/**
 * Monaco's own built-in editor commands, mined directly from monaco-editor's
 * source (not guessed) rather than Monaco's public API, which has no way to
 * enumerate its defaults. Scope deliberately trimmed from the full set
 * found:
 *  - Excludes two-key chord defaults (e.g. "Ctrl+K Ctrl+C") — Electron's
 *    accelerator string format, used everywhere else in this registry for
 *    storage/display/conflict-checking, has no chord representation.
 *  - Excludes commands Monaco itself ships with no default keybinding
 *    (nothing to "override").
 *  - Excludes bare internal commands with no user-facing label (e.g. the
 *    find widget's internal replace-one/replace-all commands, core cursor
 *    commands like cursorWordLeft) — not meant to be surfaced individually.
 * All apply only while a file/image tab is focused (Editor only — no
 * terminal equivalent), unlike the app-defined shared shortcuts above.
 */
const MONACO_BUILTIN_SHORTCUTS: ShortcutDef[] = [
  // Find
  { id: 'monaco-find-next', category: 'editorTerminal', label: 'Find Next', description: 'Editor only', defaultAccelerator: 'F3', monacoCommandId: 'editor.action.nextMatchFindAction' },
  { id: 'monaco-find-previous', category: 'editorTerminal', label: 'Find Previous', description: 'Editor only', defaultAccelerator: 'Shift+F3', monacoCommandId: 'editor.action.previousMatchFindAction' },
  { id: 'monaco-find-next-selection', category: 'editorTerminal', label: 'Find Next Selection', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+F3', monacoCommandId: 'editor.action.nextSelectionMatchFindAction' },
  { id: 'monaco-find-previous-selection', category: 'editorTerminal', label: 'Find Previous Selection', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Shift+F3', monacoCommandId: 'editor.action.previousSelectionMatchFindAction' },

  // Line operations
  { id: 'monaco-copy-line-up', category: 'editorTerminal', label: 'Copy Line Up', description: 'Editor only', defaultAccelerator: 'Shift+Alt+Up', monacoCommandId: 'editor.action.copyLinesUpAction' },
  { id: 'monaco-copy-line-down', category: 'editorTerminal', label: 'Copy Line Down', description: 'Editor only', defaultAccelerator: 'Shift+Alt+Down', monacoCommandId: 'editor.action.copyLinesDownAction' },
  { id: 'monaco-move-line-up', category: 'editorTerminal', label: 'Move Line Up', description: 'Editor only', defaultAccelerator: 'Alt+Up', monacoCommandId: 'editor.action.moveLinesUpAction' },
  { id: 'monaco-move-line-down', category: 'editorTerminal', label: 'Move Line Down', description: 'Editor only', defaultAccelerator: 'Alt+Down', monacoCommandId: 'editor.action.moveLinesDownAction' },
  { id: 'monaco-delete-line', category: 'editorTerminal', label: 'Delete Line', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Shift+K', monacoCommandId: 'editor.action.deleteLines' },
  { id: 'monaco-indent-line', category: 'editorTerminal', label: 'Indent Line', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+]', monacoCommandId: 'editor.action.indentLines' },
  { id: 'monaco-outdent-line', category: 'editorTerminal', label: 'Outdent Line', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+[', monacoCommandId: 'editor.action.outdentLines' },
  { id: 'monaco-insert-line-above', category: 'editorTerminal', label: 'Insert Line Above', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Shift+Return', monacoCommandId: 'editor.action.insertLineBefore' },
  { id: 'monaco-insert-line-below', category: 'editorTerminal', label: 'Insert Line Below', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Return', monacoCommandId: 'editor.action.insertLineAfter' },

  // Commenting
  { id: 'monaco-toggle-line-comment', category: 'editorTerminal', label: 'Toggle Line Comment', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+/', monacoCommandId: 'editor.action.commentLine' },
  { id: 'monaco-toggle-block-comment', category: 'editorTerminal', label: 'Toggle Block Comment', description: 'Editor only', defaultAccelerator: 'Shift+Alt+A', monacoCommandId: 'editor.action.blockComment' },

  // Multi-cursor
  { id: 'monaco-add-cursor-above', category: 'editorTerminal', label: 'Add Cursor Above', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Alt+Up', monacoCommandId: 'editor.action.insertCursorAbove' },
  { id: 'monaco-add-cursor-below', category: 'editorTerminal', label: 'Add Cursor Below', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Alt+Down', monacoCommandId: 'editor.action.insertCursorBelow' },
  { id: 'monaco-add-cursors-to-line-ends', category: 'editorTerminal', label: 'Add Cursors to Line Ends', description: 'Editor only', defaultAccelerator: 'Shift+Alt+I', monacoCommandId: 'editor.action.insertCursorAtEndOfEachLineSelected' },
  { id: 'monaco-add-selection-to-next-find-match', category: 'editorTerminal', label: 'Add Selection to Next Find Match', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+D', monacoCommandId: 'editor.action.addSelectionToNextFindMatch' },
  { id: 'monaco-select-all-occurrences', category: 'editorTerminal', label: 'Select All Occurrences of Find Match', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Shift+L', monacoCommandId: 'editor.action.selectHighlights' },
  { id: 'monaco-change-all-occurrences', category: 'editorTerminal', label: 'Change All Occurrences', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+F2', monacoCommandId: 'editor.action.changeAll' },

  // Navigation
  { id: 'monaco-go-to-line', category: 'editorTerminal', label: 'Go to Line/Column…', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+G', monacoCommandId: 'editor.action.gotoLine' },
  { id: 'monaco-go-to-bracket', category: 'editorTerminal', label: 'Go to Bracket', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Shift+\\', monacoCommandId: 'editor.action.jumpToBracket' },

  // Folding
  { id: 'monaco-fold', category: 'editorTerminal', label: 'Fold', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Shift+[', monacoCommandId: 'editor.fold' },
  { id: 'monaco-unfold', category: 'editorTerminal', label: 'Unfold', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Shift+]', monacoCommandId: 'editor.unfold' },

  // Formatting
  { id: 'monaco-format-document', category: 'editorTerminal', label: 'Format Document', description: 'Editor only', defaultAccelerator: 'Shift+Alt+F', monacoCommandId: 'editor.action.formatDocument' },

  // Suggest / navigation / misc
  { id: 'monaco-trigger-suggest', category: 'editorTerminal', label: 'Trigger Suggest', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Space', monacoCommandId: 'editor.action.triggerSuggest' },
  { id: 'monaco-trigger-parameter-hints', category: 'editorTerminal', label: 'Trigger Parameter Hints', description: 'Editor only', defaultAccelerator: 'CmdOrCtrl+Shift+Space', monacoCommandId: 'editor.action.triggerParameterHints' },
  { id: 'monaco-rename-symbol', category: 'editorTerminal', label: 'Rename Symbol', description: 'Editor only', defaultAccelerator: 'F2', monacoCommandId: 'editor.action.rename' },
  { id: 'monaco-go-to-definition', category: 'editorTerminal', label: 'Go to Definition', description: 'Editor only', defaultAccelerator: 'F12', monacoCommandId: 'editor.action.revealDefinition' },
  { id: 'monaco-peek-definition', category: 'editorTerminal', label: 'Peek Definition', description: 'Editor only', defaultAccelerator: 'Alt+F12', monacoCommandId: 'editor.action.peekDefinition' },
  { id: 'monaco-command-palette', category: 'editorTerminal', label: 'Editor Command Palette', description: 'Editor only — Monaco\'s own internal command palette', defaultAccelerator: 'F1', monacoCommandId: 'editor.action.quickCommand' },
];

export const SHORTCUT_REGISTRY: ShortcutDef[] = [...NOVI_SHORTCUTS, ...EDITOR_TERMINAL_SHORTCUTS, ...MONACO_BUILTIN_SHORTCUTS];

export function getShortcutsByCategory(category: ShortcutCategory, registry: ShortcutDef[] = SHORTCUT_REGISTRY): ShortcutDef[] {
  return registry.filter(d => d.category === category);
}

/** Every entry (shared app-defined commands and Monaco's own built-ins
 * alike) that also maps to a real Monaco command id — what MonacoEditor.ts
 * needs to build its one-time `addKeybindingRules()` call from. */
export function getMonacoMappedShortcuts(registry: ShortcutDef[] = SHORTCUT_REGISTRY): ShortcutDef[] {
  return registry.filter((d): d is ShortcutDef & { monacoCommandId: string } => !!d.monacoCommandId);
}

/**
 * Resolves the accelerator actually in effect for a shortcut: the default
 * unless its category has "use defaults" turned off AND an override (or
 * explicit null/unbind) is recorded for it.
 */
export function computeEffectiveAccelerator(def: ShortcutDef, settings: KeyboardShortcutsSettings): string | null {
  const categorySettings = settings[def.category];
  if (categorySettings.useDefaults) return def.defaultAccelerator;
  const override = categorySettings.overrides[def.id];
  if (override === undefined) return def.defaultAccelerator;
  return override;
}

/**
 * Normalizes an accelerator string for comparison: modifiers sorted and
 * uppercased, single-letter keys uppercased. "Shift+CmdOrCtrl+n" and
 * "CmdOrCtrl+Shift+N" compare equal.
 */
export function normalizeAccelerator(accelerator: string): string {
  const parts = accelerator.split('+').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1).map(m => m.toUpperCase()).sort();
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
  return [...mods, normalizedKey].join('+');
}

/**
 * Checks a candidate accelerator against every OTHER shortcut's current
 * effective binding, across both categories (global uniqueness — "we don't
 * have to deal with conflicts ever"). Returns the conflicting definition, or
 * null if the candidate is free to use.
 */
export function findConflict(
  candidateAccelerator: string,
  excludingId: string,
  settings: KeyboardShortcutsSettings,
  registry: ShortcutDef[] = SHORTCUT_REGISTRY
): ShortcutDef | null {
  const candidate = normalizeAccelerator(candidateAccelerator);
  if (!candidate) return null;
  for (const def of registry) {
    if (def.id === excludingId) continue;
    const effective = computeEffectiveAccelerator(def, settings);
    if (effective && normalizeAccelerator(effective) === candidate) return def;
  }
  return null;
}

const KEY_NAME_OVERRIDES: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Escape',
  Enter: 'Return',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Tab: 'Tab',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert',
  '`': '`',
  ',': ',',
  '.': '.',
  '/': '/',
  '\\': '\\',
  ';': ';',
  "'": "'",
  '[': '[',
  ']': ']',
  '-': '-',
  '=': '=',
};

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

/**
 * Converts a captured KeyboardEvent into an Electron-accelerator-format
 * string (e.g. "CmdOrCtrl+Shift+N"), or null while only modifier keys are
 * held (the recorder widget should keep waiting in that case).
 */
export function acceleratorFromKeyboardEvent(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('CmdOrCtrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let keyName = KEY_NAME_OVERRIDES[e.key];
  if (!keyName) {
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.key)) keyName = e.key; // F1-F24
    else if (/^[a-zA-Z]$/.test(e.key)) keyName = e.key.toUpperCase();
    else if (/^[0-9]$/.test(e.key)) keyName = e.key;
    else keyName = e.key.length === 1 ? e.key : e.key;
  }
  if (!keyName) return null;

  parts.push(keyName);
  return parts.join('+');
}

/** Renders an accelerator string for display (Windows/Linux convention). */
export function formatAcceleratorForDisplay(accelerator: string | null): string {
  if (!accelerator) return '(none)';
  return accelerator.replace(/CmdOrCtrl/g, 'Ctrl');
}

export interface ParsedAccelerator {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** The base key, in the same naming convention as acceleratorFromKeyboardEvent's output (e.g. "S", "F3", "Return", "["). */
  key: string;
}

/** Splits an accelerator string into its modifiers and base key. Kept
 * platform/toolkit-agnostic (no Electron or Monaco types) — callers that
 * need a specific toolkit's keybinding encoding (e.g. Monaco's KeyMod/KeyCode
 * numbers) do that translation themselves from this neutral shape. */
export function parseAccelerator(accelerator: string): ParsedAccelerator {
  const parts = accelerator.split('+').map(p => p.trim()).filter(Boolean);
  const key = parts[parts.length - 1] ?? '';
  const mods = parts.slice(0, -1);
  return {
    ctrl: mods.includes('CmdOrCtrl') || mods.includes('Ctrl') || mods.includes('Cmd'),
    alt: mods.includes('Alt'),
    shift: mods.includes('Shift'),
    key,
  };
}

/** Maps our accelerator key names to Monaco's KeyCode enum member *names*
 * (not values — the actual numbers come from whatever KeyCode object the
 * caller passes in, real or mocked, keeping this module free of an actual
 * monaco-editor dependency). Letters/digits/F-keys are derived
 * algorithmically below rather than listed here. */
const ACCELERATOR_KEY_TO_MONACO_CODE_NAME: Record<string, string> = {
  Up: 'UpArrow', Down: 'DownArrow', Left: 'LeftArrow', Right: 'RightArrow',
  Return: 'Enter', Escape: 'Escape', Space: 'Space', Backspace: 'Backspace',
  Delete: 'Delete', Tab: 'Tab', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  Insert: 'Insert', '`': 'Backquote', ',': 'Comma', '.': 'Period', '/': 'Slash',
  '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote', '[': 'BracketLeft', ']': 'BracketRight',
  '-': 'Minus', '=': 'Equal',
};

/** Looks up the Monaco KeyCode numeric value for one of our accelerator key
 * names, given the real (or mocked) `monaco.KeyCode` object. Returns null
 * for anything unrecognized rather than throwing — callers should treat
 * that as "this entry can't be applied to Monaco" and skip it. */
export function monacoKeyCodeForKeyName(key: string, keyCodeTable: object): number | null {
  const codeName = ACCELERATOR_KEY_TO_MONACO_CODE_NAME[key]
    ?? (/^F([1-9]|1[0-9]|2[0-4])$/.test(key) ? key
      : /^[A-Z]$/.test(key) ? `Key${key}`
      : /^[0-9]$/.test(key) ? `Digit${key}`
      : null);
  if (!codeName) return null;
  const value = (keyCodeTable as Record<string, unknown>)[codeName];
  return typeof value === 'number' ? value : null;
}

/**
 * Real Monaco/Electron-style key constant objects — typed as `object` rather
 * than `Record<string, number>` because TypeScript numeric enums (Monaco's
 * actual `KeyCode`) carry an implicit reverse (number -> name) mapping whose
 * values are strings, which a strict `Record<string, number>` rejects even
 * though normal string-keyed lookups on the enum are perfectly safe.
 */
export interface MonacoKeyConstants {
  KeyCode: object;
  KeyMod: { CtrlCmd: number; Shift: number; Alt: number };
}

/** Encodes an accelerator string as a Monaco keybinding number, given the
 * real (or mocked) `monaco.KeyCode`/`monaco.KeyMod` objects. Returns null if
 * the base key has no known Monaco KeyCode mapping. */
export function acceleratorToMonacoKeybinding(accelerator: string, monacoKeys: MonacoKeyConstants): number | null {
  const parsed = parseAccelerator(accelerator);
  const code = monacoKeyCodeForKeyName(parsed.key, monacoKeys.KeyCode);
  if (code === null) return null;
  let kb = code;
  if (parsed.ctrl) kb |= monacoKeys.KeyMod.CtrlCmd;
  if (parsed.alt) kb |= monacoKeys.KeyMod.Alt;
  if (parsed.shift) kb |= monacoKeys.KeyMod.Shift;
  return kb;
}
