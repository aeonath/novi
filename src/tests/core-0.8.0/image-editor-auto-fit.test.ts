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

function setViewportSize(viewport: HTMLElement, clientWidth: number, clientHeight: number): void {
  Object.defineProperty(viewport, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(viewport, 'clientHeight', { value: clientHeight, configurable: true });
}

function getViewport(root: HTMLElement): HTMLElement {
  return root.querySelector('.image-viewport-scroll') as HTMLElement;
}

function getZoomInput(root: HTMLElement): HTMLInputElement {
  const input = [...root.querySelectorAll<HTMLInputElement>('input[type="text"]')]
    .find(i => i.title === 'Zoom percentage');
  if (!input) throw new Error('Zoom input not found');
  return input;
}

function clickButton(root: HTMLElement, text: string): void {
  const btn = [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text);
  if (!btn) throw new Error(`Button not found: ${text}`);
  btn.click();
}

function flush(): Promise<void> {
  return new Promise(r => setTimeout(r, 20));
}

describe('ImageEditor auto-fit-to-window zoom', () => {
  let container: HTMLElement;
  let originalImage: typeof Image;

  beforeEach(() => {
    originalImage = (global as any).Image;
    (global as any).Image = MockImage;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    (global as any).Image = originalImage;
    jest.clearAllMocks();
  });

  it('shrinks a large image to fit the viewport and shows the computed percentage', async () => {
    const editor = new ImageEditor('C:/fake/path/test.jpg');
    // viewportEl exists as soon as the constructor runs — size it before mount()
    // triggers the async load, so applyAutoFit() sees it once dims resolve.
    setViewportSize(getViewport(editor.getElement()), 240, 1000); // 200x960 available (20px padding each side)
    editor.mount(container);
    await flush();

    // fit = min(1, 200/400, 960/300) = min(1, 0.5, 3.2) = 0.5
    const img = editor.getElement().querySelector('img') as HTMLImageElement;
    expect(img.style.width).toBe('200px');
    expect(img.style.height).toBe('150px');
    expect(getZoomInput(editor.getElement()).value).toBe('50');

    editor.destroy();
  });

  it('does not upscale a small image to fill a much larger viewport', async () => {
    const editor = new ImageEditor('C:/fake/path/test.jpg');
    setViewportSize(getViewport(editor.getElement()), 2040, 1340); // 2000x1300 available
    editor.mount(container);
    await flush();

    // fit = min(1, 2000/400, 1300/300) = min(1, 5, 4.33) = 1 (never upscale)
    const img = editor.getElement().querySelector('img') as HTMLImageElement;
    expect(img.style.width).toBe('400px');
    expect(img.style.height).toBe('300px');
    expect(getZoomInput(editor.getElement()).value).toBe('100');

    editor.destroy();
  });

  it('manually zooming stops auto-fit from overriding the chosen zoom on a later resize', async () => {
    const editor = new ImageEditor('C:/fake/path/test.jpg');
    const viewport = getViewport(editor.getElement());
    setViewportSize(viewport, 240, 1000); // fits at 50%
    editor.mount(container);
    await flush();
    expect(getZoomInput(editor.getElement()).value).toBe('50');

    // User manually zooms in.
    clickButton(editor.getElement(), '+');
    const zoomedValue = getZoomInput(editor.getElement()).value;
    expect(zoomedValue).not.toBe('50');

    // Simulate what the ResizeObserver would trigger on a later resize.
    setViewportSize(viewport, 4000, 4000);
    (editor as any).applyAutoFit();

    // Zoom must not have been silently reset back to a fit value.
    expect(getZoomInput(editor.getElement()).value).toBe(zoomedValue);

    editor.destroy();
  });

  it('Reset re-enables auto-fit so the image snaps back to fitting the window', async () => {
    const editor = new ImageEditor('C:/fake/path/test.jpg');
    const viewport = getViewport(editor.getElement());
    setViewportSize(viewport, 240, 1000); // fits at 50%
    editor.mount(container);
    await flush();
    expect(getZoomInput(editor.getElement()).value).toBe('50');

    clickButton(editor.getElement(), '+'); // manual zoom, disables auto-fit
    expect(getZoomInput(editor.getElement()).value).not.toBe('50');

    // Reset is only enabled once something has actually modified the image;
    // zoom alone (view-only) doesn't set that flag, so simulate a real edit
    // having happened — this test is only about what Reset does to zoom.
    (editor as any).isModified = true;
    (editor as any).renderToolbar();
    clickButton(editor.getElement(), 'Reset');
    expect(getZoomInput(editor.getElement()).value).toBe('50');

    editor.destroy();
  });

  it('does not touch zoom while the viewport has not been laid out yet (zero size)', async () => {
    const editor = new ImageEditor('C:/fake/path/test.jpg');
    // Leave clientWidth/clientHeight at their jsdom default of 0 (not visible/laid out).
    editor.mount(container);
    await flush();

    // Falls back to 100% rather than dividing by zero / going to 0%.
    expect(getZoomInput(editor.getElement()).value).toBe('100');

    editor.destroy();
  });
});
