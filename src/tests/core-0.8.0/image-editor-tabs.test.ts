/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { planImageEditorSync } from '../../renderer/components/image-editor-sync';
import { ImageEditor } from '../../renderer/components/ImageEditor';

jest.mock('../../core/image/image-editor', () => ({
  ImageEditorService: {
    getMimeType: jest.fn((path: string) => (path.endsWith('.jpg') ? 'image/jpeg' : 'image/png')),
    openImage: jest.fn((path: string) => Promise.resolve(`file:///${path.replace(/\\/g, '/')}`)),
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

function flush(): Promise<void> {
  return new Promise(r => setTimeout(r, 20));
}

describe('planImageEditorSync', () => {
  it('does not destroy other image editors when switching the active image tab', () => {
    const plan = planImageEditorSync(
      [
        { id: 'tab-a', filePath: 'C:/Temp/testimage.png' },
        { id: 'tab-b', filePath: 'C:/Temp/test.png' },
        { id: 'tab-c', filePath: 'C:/Temp/sheliak-bg.png' },
      ],
      ['tab-a', 'tab-b', 'tab-c'],
      'tab-b',
      'image',
    );
    expect(plan.toCreate).toEqual([]);
    expect(plan.toDestroy).toEqual([]);
    expect(plan.activeId).toBe('tab-b');
  });

  it('keeps image editors alive when switching to a non-image tab', () => {
    const plan = planImageEditorSync(
      [{ id: 'tab-a', filePath: 'C:/Temp/testimage.png' }],
      ['tab-a'],
      'terminal-1',
      'terminal',
    );
    expect(plan.toDestroy).toEqual([]);
    expect(plan.activeId).toBeNull();
  });

  it('creates an editor for a newly opened image tab and only destroys closed ones', () => {
    const plan = planImageEditorSync(
      [
        { id: 'tab-a', filePath: 'C:/Temp/testimage.png' },
        { id: 'tab-b', filePath: 'C:/Temp/test.png' },
      ],
      ['tab-a', 'tab-gone'],
      'tab-b',
      'image',
    );
    expect(plan.toCreate).toEqual([{ id: 'tab-b', filePath: 'C:/Temp/test.png' }]);
    expect(plan.toDestroy).toEqual(['tab-gone']);
    expect(plan.activeId).toBe('tab-b');
  });
});

describe('multiple ImageEditor instances', () => {
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
    delete (window as any).api;
    jest.clearAllMocks();
  });

  it('destroying or hiding one editor leaves the other tab\'s image loaded', async () => {
    const wrapA = document.createElement('div');
    const wrapB = document.createElement('div');
    container.appendChild(wrapA);
    container.appendChild(wrapB);

    const editorA = new ImageEditor('C:/Temp/testimage.png');
    const editorB = new ImageEditor('C:/Temp/test.png');
    editorA.mount(wrapA);
    editorB.mount(wrapB);
    await flush();

    const imgA = editorA.getElement().querySelector('img') as HTMLImageElement;
    const imgB = editorB.getElement().querySelector('img') as HTMLImageElement;
    expect(imgA.src).toContain('testimage.png');
    expect(imgB.src).toContain('test.png');

    wrapA.style.display = 'none';
    editorA.setActive(false);
    editorB.setActive(true);

    expect(editorB.getElement().querySelector('img')).toBe(imgB);
    expect(imgB.src).toContain('test.png');
    expect(imgA.src).toContain('testimage.png');

    editorA.destroy();
    wrapA.remove();

    expect(editorB.getElement().querySelector('img')).toBe(imgB);
    expect(imgB.src).toContain('test.png');
    expect(imgB.style.display).not.toBe('none');

    editorB.destroy();
  });

  it('loads the image as a data URL so CSP does not block file:// after a tab switch', async () => {
    const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    (window as any).api = {
      readFile: jest.fn().mockResolvedValue({ path: 'C:/Temp/test.png', content: pngB64, size: 70, modified: new Date() }),
    };
    const editor = new ImageEditor('C:/Temp/test.png');
    editor.mount(container);
    await flush();

    const img = editor.getElement().querySelector('img') as HTMLImageElement;
    expect(img.src).toMatch(/^data:image\/png;base64,/);
    expect((window as any).api.readFile).toHaveBeenCalledWith('C:/Temp/test.png', 'base64');
    editor.destroy();
    delete (window as any).api;
  });
});
