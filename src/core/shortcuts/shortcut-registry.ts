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
 * focused. Populated across phases 2 (app-defined shared commands) and 3
 * (Monaco's own built-in defaults).
 */
export const EDITOR_TERMINAL_SHORTCUTS: ShortcutDef[] = [];

export const SHORTCUT_REGISTRY: ShortcutDef[] = [...NOVI_SHORTCUTS, ...EDITOR_TERMINAL_SHORTCUTS];

export function getShortcutsByCategory(category: ShortcutCategory, registry: ShortcutDef[] = SHORTCUT_REGISTRY): ShortcutDef[] {
  return registry.filter(d => d.category === category);
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
