/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { ImageEditor } from '../../renderer/components/ImageEditor';

jest.mock('../../core/image/image-editor', () => ({
  ImageEditorService: {
    getMimeType: jest.fn(() => 'image/jpeg'),
    openImage: jest.fn().mockResolvedValue('file:///fake.jpg'),
  },
}));

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 400;
  height = 300;
  private _src = '';
  set src(v: string) {
    this._src = v;
    setTimeout(() => this.onload?.(), 0);
  }
  get src(): string { return this._src; }
}

function clickButton(root: HTMLElement, text: string): void {
  const btn = [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text);
  if (!btn) throw new Error(`Button not found: ${text}`);
  if (btn.disabled) throw new Error(`Button is disabled: ${text}`);
  btn.click();
}

function dispatchMouse(target: EventTarget, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0 }));
}

function getOverlay(root: HTMLElement): HTMLElement {
  const overlay = root.querySelector('.crop-overlay');
  if (!overlay) throw new Error('Crop overlay not found');
  return overlay as HTMLElement;
}

// mode: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' — matches the
// data-crop-handle attribute set on both the edge-strip and corner handles.
function getHandle(overlay: HTMLElement, mode: string): HTMLElement {
  const handle = overlay.querySelector(`[data-crop-handle="${mode}"]`);
  if (!handle) throw new Error(`Handle not found: ${mode}`);
  return handle as HTMLElement;
}

describe('ImageEditor crop handles (mspaint-style drag-to-crop)', () => {
  let container: HTMLElement;
  let editor: ImageEditor;
  let originalImage: typeof Image;

  beforeEach(async () => {
    originalImage = (global as any).Image;
    (global as any).Image = MockImage;

    container = document.createElement('div');
    document.body.appendChild(container);

    editor = new ImageEditor('C:/fake/path/test.jpg');
    editor.mount(container);

    // Flush loadImage()'s openImage() + getImageDimensions() promise chain.
    await new Promise(r => setTimeout(r, 20));
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
    (global as any).Image = originalImage;
    jest.clearAllMocks();
  });

  it('entering crop mode selects the full image with a visible overlay', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    expect(overlay.style.left).toBe('0px');
    expect(overlay.style.top).toBe('0px');
    expect(overlay.style.width).toBe('400px');
    expect(overlay.style.height).toBe('300px');
  });

  it('exposes a data-crop-handle target for all 4 edges and 4 corners', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    for (const mode of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      expect(() => getHandle(overlay, mode)).not.toThrow();
    }
  });

  it('dragging anywhere along the east (right) edge strip resizes from that edge, not just an exact midpoint', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    const eastEdge = getHandle(overlay, 'e');

    // Grab near the top of the right edge, not the exact vertical midpoint —
    // this is what a real, imprecise mouse drag looks like.
    dispatchMouse(eastEdge, 'mousedown', 500, 40);
    dispatchMouse(window, 'mousemove', 400, 40); // drag 100px left
    dispatchMouse(window, 'mouseup', 400, 40);

    const updated = getOverlay(editor.getElement());
    expect(updated.style.left).toBe('0px');
    expect(updated.style.width).toBe('300px'); // 400 - 100
    expect(updated.style.height).toBe('300px'); // unchanged
  });

  it('dragging the south (bottom) edge shrinks the crop region from that edge', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    const southEdge = getHandle(overlay, 's');

    dispatchMouse(southEdge, 'mousedown', 200, 300);
    dispatchMouse(window, 'mousemove', 200, 220); // drag 80px up
    dispatchMouse(window, 'mouseup', 200, 220);

    const updated = getOverlay(editor.getElement());
    expect(updated.style.top).toBe('0px');
    expect(updated.style.height).toBe('220px'); // 300 - 80
    expect(updated.style.width).toBe('400px'); // unchanged
  });

  it('dragging the north (top) edge shrinks the crop region from that edge', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    const northEdge = getHandle(overlay, 'n');

    dispatchMouse(northEdge, 'mousedown', 200, 0);
    dispatchMouse(window, 'mousemove', 200, 60); // drag 60px down
    dispatchMouse(window, 'mouseup', 200, 60);

    const updated = getOverlay(editor.getElement());
    expect(updated.style.top).toBe('60px');
    expect(updated.style.height).toBe('240px'); // 300 - 60
    expect(updated.style.width).toBe('400px'); // unchanged
  });

  it('dragging the west (left) edge shrinks the crop region from that edge', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    const westEdge = getHandle(overlay, 'w');

    dispatchMouse(westEdge, 'mousedown', 0, 150);
    dispatchMouse(window, 'mousemove', 50, 150); // drag 50px right
    dispatchMouse(window, 'mouseup', 50, 150);

    const updated = getOverlay(editor.getElement());
    expect(updated.style.left).toBe('50px');
    expect(updated.style.width).toBe('350px'); // 400 - 50
    expect(updated.style.height).toBe('300px'); // unchanged
  });

  it('dragging the south-east corner handle resizes both axes', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    const seHandle = getHandle(overlay, 'se');

    dispatchMouse(seHandle, 'mousedown', 400, 300);
    dispatchMouse(window, 'mousemove', 300, 250); // -100 x, -50 y
    dispatchMouse(window, 'mouseup', 300, 250);

    const updated = getOverlay(editor.getElement());
    expect(updated.style.width).toBe('300px');
    expect(updated.style.height).toBe('250px');
  });

  it('dragging a handle does not also start panning the viewport (propagation must stop)', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    const eastEdge = getHandle(overlay, 'e');
    const viewport = editor.getElement().querySelector('.image-viewport-scroll') as HTMLElement;
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;

    dispatchMouse(eastEdge, 'mousedown', 500, 200);
    dispatchMouse(window, 'mousemove', 350, 260);
    dispatchMouse(window, 'mouseup', 350, 260);

    expect(viewport.scrollLeft).toBe(0);
    expect(viewport.scrollTop).toBe(0);
  });

  it('dragging inside the (already shrunk) selection moves it without resizing', () => {
    clickButton(editor.getElement(), 'Crop');
    let overlay = getOverlay(editor.getElement());

    // Shrink both axes first so there's room to move in both directions:
    // 400x300 -> 300x300 (east) -> 300x200 (south).
    const eastEdge = getHandle(overlay, 'e');
    dispatchMouse(eastEdge, 'mousedown', 300, 150);
    dispatchMouse(window, 'mousemove', 200, 150);
    dispatchMouse(window, 'mouseup', 200, 150);

    overlay = getOverlay(editor.getElement());
    const southEdge = getHandle(overlay, 's');
    dispatchMouse(southEdge, 'mousedown', 100, 300);
    dispatchMouse(window, 'mousemove', 100, 200);
    dispatchMouse(window, 'mouseup', 100, 200);

    overlay = getOverlay(editor.getElement());
    expect(overlay.style.width).toBe('300px');
    expect(overlay.style.height).toBe('200px');

    // Now drag the overlay body itself to move the selection.
    dispatchMouse(overlay, 'mousedown', 100, 100);
    dispatchMouse(window, 'mousemove', 150, 120); // +50 x, +20 y
    dispatchMouse(window, 'mouseup', 150, 120);

    const moved = getOverlay(editor.getElement());
    expect(moved.style.left).toBe('50px');
    expect(moved.style.top).toBe('20px');
    expect(moved.style.width).toBe('300px'); // unchanged by the move
    expect(moved.style.height).toBe('200px');
  });

  it('does not let an edge drag push the crop region outside the image bounds', () => {
    clickButton(editor.getElement(), 'Crop');
    const overlay = getOverlay(editor.getElement());
    const eastEdge = getHandle(overlay, 'e');

    // Try to drag the east edge far past the right edge of a 400px-wide image.
    dispatchMouse(eastEdge, 'mousedown', 400, 150);
    dispatchMouse(window, 'mousemove', 2000, 150);
    dispatchMouse(window, 'mouseup', 2000, 150);

    const updated = getOverlay(editor.getElement());
    expect(updated.style.width).toBe('400px');
  });
});
