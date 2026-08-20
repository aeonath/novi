/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import {
  isImageFile,
  getMimeType,
  getFileExtension,
  pathToFileUrl,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_IMAGE_EXTENSIONS,
  getDataUrlImageFormat,
  getImageBase64Payload,
  normalizeImageSaveFormat,
  applyImageSaveExtension,
  buildImageSaveAsDialogOptions,
} from '../../core/image/image-utils';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Image Utils', () => {
  describe('getFileExtension', () => {
    it('should return file extension in lowercase with dot', () => {
      expect(getFileExtension('test.PNG')).toBe('.png');
      expect(getFileExtension('path/to/file.JPG')).toBe('.jpg');
      expect(getFileExtension('C:\\Users\\test.JPEG')).toBe('.jpeg');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('test')).toBe('');
      expect(getFileExtension('path/to/file')).toBe('');
    });

    it('should handle multiple dots in filename', () => {
      expect(getFileExtension('test.backup.png')).toBe('.png');
      expect(getFileExtension('file.min.js.gif')).toBe('.gif');
    });
  });

  describe('isImageFile', () => {
    it('should return true for supported image extensions', () => {
      expect(isImageFile('test.png')).toBe(true);
      expect(isImageFile('test.jpg')).toBe(true);
      expect(isImageFile('test.jpeg')).toBe(true);
      expect(isImageFile('test.gif')).toBe(true);
      expect(isImageFile('test.webp')).toBe(true);
      expect(isImageFile('test.avif')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isImageFile('test.PNG')).toBe(true);
      expect(isImageFile('test.JpG')).toBe(true);
      expect(isImageFile('test.WEBP')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(isImageFile('test.txt')).toBe(false);
      expect(isImageFile('test.js')).toBe(false);
      expect(isImageFile('test.pdf')).toBe(false);
      expect(isImageFile('test.mp4')).toBe(false);
    });

    it('should return false for files without extension', () => {
      expect(isImageFile('test')).toBe(false);
      expect(isImageFile('path/to/file')).toBe(false);
    });

    it('should work with full paths', () => {
      expect(isImageFile('C:\\Users\\test\\image.png')).toBe(true);
      expect(isImageFile('/home/user/pictures/photo.jpg')).toBe(true);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for supported images', () => {
      expect(getMimeType('test.png')).toBe('image/png');
      expect(getMimeType('test.jpg')).toBe('image/jpeg');
      expect(getMimeType('test.jpeg')).toBe('image/jpeg');
      expect(getMimeType('test.gif')).toBe('image/gif');
      expect(getMimeType('test.webp')).toBe('image/webp');
      expect(getMimeType('test.avif')).toBe('image/avif');
    });

    it('should be case-insensitive', () => {
      expect(getMimeType('test.PNG')).toBe('image/png');
      expect(getMimeType('test.JPG')).toBe('image/jpeg');
    });

    it('should return null for unsupported extensions', () => {
      expect(getMimeType('test.txt')).toBeNull();
      expect(getMimeType('test.pdf')).toBeNull();
      expect(getMimeType('test')).toBeNull();
    });
  });

  describe('pathToFileUrl', () => {
    it('should convert Windows paths to file URLs', () => {
      const result = pathToFileUrl('C:/Users/test/image.png');
      expect(result).toBe('file:///C:/Users/test/image.png');
    });

    it('should convert Unix paths to file URLs', () => {
      const result = pathToFileUrl('/home/user/image.png');
      expect(result).toBe('file:///home/user/image.png');
    });

    it('should handle backslashes', () => {
      const result = pathToFileUrl('C:\\Users\\test\\image.png');
      expect(result).toBe('file:///C:/Users/test/image.png');
    });

    it('should return file:// URLs unchanged', () => {
      const url = 'file:///C:/Users/test/image.png';
      expect(pathToFileUrl(url)).toBe(url);
    });

    it('should throw on invalid paths', () => {
      expect(() => pathToFileUrl('not-a-path')).toThrow();
      expect(() => pathToFileUrl('relative/path')).toThrow();
    });
  });

  describe('SUPPORTED_IMAGE_TYPES constant', () => {
    it('should contain all expected MIME types', () => {
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/png');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpeg');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpg');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/gif');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/webp');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/avif');
    });
  });

  describe('SUPPORTED_IMAGE_EXTENSIONS constant', () => {
    it('should contain all expected extensions', () => {
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.png');
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.jpg');
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.jpeg');
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.gif');
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.webp');
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.avif');
    });
  });

  describe('normalizeImageSaveFormat', () => {
    it('maps jpeg MIME types to jpg', () => {
      expect(normalizeImageSaveFormat('image/jpeg')).toBe('jpg');
      expect(normalizeImageSaveFormat('jpeg')).toBe('jpg');
      expect(normalizeImageSaveFormat('JPG')).toBe('jpg');
    });

    it('keeps png/webp/gif/avif and defaults unknown values to png', () => {
      expect(normalizeImageSaveFormat('image/png')).toBe('png');
      expect(normalizeImageSaveFormat('webp')).toBe('webp');
      expect(normalizeImageSaveFormat('unknown')).toBe('png');
      expect(normalizeImageSaveFormat(null)).toBe('png');
    });
  });

  describe('getDataUrlImageFormat / getImageBase64Payload', () => {
    // 1x1 transparent PNG
    const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`;

    it('reads the format from a data URL and returns null for file:// URLs', () => {
      expect(getDataUrlImageFormat(PNG_DATA_URL)).toBe('png');
      expect(getDataUrlImageFormat('data:image/jpeg;base64,/9j/4AAQ')).toBe('jpg');
      expect(getDataUrlImageFormat('file:///C:/photos/pic.png')).toBeNull();
    });

    it('strips the data-URL prefix so the payload can be written as binary', () => {
      expect(getImageBase64Payload(PNG_DATA_URL)).toBe(PNG_B64);
    });

    it('rejects file:// URLs instead of treating the path as image bytes', () => {
      expect(() => getImageBase64Payload('file:///C:/photos/pic.png')).toThrow(/base64 image data URL/);
    });

    it('writing the payload with encoding base64 produces a real PNG signature (not ASCII "iVBO")', async () => {
      const payload = getImageBase64Payload(PNG_DATA_URL);
      const tmp = join(tmpdir(), `novi-image-save-${Date.now()}.png`);
      try {
        await writeFile(tmp, payload, 'base64');
        const bytes = await readFile(tmp);
        expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);

        // The previous bug: saving the same payload as UTF-8 stored the
        // base64 characters themselves, so the file was not a PNG.
        const corrupt = Buffer.from(payload, 'utf-8');
        expect([...corrupt.subarray(0, 4)]).toEqual([0x69, 0x56, 0x42, 0x4f]); // "iVBO"
      } finally {
        await unlink(tmp).catch(() => undefined);
      }
    });
  });

  describe('applyImageSaveExtension', () => {
    it('replaces a Windows text-dialog .txt extension with the chosen image type', () => {
      expect(applyImageSaveExtension('C:\\photos\\cat.txt', 'png')).toBe('C:\\photos\\cat.png');
      expect(applyImageSaveExtension('C:\\photos\\cat.txt', 'jpg')).toBe('C:\\photos\\cat.jpg');
      expect(applyImageSaveExtension('/tmp/cat.txt', 'webp')).toBe('/tmp/cat.webp');
    });

    it('appends the extension when the OS dialog returns a name with none', () => {
      expect(applyImageSaveExtension('C:\\photos\\cat', 'png')).toBe('C:\\photos\\cat.png');
    });

    it('keeps the path when it already has the right extension', () => {
      expect(applyImageSaveExtension('C:\\photos\\cat.png', 'png')).toBe('C:\\photos\\cat.png');
    });
  });

  describe('buildImageSaveAsDialogOptions', () => {
    it('suggests a .png defaultPath and PNG save-as-type, never a text-file filter', () => {
      const options = buildImageSaveAsDialogOptions('C:/photos/vacation.jpg', 'png');
      expect(options.defaultPath).toBe('C:/photos/vacation.png');
      expect(options.forcedExtension).toBe('png');
      expect(options.filters[0]).toEqual({ name: 'PNG Image', extensions: ['png'] });
      expect(options.filters.some(f => f.extensions.includes('txt'))).toBe(false);
    });

    it('uses lastSaveDirectory when provided and jpg filters include jpeg', () => {
      const options = buildImageSaveAsDialogOptions('C:/photos/vacation.png', 'jpg', 'D:\\exports');
      expect(options.defaultPath).toBe('D:\\exports\\vacation.jpg');
      expect(options.filters[0].extensions).toEqual(['jpg', 'jpeg']);
    });
  });
});

