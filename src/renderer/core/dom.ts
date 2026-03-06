/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Lightweight DOM helpers for readable element creation without JSX.
 */

type Child = HTMLElement | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

/**
 * Create an HTML element with attributes and children.
 *
 * @example
 *   el('div', { className: 'panel' },
 *     el('span', {}, 'Hello'),
 *     el('button', { onclick: handleClick }, 'Click me')
 *   )
 */
export function el(tag: string, attrs?: Attrs, ...children: Child[]): HTMLElement {
  const element = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === false) continue;

      if (key === 'className') {
        element.className = String(value);
      } else if (key === 'style' && typeof value === 'string') {
        element.style.cssText = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase();
        element.addEventListener(event, value as EventListener);
      } else if (key === 'dataset' || key === 'data') {
        // skip — use data-* attributes directly
      } else if (typeof value === 'boolean') {
        if (value) element.setAttribute(key, '');
      } else {
        element.setAttribute(key, String(value));
      }
    }
  }

  appendChildren(element, children);
  return element;
}

/** Append children (elements or text nodes) to a parent */
export function appendChildren(parent: HTMLElement, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string') {
      parent.appendChild(document.createTextNode(child));
    } else {
      parent.appendChild(child);
    }
  }
}

/** Remove all children from an element */
export function clearChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/** Set multiple inline styles at once */
export function setStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, styles);
}

/** Show/hide an element via display property */
export function setVisible(element: HTMLElement, visible: boolean, display: string = 'flex'): void {
  element.style.display = visible ? display : 'none';
}
