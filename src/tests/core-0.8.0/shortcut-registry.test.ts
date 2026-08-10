/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import {
  NOVI_SHORTCUTS,
  SHORTCUT_REGISTRY,
  defaultKeyboardShortcutsSettings,
  computeEffectiveAccelerator,
  normalizeAccelerator,
  findConflict,
  acceleratorFromKeyboardEvent,
  formatAcceleratorForDisplay,
  getShortcutsByCategory,
  type KeyboardShortcutsSettings,
  type ShortcutDef,
} from '../../core/shortcuts/shortcut-registry';

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
  });

  describe('computeEffectiveAccelerator', () => {
    const def: ShortcutDef = { id: 'test-cmd', category: 'novi', label: 'Test', defaultAccelerator: 'CmdOrCtrl+N' };

    it('returns the default when useDefaults is true, even with an override present', () => {
      const settings: KeyboardShortcutsSettings = {
        novi: { useDefaults: true, overrides: { 'test-cmd': 'CmdOrCtrl+Shift+N' } },
        editorTerminal: { useDefaults: true, overrides: {} },
      };
      expect(computeEffectiveAccelerator(def, settings)).toBe('CmdOrCtrl+N');
    });

    it('returns the override when useDefaults is false and an override exists', () => {
      const settings: KeyboardShortcutsSettings = {
        novi: { useDefaults: false, overrides: { 'test-cmd': 'CmdOrCtrl+Shift+N' } },
        editorTerminal: { useDefaults: true, overrides: {} },
      };
      expect(computeEffectiveAccelerator(def, settings)).toBe('CmdOrCtrl+Shift+N');
    });

    it('falls back to the default when useDefaults is false but no override is recorded', () => {
      const settings: KeyboardShortcutsSettings = {
        novi: { useDefaults: false, overrides: {} },
        editorTerminal: { useDefaults: true, overrides: {} },
      };
      expect(computeEffectiveAccelerator(def, settings)).toBe('CmdOrCtrl+N');
    });

    it('returns null when the override explicitly unbinds the shortcut', () => {
      const settings: KeyboardShortcutsSettings = {
        novi: { useDefaults: false, overrides: { 'test-cmd': null } },
        editorTerminal: { useDefaults: true, overrides: {} },
      };
      expect(computeEffectiveAccelerator(def, settings)).toBeNull();
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
      const customized: KeyboardShortcutsSettings = {
        novi: { useDefaults: false, overrides: { 'close-file': 'CmdOrCtrl+Alt+Shift+Z' } },
        editorTerminal: { useDefaults: true, overrides: {} },
      };
      const conflict = findConflict('CmdOrCtrl+Alt+Shift+Z', 'new-file', customized);
      expect(conflict?.id).toBe('close-file');
    });

    it('ignores a command that has been explicitly unbound', () => {
      const unbound: KeyboardShortcutsSettings = {
        novi: { useDefaults: false, overrides: { 'open-file': null } },
        editorTerminal: { useDefaults: true, overrides: {} },
      };
      expect(findConflict('CmdOrCtrl+O', 'new-file', unbound)).toBeNull();
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
});
