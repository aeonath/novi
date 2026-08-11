/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for Terminal's session-history restore feature:
 * serializeHistory() (called on quit, via window.__terminalAPI[id].serialize)
 * and the initialHistory config option consumed once a restored tab is
 * actually displayed. Same "inject a fake collaborator directly, skip the
 * real xterm mount" pattern used throughout this test file's siblings.
 */

import { Terminal } from '../../renderer/components/Terminal';

describe('Terminal.serializeHistory', () => {
  it('returns an empty string when no serialize addon has been loaded yet (terminal never displayed)', () => {
    const terminal = new Terminal({ terminalId: 'test-term-history-1' });
    expect(terminal.serializeHistory()).toBe('');
  });

  it('delegates to the loaded SerializeAddon, passing the terminal\'s configured scrollback', () => {
    const terminal = new Terminal({ terminalId: 'test-term-history-2', scrollback: 50000 });
    const fakeSerializeAddon = { serialize: jest.fn(() => 'serialized ANSI content') };
    (terminal as any).serializeAddon = fakeSerializeAddon;

    const result = terminal.serializeHistory();

    expect(result).toBe('serialized ANSI content');
    expect(fakeSerializeAddon.serialize).toHaveBeenCalledWith({ scrollback: 50000 });
  });

  it('returns an empty string instead of throwing if serialize() itself throws', () => {
    const terminal = new Terminal({ terminalId: 'test-term-history-3' });
    const fakeSerializeAddon = { serialize: jest.fn(() => { throw new Error('boom'); }) };
    (terminal as any).serializeAddon = fakeSerializeAddon;

    expect(() => terminal.serializeHistory()).not.toThrow();
    expect(terminal.serializeHistory()).toBe('');
  });
});

describe('Terminal initialHistory config', () => {
  it('is stored from the constructor config for the eventual initDisplay() to consume', () => {
    const terminal = new Terminal({ terminalId: 'test-term-history-4', initialHistory: 'previous session output' });
    expect((terminal as any).initialHistory).toBe('previous session output');
  });

  it('defaults to undefined when not provided (a brand new, non-restored tab)', () => {
    const terminal = new Terminal({ terminalId: 'test-term-history-5' });
    expect((terminal as any).initialHistory).toBeUndefined();
  });
});
