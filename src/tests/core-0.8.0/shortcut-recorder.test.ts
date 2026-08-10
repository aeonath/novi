/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { ShortcutRecorder } from '../../renderer/components/ShortcutRecorder';

function dispatchKey(init: Partial<KeyboardEventInit> & { key: string }): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
}

describe('ShortcutRecorder', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('shows the initial value formatted for display', () => {
    const recorder = new ShortcutRecorder('CmdOrCtrl+N', { onCapture: jest.fn() });
    recorder.mount(container);
    expect(recorder.getElement().textContent).toBe('Ctrl+N');
    recorder.destroy();
  });

  it('shows (none) when the initial value is null', () => {
    const recorder = new ShortcutRecorder(null, { onCapture: jest.fn() });
    recorder.mount(container);
    expect(recorder.getElement().textContent).toBe('(none)');
    recorder.destroy();
  });

  it('clicking enters recording mode and shows the prompt', () => {
    const recorder = new ShortcutRecorder('CmdOrCtrl+N', { onCapture: jest.fn() });
    recorder.mount(container);
    (recorder.getElement().firstChild as HTMLElement).click();
    expect(recorder.isRecording).toBe(true);
    expect(recorder.getElement().textContent).toContain('Press a key combination');
    recorder.destroy();
  });

  it('a lone modifier keypress keeps waiting instead of capturing', () => {
    const onCapture = jest.fn();
    const recorder = new ShortcutRecorder('CmdOrCtrl+N', { onCapture });
    recorder.mount(container);
    (recorder.getElement().firstChild as HTMLElement).click();

    dispatchKey({ key: 'Control', ctrlKey: true });

    expect(recorder.isRecording).toBe(true);
    expect(onCapture).not.toHaveBeenCalled();
    recorder.destroy();
  });

  it('capturing Ctrl+Shift+P reports the accelerator and exits recording', () => {
    const onCapture = jest.fn();
    const recorder = new ShortcutRecorder('CmdOrCtrl+N', { onCapture });
    recorder.mount(container);
    (recorder.getElement().firstChild as HTMLElement).click();

    dispatchKey({ key: 'P', ctrlKey: true, shiftKey: true });

    expect(onCapture).toHaveBeenCalledWith('CmdOrCtrl+Shift+P');
    expect(recorder.isRecording).toBe(false);
    recorder.destroy();
  });

  it('Escape cancels recording without capturing, reverting to the prior display', () => {
    const onCapture = jest.fn();
    const recorder = new ShortcutRecorder('CmdOrCtrl+N', { onCapture });
    recorder.mount(container);
    (recorder.getElement().firstChild as HTMLElement).click();

    dispatchKey({ key: 'Escape' });

    expect(onCapture).not.toHaveBeenCalled();
    expect(recorder.isRecording).toBe(false);
    expect(recorder.getElement().textContent).toBe('Ctrl+N');
    recorder.destroy();
  });

  it('setValue updates the displayed accelerator when not recording', () => {
    const recorder = new ShortcutRecorder('CmdOrCtrl+N', { onCapture: jest.fn() });
    recorder.mount(container);
    recorder.setValue('CmdOrCtrl+Shift+P');
    expect(recorder.getElement().textContent).toBe('Ctrl+Shift+P');
    recorder.destroy();
  });

  it('disabled recorders do not enter recording mode on click', () => {
    const onCapture = jest.fn();
    const recorder = new ShortcutRecorder('CmdOrCtrl+N', { onCapture, disabled: true });
    recorder.mount(container);
    (recorder.getElement().firstChild as HTMLElement).click();

    expect(recorder.isRecording).toBe(false);
    dispatchKey({ key: 'P', ctrlKey: true });
    expect(onCapture).not.toHaveBeenCalled();
    recorder.destroy();
  });

  it('destroying mid-recording removes the window keydown listener (no leak, no late capture)', () => {
    const onCapture = jest.fn();
    const recorder = new ShortcutRecorder('CmdOrCtrl+N', { onCapture });
    recorder.mount(container);
    (recorder.getElement().firstChild as HTMLElement).click();
    expect(recorder.isRecording).toBe(true);

    recorder.destroy();
    dispatchKey({ key: 'P', ctrlKey: true });

    expect(onCapture).not.toHaveBeenCalled();
  });
});
