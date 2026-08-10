/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Regression coverage for Terminal.ts's isClaimedByAppShortcut(): the check
 * that stops xterm from consuming a keypress the Terminal+Editor shortcut
 * category has claimed (Copy, Paste, Select All, font size, etc.), so it
 * falls through to App.ts's own keydown handler instead. Tested directly
 * against the exported function rather than via a fully mounted xterm
 * instance, since the underlying accelerator-matching logic is already
 * covered exhaustively by shortcut-registry.test.ts — this just verifies
 * the wiring.
 *
 * Editor-only shortcuts (Save, Undo, Find, ...) are deliberately NOT
 * claimed here — see the "does not claim" tests below — so real terminal
 * semantics for the same keys (Ctrl+S = XOFF, Ctrl+Z = SIGTSTP) keep
 * working while a terminal is focused.
 */

import { isClaimedByAppShortcut } from '../../renderer/components/Terminal';

function keyEvent(init: Partial<KeyboardEventInit> & { key: string }): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
}

describe('Terminal.isClaimedByAppShortcut', () => {
  it('claims Ctrl+C (Copy default) so xterm does not consume it', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 'c', ctrlKey: true }))).toBe(true);
  });

  it('claims Ctrl+A (Select All default)', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 'a', ctrlKey: true }))).toBe(true);
  });

  it('does NOT claim Ctrl+S (Save is Editor-only — real terminals use Ctrl+S for XOFF)', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 's', ctrlKey: true }))).toBe(false);
  });

  it('does NOT claim Ctrl+Z (Undo is Editor-only — real terminals use Ctrl+Z for SIGTSTP)', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 'z', ctrlKey: true }))).toBe(false);
  });

  it('does not claim an unrelated combination', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 'z', ctrlKey: true, altKey: true, shiftKey: true }))).toBe(false);
  });

  it('does not claim Ctrl+Tab — that is handled separately, before this check runs', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 'Tab', ctrlKey: true }))).toBe(false);
  });

  it('does not claim a lone modifier keypress', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 'Control', ctrlKey: true }))).toBe(false);
  });

  it('does not claim a plain letter with no modifiers', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 'a' }))).toBe(false);
  });
});
