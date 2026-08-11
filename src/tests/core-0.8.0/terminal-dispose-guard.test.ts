/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Regression test: Terminal component disposal must survive xterm.js throwing.
 *
 * xterm.js's WebGL addon has a known internal ordering bug — its own
 * registered disposable reads `terminal._core._store._isDisposed`, which can
 * already be undefined by the time it runs during `terminal.dispose()`,
 * throwing "Cannot read properties of undefined (reading '_isDisposed')".
 * Left unguarded, that synchronous throw propagated out of
 * Terminal.onDestroy() through App.syncTerminalInstances() and
 * App.onTabClose() (an async function, so the throw became a promise
 * rejection), which meant TabBar.removeTab() never reached the code that
 * actually removes the tab from its list — so typing `exit` in a shell left
 * a dead tab stuck in the UI forever, with an "Uncaught (in promise))" error
 * in the console. This verifies the fix: xterm's dispose() is caught, and
 * disposal always completes and nulls out `terminal`/`fitAddon`.
 */

import { Terminal } from '../../renderer/components/Terminal';

describe('Terminal xterm dispose guard', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    // These tests intentionally make xterm's dispose() throw to verify the
    // guard catches it — disposeXterm() logs that via console.error by
    // design. Silence it here so a passing run stays quiet; restored after
    // each test so an unexpected error elsewhere still surfaces normally.
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('destroy() does not throw when the underlying xterm instance throws during dispose()', () => {
    const terminal = new Terminal({ terminalId: 'test-term-1' });
    const fakeXterm = {
      dispose: jest.fn(() => {
        throw new Error("Cannot read properties of undefined (reading '_isDisposed')");
      }),
    };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = {};

    expect(() => terminal.destroy()).not.toThrow();
    expect(fakeXterm.dispose).toHaveBeenCalledTimes(1);
    expect((terminal as any).terminal).toBeNull();
    expect((terminal as any).fitAddon).toBeNull();
  });

  it('destroy() still disposes cleanly when xterm does not throw', () => {
    const terminal = new Terminal({ terminalId: 'test-term-2' });
    const fakeXterm = { dispose: jest.fn() };
    (terminal as any).terminal = fakeXterm;

    expect(() => terminal.destroy()).not.toThrow();
    expect(fakeXterm.dispose).toHaveBeenCalledTimes(1);
    expect((terminal as any).terminal).toBeNull();
  });

  it('restartTerminal() survives xterm throwing during dispose too', async () => {
    const mockApi = {
      terminalKill: jest.fn().mockResolvedValue(undefined),
      terminalCreate: jest.fn().mockResolvedValue({ id: 'test-term-3', initialCwd: '' }),
    };
    (window as unknown as { api: typeof mockApi }).api = mockApi;

    const terminal = new Terminal({ terminalId: 'test-term-3' });
    const fakeXterm = {
      cols: 80,
      rows: 24,
      dispose: jest.fn(() => {
        throw new Error("Cannot read properties of undefined (reading '_isDisposed')");
      }),
    };
    (terminal as any).terminal = fakeXterm;

    await expect(terminal.restartTerminal()).resolves.toBeUndefined();
    expect(fakeXterm.dispose).toHaveBeenCalledTimes(1);
    expect(mockApi.terminalCreate).toHaveBeenCalledWith(undefined, 80, 24, 'test-term-3');
  });
});
