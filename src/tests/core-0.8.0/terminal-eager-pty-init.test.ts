/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Regression coverage for Terminal.initPtyEagerly(): background terminal
 * tabs (e.g. every tab restored from a previous session except whichever
 * ends up active) used to stay completely uninitialized — no PTY at all —
 * until the user actually clicked into them. That meant terminalOnPwd
 * (the only thing that renames a tab from its cwd) never fired for them,
 * leaving tab labels stuck on a generic placeholder indefinitely.
 *
 * initPtyEagerly() can't reuse initPhase1()'s measurement dance: that waits
 * on a ResizeObserver entry with non-zero dimensions, which a display:none
 * container never produces — it would hang forever. Instead it creates the
 * PTY immediately with a fallback size (same 100x30 initPhase1() already
 * falls back to for a degenerate measurement) and leaves the real xterm
 * display for later, exactly like the existing "PTY exists, xterm not yet
 * created" path the isActive setter already handles for a restart-while-
 * hidden tab.
 */

import { Terminal } from '../../renderer/components/Terminal';

describe('Terminal.initPtyEagerly', () => {
  it('creates the PTY with the 100x30 fallback size, without measuring or waiting for visibility', async () => {
    const terminalCreate = jest.fn().mockResolvedValue({ id: 'test-term-eager-1', initialCwd: '' });
    (window as unknown as { api: { terminalCreate: typeof terminalCreate } }).api = { terminalCreate };

    const terminal = new Terminal({ terminalId: 'test-term-eager-1', workspaceRoot: '/home/user/project' });

    await terminal.initPtyEagerly();

    expect(terminalCreate).toHaveBeenCalledWith('/home/user/project', 100, 30, 'test-term-eager-1');
    expect((terminal as any).ptyCreated).toBe(true);
  });

  it('does not create the real xterm display — that stays deferred until the tab is actually shown', async () => {
    const terminalCreate = jest.fn().mockResolvedValue({ id: 'test-term-eager-2', initialCwd: '' });
    (window as unknown as { api: { terminalCreate: typeof terminalCreate } }).api = { terminalCreate };

    const terminal = new Terminal({ terminalId: 'test-term-eager-2' });
    await terminal.initPtyEagerly();

    expect((terminal as any).terminal).toBeNull();
  });

  it('is a no-op if the PTY already exists', async () => {
    const terminalCreate = jest.fn().mockResolvedValue({ id: 'test-term-eager-3', initialCwd: '' });
    (window as unknown as { api: { terminalCreate: typeof terminalCreate } }).api = { terminalCreate };

    const terminal = new Terminal({ terminalId: 'test-term-eager-3' });
    (terminal as any).ptyCreated = true;

    await terminal.initPtyEagerly();

    expect(terminalCreate).not.toHaveBeenCalled();
  });

  it('is a no-op if the tab is already active (initPhase1 owns that path instead)', async () => {
    const terminalCreate = jest.fn().mockResolvedValue({ id: 'test-term-eager-4', initialCwd: '' });
    (window as unknown as { api: { terminalCreate: typeof terminalCreate } }).api = { terminalCreate };

    const terminal = new Terminal({ terminalId: 'test-term-eager-4' });
    (terminal as any)._isActive = true;

    await terminal.initPtyEagerly();

    expect(terminalCreate).not.toHaveBeenCalled();
  });

  it('leaves initInProgress set on success, so a later isActive=true does not re-trigger initPhase1 (ptyCreated already gates it first anyway)', async () => {
    const terminalCreate = jest.fn().mockResolvedValue({ id: 'test-term-eager-5', initialCwd: '' });
    (window as unknown as { api: { terminalCreate: typeof terminalCreate } }).api = { terminalCreate };

    const terminal = new Terminal({ terminalId: 'test-term-eager-5' });
    await terminal.initPtyEagerly();

    expect((terminal as any).ptyCreated).toBe(true);
    expect((terminal as any).initInProgress).toBe(true);
  });

  it('mounts the real display once terminalCreate resolves, if the tab became active while the call was still in flight', async () => {
    // The exact race workspace restore can hit: syncTerminalInstances() fires
    // initPtyEagerly() for a tab before the restore code has assigned the
    // real active tab yet, so a tab that's about to become active gets
    // treated as background first. isActive=true then arrives while
    // terminalCreate()'s IPC round-trip is still pending.
    let resolveCreate!: () => void;
    const terminalCreate = jest.fn(() => new Promise<{ id: string; initialCwd: string }>((resolve) => {
      resolveCreate = () => resolve({ id: 'test-term-race-1', initialCwd: '' });
    }));
    (window as unknown as { api: { terminalCreate: typeof terminalCreate } }).api = { terminalCreate };

    const terminal = new Terminal({ terminalId: 'test-term-race-1' });
    const initDisplaySpy = jest.spyOn(terminal as any, 'initDisplay').mockImplementation(() => {});

    const pending = terminal.initPtyEagerly(); // fire-and-forget, still in flight
    terminal.isActive = true; // arrives before terminalCreate() resolves

    // isActive's own initPhase1() call must have bailed out here —
    // initInProgress was already true from the in-flight eager call — so
    // nothing should have mounted a display yet.
    expect(initDisplaySpy).not.toHaveBeenCalled();

    resolveCreate();
    await pending;

    // initPtyEagerly() must notice _isActive flipped true and finish the
    // job itself instead of leaving the tab permanently blank.
    expect(initDisplaySpy).toHaveBeenCalledTimes(1);
  });

  it('resets initInProgress and leaves ptyCreated false if terminalCreate rejects', async () => {
    // Intentionally triggers Terminal.ts's own console.error for this failure — silence it here.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const terminalCreate = jest.fn().mockRejectedValue(new Error('spawn failed'));
      (window as unknown as { api: { terminalCreate: typeof terminalCreate } }).api = { terminalCreate };

      const terminal = new Terminal({ terminalId: 'test-term-eager-6' });
      await terminal.initPtyEagerly();

      expect((terminal as any).ptyCreated).toBe(false);
      expect((terminal as any).initInProgress).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
