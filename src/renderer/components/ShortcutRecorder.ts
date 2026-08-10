/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * ShortcutRecorder - click-to-record keyboard shortcut input.
 * Click the box, press a key combination, and it reports the captured
 * Electron-accelerator-format string via onCapture. Escape cancels.
 * Purely a capture widget — conflict checking and persistence are the
 * caller's job (see SettingsTab's keyboard shortcuts section).
 */

import { Component } from '../core/component.js';
import { el, setStyles } from '../core/dom.js';
import { formatAcceleratorForDisplay, acceleratorFromKeyboardEvent } from '../../core/shortcuts/shortcut-registry.js';

export interface ShortcutRecorderOptions {
  onCapture: (accelerator: string) => void;
  disabled?: boolean;
}

export class ShortcutRecorder extends Component {
  private boxEl: HTMLElement;
  private recording = false;
  private currentValue: string | null;
  private opts: ShortcutRecorderOptions;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(value: string | null, opts: ShortcutRecorderOptions) {
    super('div');
    this.currentValue = value;
    this.opts = opts;

    this.boxEl = el('div');
    this.el.appendChild(this.boxEl);
    this.boxEl.addEventListener('click', () => this.startRecording());
    this.renderBox();
  }

  setValue(value: string | null): void {
    this.currentValue = value;
    if (!this.recording) this.renderBox();
  }

  setDisabled(disabled: boolean): void {
    this.opts.disabled = disabled;
    if (!this.recording) this.renderBox();
  }

  private startRecording(): void {
    if (this.opts.disabled || this.recording) return;
    this.recording = true;
    this.renderBox();

    this.keyHandler = (e: KeyboardEvent) => this.handleKeydown(e);
    // Capture phase + preventDefault so the combo never reaches Monaco,
    // xterm, or a native menu accelerator while we're recording it.
    window.addEventListener('keydown', this.keyHandler, true);
  }

  private stopRecording(): void {
    this.recording = false;
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    this.renderBox();
  }

  private handleKeydown(e: KeyboardEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      this.stopRecording();
      return;
    }

    const accelerator = acceleratorFromKeyboardEvent(e);
    if (!accelerator) return; // only modifier keys held so far — keep waiting

    this.stopRecording();
    this.opts.onCapture(accelerator);
  }

  private renderBox(): void {
    const disabled = !!this.opts.disabled;
    setStyles(this.boxEl, {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: '160px', padding: '6px 10px', borderRadius: '2px',
      fontFamily: "'Consolas', 'Courier New', monospace", fontSize: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
      border: this.recording ? '1px solid #007acc' : '1px solid #3e3e42',
      background: this.recording ? 'rgba(0, 122, 204, 0.15)' : '#3c3c3c',
      color: disabled ? '#858585' : '#cccccc',
    });
    this.boxEl.textContent = this.recording
      ? 'Press a key combination… (Esc to cancel)'
      : formatAcceleratorForDisplay(this.currentValue);
    this.boxEl.title = disabled ? '' : 'Click, then press a key combination';
  }

  /** True while actively listening for a keypress — used by the owner to
   * know whether it's safe to tear this instance down mid-recording. */
  get isRecording(): boolean {
    return this.recording;
  }

  protected onDestroy(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
  }
}
