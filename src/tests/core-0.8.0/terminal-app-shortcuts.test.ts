/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Regression coverage for Terminal.ts's isClaimedByAppShortcut(): the check
 * that stops xterm from consuming a keypress the Terminal+Editor shortcut
 * category has claimed (Copy, Paste, Select All, Save, etc.), so it falls
 * through to App.ts's own keydown handler instead. Tested directly against
 * the exported function rather than via a fully mounted xterm instance,
 * since the underlying accelerator-matching logic is already covered
 * exhaustively by shortcut-registry.test.ts — this just verifies the wiring.
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

  it('claims Ctrl+S (Save default)', () => {
    expect(isClaimedByAppShortcut(keyEvent({ key: 's', ctrlKey: true }))).toBe(true);
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
