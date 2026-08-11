/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import {
  NOVI_SHORTCUTS,
  SHORTCUT_REGISTRY,
  defaultKeyboardShortcutsSettings,
  mergeKeyboardShortcutsSettings,
  computeEffectiveAccelerator,
  normalizeAccelerator,
  findConflict,
  acceleratorFromKeyboardEvent,
  formatAcceleratorForDisplay,
  getShortcutsByCategory,
  getMonacoMappedShortcuts,
  matchesAnyShortcut,
  parseAccelerator,
  monacoKeyCodeForKeyName,
  acceleratorToMonacoKeybinding,
  type ShortcutDef,
} from '../../core/shortcuts/shortcut-registry';

// Real runtime values from monaco-editor's compiled source (not guessed),
// verified against node_modules/monaco-editor/esm/vs/editor/common/services/editorBaseApi.js
// and node_modules/monaco-editor/esm/vs/base/common/keyCodes.js.
const REAL_MONACO_KEYS = {
  KeyMod: { CtrlCmd: 2048, Shift: 1024, Alt: 512 },
  KeyCode: { Enter: 3, Escape: 9, Digit0: 21, KeyA: 31, KeyC: 33, KeyN: 44, KeyO: 45, KeyS: 49, KeyZ: 56, F1: 59, F3: 61 },
};

describe('shortcut-registry', () => {
  describe('registry data', () => {
    it('has no duplicate ids', () => {
      const ids = SHORTCUT_REGISTRY.map(d => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every entry has a non-empty label and default accelerator', () => {
      for (const def of SHORTCUT_REGISTRY) {
        expect(def.label.length).toBeGreaterThan(0);
        expect(def.defaultAccelerator.length).toBeGreaterThan(0);
      }
    });

    it('getShortcutsByCategory filters correctly', () => {
      const novi = getShortcutsByCategory('novi');
      expect(novi.length).toBe(NOVI_SHORTCUTS.length);
      expect(novi.every(d => d.category === 'novi')).toBe(true);
    });

    it('no two default accelerators collide with each other', () => {
      const seen = new Map<string, string>();
      for (const def of SHORTCUT_REGISTRY) {
        const key = normalizeAccelerator(def.defaultAccelerator);
        const existing = seen.get(key);
        expect(existing).toBeUndefined();
        seen.set(key, def.id);
      }
    });

    it('registers Close Tab (Ctrl+F4) under editorTerminal, so it applies to both a file and a terminal tab', () => {
      const closeTab = SHORTCUT_REGISTRY.find(d => d.id === 'close-tab');
      expect(closeTab).toBeDefined();
      expect(closeTab?.category).toBe('editorTerminal');
      expect(closeTab?.defaultAccelerator).toBe('CmdOrCtrl+F4');
    });
  });

  describe('computeEffectiveAccelerator', () => {
    const def: ShortcutDef = { id: 'test-cmd', category: 'novi', label: 'Test', defaultAccelerator: 'CmdOrCtrl+N' };

    it('returns the default when useDefaults is true, even with an override present', () => {
      const settings = mergeKeyboardShortcutsSettings({
        novi: { useDefaults: true, overrides: { 'test-cmd': 'CmdOrCtrl+Shift+N' } },
      });
      expect(computeEffectiveAccelerator(def, settings)).toBe('CmdOrCtrl+N');
    });

    it('returns the override when useDefaults is false and an override exists', () => {
      const settings = mergeKeyboardShortcutsSettings({
        novi: { useDefaults: false, overrides: { 'test-cmd': 'CmdOrCtrl+Shift+N' } },
      });
      expect(computeEffectiveAccelerator(def, settings)).toBe('CmdOrCtrl+Shift+N');
    });

    it('falls back to the default when useDefaults is false but no override is recorded', () => {
      const settings = mergeKeyboardShortcutsSettings({
        novi: { useDefaults: false, overrides: {} },
      });
      expect(computeEffectiveAccelerator(def, settings)).toBe('CmdOrCtrl+N');
    });

    it('returns null when the override explicitly unbinds the shortcut', () => {
      const settings = mergeKeyboardShortcutsSettings({
        novi: { useDefaults: false, overrides: { 'test-cmd': null } },
      });
      expect(computeEffectiveAccelerator(def, settings)).toBeNull();
    });
  });

  describe('matchesAnyShortcut', () => {
    const settings = defaultKeyboardShortcutsSettings();

    it('matches New File\'s default accelerator against NOVI_SHORTCUTS', () => {
      const e = { key: 'n', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
      expect(matchesAnyShortcut(e, NOVI_SHORTCUTS, settings)).toBe(true);
    });

    it('matches Open File\'s default accelerator against NOVI_SHORTCUTS', () => {
      const e = { key: 'o', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
      expect(matchesAnyShortcut(e, NOVI_SHORTCUTS, settings)).toBe(true);
    });

    it('does not match an unrelated combination', () => {
      const e = { key: 'q', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
      expect(matchesAnyShortcut(e, NOVI_SHORTCUTS, settings)).toBe(false);
    });

    it('follows a remapped accelerator, not the stale default', () => {
      const remapped = mergeKeyboardShortcutsSettings({
        novi: { useDefaults: false, overrides: { 'new-file': 'CmdOrCtrl+M' } },
      });
      const ctrlN = { key: 'n', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
      const ctrlM = { key: 'm', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
      expect(matchesAnyShortcut(ctrlN, NOVI_SHORTCUTS, remapped)).toBe(false);
      expect(matchesAnyShortcut(ctrlM, NOVI_SHORTCUTS, remapped)).toBe(true);
    });

    it('returns false for a lone modifier keypress', () => {
      const e = { key: 'Control', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
      expect(matchesAnyShortcut(e, NOVI_SHORTCUTS, settings)).toBe(false);
    });
  });

  describe('normalizeAccelerator', () => {
    it('is order-insensitive for modifiers', () => {
      expect(normalizeAccelerator('Shift+CmdOrCtrl+N')).toBe(normalizeAccelerator('CmdOrCtrl+Shift+N'));
    });

    it('is case-insensitive for single-letter keys', () => {
      expect(normalizeAccelerator('CmdOrCtrl+n')).toBe(normalizeAccelerator('CmdOrCtrl+N'));
    });

    it('does not mangle multi-character key names', () => {
      expect(normalizeAccelerator('CmdOrCtrl+Tab')).toContain('Tab');
      expect(normalizeAccelerator('F11')).toBe('F11');
    });
  });

  describe('findConflict', () => {
    const settings = defaultKeyboardShortcutsSettings();

    it('finds no conflict for an accelerator nothing currently uses', () => {
      expect(findConflict('CmdOrCtrl+Alt+Shift+Z', 'new-file', settings)).toBeNull();
    });

    it('finds the conflicting command when the candidate matches another default', () => {
      // open-file defaults to CmdOrCtrl+O
      const conflict = findConflict('CmdOrCtrl+O', 'new-file', settings);
      expect(conflict?.id).toBe('open-file');
    });

    it('is order/case insensitive when detecting the conflict', () => {
      const conflict = findConflict('Ctrl+o'.replace('Ctrl', 'CmdOrCtrl'), 'new-file', settings);
      expect(conflict?.id).toBe('open-file');
    });

    it('does not flag a command as conflicting with itself', () => {
      // open-file's own current accelerator, excluding open-file itself
      expect(findConflict('CmdOrCtrl+O', 'open-file', settings)).toBeNull();
    });

    it('detects a conflict against a customized override, not just defaults', () => {
      // 'save' is in the editor category, not novi — the override must be
      // recorded under the shortcut's own category to take effect.
      const customized = mergeKeyboardShortcutsSettings({
        editor: { useDefaults: false, overrides: { save: 'CmdOrCtrl+Alt+Shift+Z' } },
      });
      const conflict = findConflict('CmdOrCtrl+Alt+Shift+Z', 'new-file', customized);
      expect(conflict?.id).toBe('save');
    });

    it('ignores a command that has been explicitly unbound', () => {
      const unbound = mergeKeyboardShortcutsSettings({
        novi: { useDefaults: false, overrides: { 'open-file': null } },
      });
      expect(findConflict('CmdOrCtrl+O', 'new-file', unbound)).toBeNull();
    });

    it('detects conflicts across categories (Novi vs Editor vs Terminal+Editor)', () => {
      // 'select-all' (editorTerminal) defaults to CmdOrCtrl+A — a Novi
      // shortcut being customized to the same combo must be flagged too.
      const settings = mergeKeyboardShortcutsSettings({
        novi: { useDefaults: false, overrides: {} },
      });
      const conflict = findConflict('CmdOrCtrl+A', 'new-file', settings);
      expect(conflict?.id).toBe('select-all');
    });
  });

  describe('acceleratorFromKeyboardEvent', () => {
    it('returns null while only a modifier key is held', () => {
      expect(acceleratorFromKeyboardEvent({ key: 'Control', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBeNull();
    });

    it('builds a simple Ctrl+letter combo', () => {
      expect(acceleratorFromKeyboardEvent({ key: 'n', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe('CmdOrCtrl+N');
    });

    it('builds a Ctrl+Shift+letter combo with modifiers in canonical order', () => {
      expect(acceleratorFromKeyboardEvent({ key: 'P', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true })).toBe('CmdOrCtrl+Shift+P');
    });

    it('maps special keys to Electron accelerator names', () => {
      expect(acceleratorFromKeyboardEvent({ key: 'ArrowUp', ctrlKey: false, metaKey: false, altKey: true, shiftKey: false })).toBe('Alt+Up');
      expect(acceleratorFromKeyboardEvent({ key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBe('Escape');
    });

    it('handles a bare function key', () => {
      expect(acceleratorFromKeyboardEvent({ key: 'F11', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBe('F11');
    });

    it('treats Cmd/Meta the same as Ctrl (CmdOrCtrl)', () => {
      expect(acceleratorFromKeyboardEvent({ key: 's', ctrlKey: false, metaKey: true, altKey: false, shiftKey: false })).toBe('CmdOrCtrl+S');
    });
  });

  describe('formatAcceleratorForDisplay', () => {
    it('renders CmdOrCtrl as Ctrl', () => {
      expect(formatAcceleratorForDisplay('CmdOrCtrl+Shift+N')).toBe('Ctrl+Shift+N');
    });

    it('renders null as (none)', () => {
      expect(formatAcceleratorForDisplay(null)).toBe('(none)');
    });
  });

  describe('parseAccelerator', () => {
    it('splits modifiers from the base key', () => {
      expect(parseAccelerator('CmdOrCtrl+Shift+P')).toEqual({ ctrl: true, alt: false, shift: true, key: 'P' });
    });

    it('handles a bare key with no modifiers', () => {
      expect(parseAccelerator('F3')).toEqual({ ctrl: false, alt: false, shift: false, key: 'F3' });
    });

    it('handles all three modifiers together', () => {
      expect(parseAccelerator('CmdOrCtrl+Alt+Shift+Z')).toEqual({ ctrl: true, alt: true, shift: true, key: 'Z' });
    });

    it('treats a punctuation key as the base key, not a modifier', () => {
      expect(parseAccelerator('CmdOrCtrl+[')).toEqual({ ctrl: true, alt: false, shift: false, key: '[' });
    });
  });

  describe('getMonacoMappedShortcuts', () => {
    it('only returns entries that carry a monacoCommandId', () => {
      const mapped = getMonacoMappedShortcuts();
      expect(mapped.length).toBeGreaterThan(0);
      expect(mapped.every(d => !!d.monacoCommandId)).toBe(true);
    });

    it('includes both the shared app-defined entries and Monaco-only entries', () => {
      const mapped = getMonacoMappedShortcuts();
      const ids = mapped.map(d => d.id);
      expect(ids).toContain('copy'); // shared (also routes to __terminalAPI)
      expect(ids).toContain('monaco-fold'); // Monaco-only
    });
  });

  describe('monacoKeyCodeForKeyName', () => {
    it('resolves a letter key via the KeyX naming convention', () => {
      expect(monacoKeyCodeForKeyName('C', REAL_MONACO_KEYS.KeyCode)).toBe(REAL_MONACO_KEYS.KeyCode.KeyC);
    });

    it('resolves a digit key via the DigitX naming convention', () => {
      expect(monacoKeyCodeForKeyName('0', REAL_MONACO_KEYS.KeyCode)).toBe(REAL_MONACO_KEYS.KeyCode.Digit0);
    });

    it('resolves a bare function key directly by name', () => {
      expect(monacoKeyCodeForKeyName('F3', REAL_MONACO_KEYS.KeyCode)).toBe(REAL_MONACO_KEYS.KeyCode.F3);
    });

    it('resolves a special key through the accelerator-name translation table', () => {
      expect(monacoKeyCodeForKeyName('Return', REAL_MONACO_KEYS.KeyCode)).toBe(REAL_MONACO_KEYS.KeyCode.Enter);
    });

    it('returns null for a key with no known Monaco mapping', () => {
      expect(monacoKeyCodeForKeyName('NotAKey', REAL_MONACO_KEYS.KeyCode)).toBeNull();
    });
  });

  describe('acceleratorToMonacoKeybinding', () => {
    it('encodes a plain Ctrl+letter combo using real Monaco bit values', () => {
      // CmdOrCtrl+C -> KeyMod.CtrlCmd (2048) | KeyCode.KeyC (33) = 2081
      expect(acceleratorToMonacoKeybinding('CmdOrCtrl+C', REAL_MONACO_KEYS)).toBe(2048 | 33);
    });

    it('encodes Ctrl+Shift+letter with both modifier bits set', () => {
      expect(acceleratorToMonacoKeybinding('CmdOrCtrl+Shift+A', REAL_MONACO_KEYS)).toBe(2048 | 1024 | 31);
    });

    it('encodes Ctrl+Alt+letter with the alt bit set', () => {
      expect(acceleratorToMonacoKeybinding('CmdOrCtrl+Alt+S', REAL_MONACO_KEYS)).toBe(2048 | 512 | 49);
    });

    it('encodes a bare key with no modifier bits at all', () => {
      expect(acceleratorToMonacoKeybinding('F1', REAL_MONACO_KEYS)).toBe(59);
    });

    it('returns null when the base key has no Monaco mapping in the given table', () => {
      expect(acceleratorToMonacoKeybinding('CmdOrCtrl+NotAKey', REAL_MONACO_KEYS)).toBeNull();
    });

    it('round-trips every Monaco-mapped registry entry\'s default accelerator to a non-null keybinding', () => {
      // Regression guard: catches a typo'd key name in the registry (e.g. an
      // accelerator using a key not covered by monacoKeyCodeForKeyName) that
      // would otherwise silently no-op instead of throwing.
      const fullKeyTable = {
        ...REAL_MONACO_KEYS.KeyCode,
        // Fill in the rest of the alphabet/digits/F-keys/punctuation with
        // placeholder-but-present values so every registry default resolves.
        ...Object.fromEntries('BDEFGHIJKLMPQRTUVWXY'.split('').map((l, i) => [`Key${l}`, 100 + i])),
        ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [`Digit${n}`, 200 + n])),
        ...Object.fromEntries([2, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => [`F${n}`, 300 + n])),
        UpArrow: 400, DownArrow: 401, LeftArrow: 402, RightArrow: 403,
        Space: 404, Backspace: 405, Delete: 406, Tab: 407, Home: 408, End: 409,
        PageUp: 410, PageDown: 411, Insert: 412, Backquote: 413, Comma: 414,
        Period: 415, Slash: 416, Backslash: 417, Semicolon: 418, Quote: 419,
        BracketLeft: 420, BracketRight: 421, Minus: 422, Equal: 423,
      };
      for (const def of getMonacoMappedShortcuts()) {
        const kb = acceleratorToMonacoKeybinding(def.defaultAccelerator, { KeyCode: fullKeyTable, KeyMod: REAL_MONACO_KEYS.KeyMod });
        expect(kb).not.toBeNull();
      }
    });
  });
});
