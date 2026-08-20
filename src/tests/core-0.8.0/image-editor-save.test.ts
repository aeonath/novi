/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { ImageEditor } from '../../renderer/components/ImageEditor';

jest.mock('../../core/image/image-editor', () => ({
  ImageEditorService: {
    getMimeType: jest.fn(() => 'image/png'),
    openImage: jest.fn().mockResolvedValue('file:///fake.png'),
  },
}));

const mockCropImage = jest.fn();
const mockConvertFormat = jest.fn();
jest.mock('../../core/image/image-utils', () => {
  const actual = jest.requireActual('../../core/image/image-utils');
  return {
    ...actual,
    cropImage: (...args: unknown[]) => mockCropImage(...args),
    convertFormat: (...args: unknown[]) => mockConvertFormat(...args),
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

function getHandle(root: HTMLElement, mode: string): HTMLElement {
  const handle = root.querySelector(`[data-crop-handle="${mode}"]`);
  if (!handle) throw new Error(`Handle not found: ${mode}`);
  return handle as HTMLElement;
}

function clickButton(root: HTMLElement, text: string): void {
  const btn = [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text);
  if (!btn) throw new Error(`Button not found: ${text}`);
  btn.click();
}

function flush(): Promise<void> {
  return new Promise(r => setTimeout(r, 20));
}

// 1x1 transparent PNG — same fixture as image-utils.test.ts
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`;

describe('ImageEditor save writes binary image bytes', () => {
  let container: HTMLElement;
  let editor: ImageEditor;
  let originalImage: typeof Image;
  let saveFile: jest.Mock;
  let saveFileAs: jest.Mock;

  beforeEach(async () => {
    originalImage = (global as any).Image;
    (global as any).Image = MockImage;
    mockCropImage.mockReset();
    mockCropImage.mockResolvedValue(PNG_DATA_URL);
    mockConvertFormat.mockReset();
    mockConvertFormat.mockResolvedValue(PNG_DATA_URL);

    saveFile = jest.fn().mockResolvedValue({ path: 'C:/fake/path/test.png', size: 70, modified: new Date() });
    saveFileAs = jest.fn().mockResolvedValue({ path: 'C:/fake/path/test.png', size: 70, modified: new Date() });
    (window as any).api = {
      saveFile,
      saveFileAs,
      getSetting: jest.fn().mockResolvedValue(undefined),
      setSetting: jest.fn().mockResolvedValue(undefined),
    };

    container = document.createElement('div');
    document.body.appendChild(container);

    editor = new ImageEditor('C:/fake/path/test.png');
    editor.mount(container);
    await flush();
  });

  afterEach(() => {
    editor.destroy();
    container.remove();
    (global as any).Image = originalImage;
    delete (window as any).api;
    jest.clearAllMocks();
  });

  it('saves the cropped image as a base64 payload with encoding "base64", not a file:// URL or UTF-8 text', async () => {
    const eastEdge = getHandle(editor.getElement(), 'e');
    dispatchMouse(eastEdge, 'mousedown', 400, 150);
    dispatchMouse(window, 'mousemove', 300, 150);
    dispatchMouse(window, 'mouseup', 300, 150);
    await flush();

    clickButton(editor.getElement(), 'Save');
    await flush();

    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(saveFile).toHaveBeenCalledWith('C:/fake/path/test.png', PNG_B64, 'base64');
    expect(saveFile.mock.calls[0][1]).not.toMatch(/^data:/);
    expect(saveFile.mock.calls[0][1]).not.toMatch(/^file:/);
  });

  it('Save As PNG asks the native dialog for a .png file, not a text-file type', async () => {
    clickButton(editor.getElement(), 'Save As...');
    const modalSaveAs = [...document.body.querySelectorAll('button')]
      .reverse()
      .find(b => b.textContent?.trim() === 'Save As...');
    if (!modalSaveAs) throw new Error('Modal Save As button not found');
    modalSaveAs.click();
    await flush();

    expect(saveFileAs).toHaveBeenCalledTimes(1);
    const [, encoding, options] = saveFileAs.mock.calls[0];
    expect(encoding).toBe('base64');
    expect(options.forcedExtension).toBe('png');
    expect(options.defaultPath).toMatch(/\.png$/);
    expect(options.filters[0].extensions).toEqual(['png']);
    expect(options.filters.some((f: { extensions: string[] }) => f.extensions.includes('txt'))).toBe(false);
  });
});
