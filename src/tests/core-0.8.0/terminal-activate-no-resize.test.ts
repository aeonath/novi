/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Regression test: activating a terminal tab must not re-fit/resize it.
 *
 * `set isActive(true)` used to create a fresh ResizeObserver on every
 * activation that called fitAddon.fit() + onResize() (a SIGWINCH to the
 * shell) once the just-unhidden container reported a non-zero size. A
 * *separate*, persistent ResizeObserver (set up once in initDisplay())
 * already reacts to that same display:none->flex size change on its own —
 * the two independent observers, measuring the same container, could each
 * compute a slightly different col/row count and send the shell two
 * close-together resizes, corrupting the prompt and dropping on-screen
 * content on every tab switch. Activating a tab should now only restore
 * scroll position and focus — the terminal's size (and therefore its
 * content) stays exactly as it was while hidden, unless the container's
 * real size has genuinely changed, which the persistent observer alone
 * handles.
 */

import { Terminal } from '../../renderer/components/Terminal';

function makeFakeXterm() {
  return {
    scrollToBottom: jest.fn(),
    focus: jest.fn(),
    cols: 80,
    rows: 24,
    options: {},
  };
}

describe('Terminal activation does not re-fit or resize', () => {
  it('does not call fitAddon.fit() or onResize() when a ready terminal becomes active', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-activate', onResize });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;

    terminal.isActive = true;

    expect(fakeFitAddon.fit).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it('still restores scroll position and focus on activation', () => {
    const terminal = new Terminal({ terminalId: 'test-term-activate-2' });

    const fakeXterm = makeFakeXterm();
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = { fit: jest.fn() };
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;

    terminal.isActive = true;

    expect(fakeXterm.scrollToBottom).toHaveBeenCalledTimes(1);
    expect(fakeXterm.focus).toHaveBeenCalledTimes(1);
  });

  it('does nothing on activation before the terminal is ready', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-activate-3', onResize });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = false; // not ready yet

    terminal.isActive = true;

    expect(fakeXterm.scrollToBottom).not.toHaveBeenCalled();
    expect(fakeXterm.focus).not.toHaveBeenCalled();
    expect(fakeFitAddon.fit).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it('does nothing on deactivation (leaving the hidden terminal exactly as-is)', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-activate-4', onResize });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;

    terminal.isActive = false;

    expect(fakeXterm.scrollToBottom).not.toHaveBeenCalled();
    expect(fakeXterm.focus).not.toHaveBeenCalled();
    expect(fakeFitAddon.fit).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it('re-assigning the same fontSizeProp value (as App.ts does on every tab switch) does not fit/resize', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-fontsize-1', onResize, fontSize: 14 });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;

    // Simulate App.ts's syncTerminalActiveState(), which re-assigns
    // fontSizeProp to the same unchanged value on every tab switch.
    (terminal as any).fontSizeProp = 14;
    (terminal as any).fontSizeProp = 14;

    expect(fakeFitAddon.fit).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it('assigning a genuinely different fontSizeProp still fits and resizes', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-fontsize-2', onResize, fontSize: 14 });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;

    (terminal as any).fontSizeProp = 16;

    expect(fakeFitAddon.fit).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);
  });
});
