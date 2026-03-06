/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * SavePrompt - Dialog for unsaved changes confirmation (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, setStyles } from '../core/dom.js';

export interface SavePromptCallbacks {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export class SavePrompt extends Component {
  private dialog: HTMLElement;
  private fileNameEl: HTMLElement;
  private callbacks: SavePromptCallbacks | null = null;

  constructor() {
    super('div');

    // Overlay
    setStyles(this.el, {
      position: 'fixed',
      top: '0', left: '0', right: '0', bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10001',
    });

    this.fileNameEl = el('strong', {}, '');

    const messageP = el('p', {}, 'Do you want to save the changes to ', this.fileNameEl, '?');
    setStyles(messageP, { margin: '0', fontSize: '13px', color: '#cccccc', lineHeight: '1.5' });

    const subtitleP = el('p', {}, "Your changes will be lost if you don't save them.");
    setStyles(subtitleP, { margin: '8px 0 0 0', fontSize: '12px', color: '#858585', lineHeight: '1.5' });

    const cancelBtn = this.makeButton('Cancel', '#2d2d30', '#3e3e42', '#cccccc', '1px solid #454545');
    cancelBtn.addEventListener('click', () => this.callbacks?.onCancel());
    cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.backgroundColor = '#3e3e42'; });
    cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.backgroundColor = '#2d2d30'; });

    const discardBtn = this.makeButton("Don't Save", '#a01c1c', 'none', '#ffffff');
    discardBtn.addEventListener('click', () => this.callbacks?.onDiscard());
    discardBtn.addEventListener('mouseenter', () => { discardBtn.style.backgroundColor = '#c72e2e'; });
    discardBtn.addEventListener('mouseleave', () => { discardBtn.style.backgroundColor = '#a01c1c'; });

    const saveBtn = this.makeButton('Save', '#0e7aca', 'none', '#ffffff');
    saveBtn.addEventListener('click', () => this.callbacks?.onSave());
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.backgroundColor = '#0e639c'; });
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.backgroundColor = '#0e7aca'; });

    const buttonContainer = el('div', {}, cancelBtn, discardBtn, saveBtn);
    setStyles(buttonContainer, {
      display: 'flex', justifyContent: 'flex-end', gap: '8px',
      padding: '12px 20px', borderTop: '1px solid #3e3e42',
    });

    const header = el('div', {}, el('h3', {}, 'Unsaved Changes'));
    setStyles(header, { padding: '16px 20px', borderBottom: '1px solid #3e3e42' });
    const h3 = header.querySelector('h3') as HTMLElement;
    setStyles(h3, { margin: '0', fontSize: '14px', fontWeight: '600', color: '#cccccc' });

    const content = el('div', {}, messageP, subtitleP);
    setStyles(content, { padding: '20px' });

    this.dialog = el('div', {}, header, content, buttonContainer);
    setStyles(this.dialog, {
      backgroundColor: '#252526',
      border: '1px solid #454545',
      borderRadius: '6px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
      minWidth: '400px',
      maxWidth: '500px',
    });

    this.el.appendChild(this.dialog);
  }

  show(fileName: string, callbacks: SavePromptCallbacks): void {
    this.fileNameEl.textContent = fileName;
    this.callbacks = callbacks;
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
    this.callbacks = null;
  }

  private makeButton(text: string, bg: string, border: string, color: string, borderStyle?: string): HTMLElement {
    const btn = el('button', { type: 'button' }, text);
    setStyles(btn, {
      padding: '6px 16px',
      fontSize: '13px',
      fontWeight: '500',
      color,
      backgroundColor: bg,
      border: borderStyle || border,
      borderRadius: '3px',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
      outline: 'none',
    });
    return btn;
  }
}
