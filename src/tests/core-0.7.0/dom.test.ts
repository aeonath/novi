/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { el, clearChildren, setStyles, setVisible } from '../../renderer/core/dom';

describe('DOM helpers', () => {
  describe('el()', () => {
    it('should create element with tag', () => {
      const div = el('div');
      expect(div.tagName).toBe('DIV');
    });

    it('should set className', () => {
      const div = el('div', { className: 'panel' });
      expect(div.className).toBe('panel');
    });

    it('should set attributes', () => {
      const input = el('input', { type: 'text', placeholder: 'Name' });
      expect(input.getAttribute('type')).toBe('text');
      expect(input.getAttribute('placeholder')).toBe('Name');
    });

    it('should set style as cssText', () => {
      const div = el('div', { style: 'color: red; font-size: 14px' });
      expect(div.style.color).toBe('red');
    });

    it('should add event listeners for on* attributes', () => {
      const handler = jest.fn();
      const btn = el('button', { onclick: handler }, 'Click');
      btn.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should append text children', () => {
      const span = el('span', {}, 'Hello');
      expect(span.textContent).toBe('Hello');
    });

    it('should append element children', () => {
      const child = el('span', {}, 'inner');
      const parent = el('div', {}, child);
      expect(parent.children.length).toBe(1);
      expect(parent.children[0].textContent).toBe('inner');
    });

    it('should skip null/undefined/false children', () => {
      const div = el('div', {}, null, undefined, false, 'text');
      expect(div.childNodes.length).toBe(1);
      expect(div.textContent).toBe('text');
    });

    it('should skip undefined and false attribute values', () => {
      const div = el('div', { id: undefined, hidden: false });
      expect(div.hasAttribute('id')).toBe(false);
      expect(div.hasAttribute('hidden')).toBe(false);
    });

    it('should set boolean true attributes', () => {
      const input = el('input', { disabled: true });
      expect(input.hasAttribute('disabled')).toBe(true);
    });

    it('should handle numeric attributes', () => {
      const div = el('div', { tabindex: 0 });
      expect(div.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('clearChildren()', () => {
    it('should remove all children', () => {
      const div = el('div', {}, el('span'), el('span'), 'text');
      expect(div.childNodes.length).toBe(3);
      clearChildren(div);
      expect(div.childNodes.length).toBe(0);
    });
  });

  describe('setStyles()', () => {
    it('should apply multiple styles', () => {
      const div = document.createElement('div');
      setStyles(div, { color: 'red', fontSize: '14px' });
      expect(div.style.color).toBe('red');
      expect(div.style.fontSize).toBe('14px');
    });
  });

  describe('setVisible()', () => {
    it('should hide element', () => {
      const div = document.createElement('div');
      setVisible(div, false);
      expect(div.style.display).toBe('none');
    });

    it('should show element with default display', () => {
      const div = document.createElement('div');
      setVisible(div, true);
      expect(div.style.display).toBe('flex');
    });

    it('should show element with custom display', () => {
      const div = document.createElement('div');
      setVisible(div, true, 'block');
      expect(div.style.display).toBe('block');
    });
  });
});
