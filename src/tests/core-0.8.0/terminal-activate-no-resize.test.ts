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
 *
 * Follow-up regression: even after the above, the *persistent* observer
 * itself still fired on activation, because the container's display:none ->
 * flex flip is a genuine size change from its point of view. That fit() +
 * onResize() (SIGWINCH) on Windows/conpty could repaint the whole console
 * buffer, flashing the old content then clearing it down to a bare prompt.
 * `set isActive(true)` now sets a `suppressNextResize` flag that makes the
 * persistent observer skip exactly the one callback caused by activation,
 * while still reacting normally to genuine resizes that happen once the tab
 * is already visible (window resize, sidebar drag, etc).
 */

import { Terminal } from '../../renderer/components/Terminal';

function makeFakeXterm() {
  return {
    scrollToBottom: jest.fn(),
    focus: jest.fn(),
    cols: 80,
    rows: 24,
    options: {} as { fontSize?: number; fontFamily?: string },
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

  it('assigning a genuinely different fontSizeProp still fits and resizes while active', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-fontsize-2', onResize, fontSize: 14 });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;
    (terminal as any)._isActive = true;

    (terminal as any).fontSizeProp = 16;

    expect(fakeFitAddon.fit).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it('assigning a genuinely different fontSizeProp while INACTIVE updates the xterm option but defers the fit, instead of destructively fitting a 0x0 hidden container', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-fontsize-hidden', onResize, fontSize: 14 });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;
    (terminal as any)._isActive = false; // tab is hidden

    (terminal as any).fontSizeProp = 16;

    expect(fakeXterm.options.fontSize).toBe(16);
    expect(fakeFitAddon.fit).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
    expect((terminal as any).pendingFontRefit).toBe(true);
  });

  it('re-assigning the same fontFamilyProp value does not fit/resize', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-fontfamily-1', onResize, fontFamily: 'Consolas' });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;

    (terminal as any).fontFamilyProp = 'Consolas';
    (terminal as any).fontFamilyProp = 'Consolas';

    expect(fakeFitAddon.fit).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it('assigning a genuinely different fontFamilyProp updates xterm options and fits/resizes while active', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-fontfamily-2', onResize, fontFamily: 'DejaVu Sans Mono' });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;
    (terminal as any)._isActive = true;

    (terminal as any).fontFamilyProp = 'Consolas';

    expect(fakeXterm.options.fontFamily).toBe("'Consolas', monospace");
    expect(fakeFitAddon.fit).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it('assigning a genuinely different fontFamilyProp while INACTIVE updates the xterm option but defers the fit', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-fontfamily-hidden', onResize, fontFamily: 'DejaVu Sans Mono' });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;
    (terminal as any)._isActive = false; // tab is hidden

    (terminal as any).fontFamilyProp = 'Consolas';

    expect(fakeXterm.options.fontFamily).toBe("'Consolas', monospace");
    expect(fakeFitAddon.fit).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
    expect((terminal as any).pendingFontRefit).toBe(true);
  });

  it('reactivating a terminal with a pending font refit does NOT arm suppressNextResize, so the deferred resize is allowed to actually run', () => {
    const terminal = new Terminal({ terminalId: 'test-term-pending-refit' });

    const fakeXterm = makeFakeXterm();
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = { fit: jest.fn() };
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;
    (terminal as any)._isActive = false;

    // Font size changed while this tab was hidden — defers instead of fitting.
    (terminal as any).fontSizeProp = 20;
    expect((terminal as any).pendingFontRefit).toBe(true);

    terminal.isActive = true;

    expect((terminal as any).pendingFontRefit).toBe(false);
    expect((terminal as any).suppressNextResize).toBe(false);
  });

  it('end-to-end: a font change while hidden actually resizes once the persistent observer fires on reactivation', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-pending-refit-e2e', onResize });

    const fakeXterm = makeFakeXterm();
    fakeXterm.cols = 80;
    fakeXterm.rows = 24;
    const fakeFitAddon = {
      fit: jest.fn(() => { fakeXterm.cols = 70; fakeXterm.rows = 20; }),
    };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;
    (terminal as any)._isActive = false;

    (terminal as any).fontSizeProp = 20; // deferred, no fit while hidden
    expect(fakeFitAddon.fit).not.toHaveBeenCalled();

    // Reactivating: App.ts flips container display to flex, then assigns isActive.
    terminal.isActive = true;
    // The persistent ResizeObserver's callback, triggered by that display
    // flip, runs next — since pendingFontRefit consumed suppressNextResize
    // instead of arming it, this call is allowed through.
    (terminal as any).handleContainerResize();

    expect(fakeFitAddon.fit).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith(70, 20);
  });

  it('activation arms suppressNextResize, so the persistent ResizeObserver skips the callback caused by the display:none->flex flip', () => {
    const terminal = new Terminal({ terminalId: 'test-term-suppress-1' });

    const fakeXterm = makeFakeXterm();
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = { fit: jest.fn() };
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;

    expect((terminal as any).suppressNextResize).toBe(false);
    terminal.isActive = true;
    expect((terminal as any).suppressNextResize).toBe(true);

    // Simulate the persistent observer's callback consuming the flag on its
    // next fire, exactly as it does inside initDisplay().
    if ((terminal as any).suppressNextResize) {
      (terminal as any).suppressNextResize = false;
    }
    expect((terminal as any).suppressNextResize).toBe(false);
  });

  it('handleContainerResize() (the persistent ResizeObserver callback) does not fit() while inactive — the actual corruption source', () => {
    // FitAddon.proposeDimensions() does not bail out on a zero-size
    // container: it clamps to {cols: 2, rows: 1} and fit() calls
    // terminal.resize(2, 1), which destructively reflows the whole
    // scrollback buffer to 2 columns wide, permanently mangling it. This is
    // what garbled the terminal into scrambled/overlapping short lines when
    // switching tabs. handleContainerResize() must refuse to fit() at all
    // while the terminal is inactive (hidden), regardless of suppressNextResize.
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-hidden-fit', onResize });

    const fakeXterm = makeFakeXterm();
    const fakeFitAddon = { fit: jest.fn() };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any)._isActive = false; // tab was just hidden
    (terminal as any).suppressNextResize = false; // already consumed, or never armed

    (terminal as any).handleContainerResize();

    expect(fakeFitAddon.fit).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it('handleContainerResize() still fits/resizes on a genuine resize while active', () => {
    const onResize = jest.fn();
    const terminal = new Terminal({ terminalId: 'test-term-active-fit', onResize });

    const fakeXterm = makeFakeXterm();
    fakeXterm.cols = 80;
    fakeXterm.rows = 24;
    const fakeFitAddon = {
      fit: jest.fn(() => { fakeXterm.cols = 100; fakeXterm.rows = 30; }),
    };
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = fakeFitAddon;
    (terminal as any).ptyCreated = true;
    (terminal as any)._isActive = true; // tab is visible on screen
    (terminal as any).suppressNextResize = false;

    (terminal as any).handleContainerResize();

    expect(fakeFitAddon.fit).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith(100, 30);
  });

  it('re-activating after deactivation re-arms suppressNextResize every time', () => {
    const terminal = new Terminal({ terminalId: 'test-term-suppress-2' });

    const fakeXterm = makeFakeXterm();
    (terminal as any).terminal = fakeXterm;
    (terminal as any).fitAddon = { fit: jest.fn() };
    (terminal as any).ptyCreated = true;
    (terminal as any).isReady = true;

    terminal.isActive = true;
    (terminal as any).suppressNextResize = false; // consumed by the observer

    terminal.isActive = false;
    expect((terminal as any).suppressNextResize).toBe(false); // deactivation does not arm it

    terminal.isActive = true;
    expect((terminal as any).suppressNextResize).toBe(true); // re-activation arms it again
  });
});
