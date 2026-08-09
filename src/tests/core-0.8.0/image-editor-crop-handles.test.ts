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

const mockCropImage = jest.fn();
jest.mock('../../core/image/image-utils', () => {
  const actual = jest.requireActual('../../core/image/image-utils');
  return {
    ...actual,
    cropImage: (...args: unknown[]) => mockCropImage(...args),
  };
});

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

function flush(): Promise<void> {
  return new Promise(r => setTimeout(r, 20));
}

describe('ImageEditor crop handles (always-on mspaint canvas-resize style)', () => {
  let container: HTMLElement;
  let editor: ImageEditor;
  let originalImage: typeof Image;

  beforeEach(async () => {
    originalImage = (global as any).Image;
    (global as any).Image = MockImage;
    mockCropImage.mockReset();
    mockCropImage.mockResolvedValue('data:image/png;base64,cropped');

    container = document.createElement('div');
    document.body.appendChild(container);

    editor = new ImageEditor('C:/fake/path/test.jpg');
    editor.mount(container);

    // Flush loadImage()'s openImage() + getImageDimensions() promise chain.
    await flush();
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
    (global as any).Image = originalImage;
    jest.clearAllMocks();
  });

  it('shows crop handles on the image immediately, with no separate "Crop" mode to enter first', () => {
    const overlay = getOverlay(editor.getElement());
    expect(overlay.style.left).toBe('0px');
    expect(overlay.style.top).toBe('0px');
    expect(overlay.style.width).toBe('400px');
    expect(overlay.style.height).toBe('300px');
    for (const mode of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      expect(() => getHandle(overlay, mode)).not.toThrow();
    }
  });

  it('there is no toolbar "Crop" button — handles are the only way to crop', () => {
    const labels = [...editor.getElement().querySelectorAll('button')].map(b => b.textContent?.trim());
    expect(labels).not.toContain('Crop');
    expect(labels).not.toContain('Apply Crop');
  });

  it('dragging anywhere along the east (right) edge strip live-previews a smaller region, not just an exact midpoint', () => {
    const overlay = getOverlay(editor.getElement());
    const eastEdge = getHandle(overlay, 'e');

    // Grab near the top of the right edge, not the exact vertical midpoint —
    // this is what a real, imprecise mouse drag looks like.
    dispatchMouse(eastEdge, 'mousedown', 500, 40);
    dispatchMouse(window, 'mousemove', 400, 40); // drag 100px left

    const preview = getOverlay(editor.getElement());
    expect(preview.style.left).toBe('0px');
    expect(preview.style.width).toBe('300px'); // 400 - 100
    expect(preview.style.height).toBe('300px'); // unchanged

    dispatchMouse(window, 'mouseup', 400, 40);
  });

  it('releasing an edge handle commits the crop immediately (no confirm dialog) and the handles re-anchor to the new size', async () => {
    const overlay = getOverlay(editor.getElement());
    const eastEdge = getHandle(overlay, 'e');

    dispatchMouse(eastEdge, 'mousedown', 500, 150);
    dispatchMouse(window, 'mousemove', 400, 150); // drag 100px left
    dispatchMouse(window, 'mouseup', 400, 150);
    await flush();

    expect(mockCropImage).toHaveBeenCalledWith('file:///fake.jpg', 0, 0, 300, 300);
    // No modal should appear — direct-manipulation, like mspaint.
    expect(document.querySelector('[class]')?.textContent).not.toContain('Confirm Crop');

    const committed = getOverlay(editor.getElement());
    expect(committed.style.width).toBe('300px');
    expect(committed.style.height).toBe('300px');
  });

  it('dragging the south (bottom) edge live-previews the region shrinking from that edge', () => {
    const overlay = getOverlay(editor.getElement());
    const southEdge = getHandle(overlay, 's');

    dispatchMouse(southEdge, 'mousedown', 200, 300);
    dispatchMouse(window, 'mousemove', 200, 220); // drag 80px up

    const preview = getOverlay(editor.getElement());
    expect(preview.style.top).toBe('0px');
    expect(preview.style.height).toBe('220px'); // 300 - 80
    expect(preview.style.width).toBe('400px'); // unchanged

    dispatchMouse(window, 'mouseup', 200, 220);
  });

  it('dragging the north (top) edge live-previews the region shrinking from that edge', () => {
    const overlay = getOverlay(editor.getElement());
    const northEdge = getHandle(overlay, 'n');

    dispatchMouse(northEdge, 'mousedown', 200, 0);
    dispatchMouse(window, 'mousemove', 200, 60); // drag 60px down

    const preview = getOverlay(editor.getElement());
    expect(preview.style.top).toBe('60px');
    expect(preview.style.height).toBe('240px'); // 300 - 60
    expect(preview.style.width).toBe('400px'); // unchanged

    dispatchMouse(window, 'mouseup', 200, 60);
  });

  it('dragging the west (left) edge live-previews the region shrinking from that edge', () => {
    const overlay = getOverlay(editor.getElement());
    const westEdge = getHandle(overlay, 'w');

    dispatchMouse(westEdge, 'mousedown', 0, 150);
    dispatchMouse(window, 'mousemove', 50, 150); // drag 50px right

    const preview = getOverlay(editor.getElement());
    expect(preview.style.left).toBe('50px');
    expect(preview.style.width).toBe('350px'); // 400 - 50
    expect(preview.style.height).toBe('300px'); // unchanged

    dispatchMouse(window, 'mouseup', 50, 150);
  });

  it('dragging the south-east corner handle live-previews both axes shrinking together', () => {
    const overlay = getOverlay(editor.getElement());
    const seHandle = getHandle(overlay, 'se');

    dispatchMouse(seHandle, 'mousedown', 400, 300);
    dispatchMouse(window, 'mousemove', 300, 250); // -100 x, -50 y

    const preview = getOverlay(editor.getElement());
    expect(preview.style.width).toBe('300px');
    expect(preview.style.height).toBe('250px');

    dispatchMouse(window, 'mouseup', 300, 250);
  });

  it('dragging a handle does not also start panning the viewport (propagation must stop)', () => {
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

  it('dragging the plain image interior (not a handle) pans the viewport instead of moving the crop region', () => {
    const imageContainer = editor.getElement().querySelector('.image-viewport-scroll > div') as HTMLElement;
    const viewport = editor.getElement().querySelector('.image-viewport-scroll') as HTMLElement;
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;

    dispatchMouse(imageContainer, 'mousedown', 200, 150);
    dispatchMouse(window, 'mousemove', 150, 100); // drag up-left by (50, 50)
    dispatchMouse(window, 'mouseup', 150, 100);

    // Pan moved the viewport...
    expect(viewport.scrollLeft).toBe(50);
    expect(viewport.scrollTop).toBe(50);
    // ...and did NOT touch the crop region (still the full image).
    const overlay = getOverlay(editor.getElement());
    expect(overlay.style.width).toBe('400px');
    expect(overlay.style.height).toBe('300px');
  });

  it('does not let an edge drag push the crop region outside the image bounds', () => {
    const overlay = getOverlay(editor.getElement());
    const eastEdge = getHandle(overlay, 'e');

    // Try to drag the east edge far past the right edge of a 400px-wide image.
    dispatchMouse(eastEdge, 'mousedown', 400, 150);
    dispatchMouse(window, 'mousemove', 2000, 150);

    const preview = getOverlay(editor.getElement());
    expect(preview.style.width).toBe('400px');

    dispatchMouse(window, 'mouseup', 2000, 150);
  });

  it('releasing without having moved a handle is a no-op (no cropImage call)', () => {
    const overlay = getOverlay(editor.getElement());
    const eastEdge = getHandle(overlay, 'e');

    dispatchMouse(eastEdge, 'mousedown', 400, 150);
    dispatchMouse(window, 'mouseup', 400, 150); // released without moving

    expect(mockCropImage).not.toHaveBeenCalled();
  });
});
