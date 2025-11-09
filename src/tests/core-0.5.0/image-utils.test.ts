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
} from '../../core/image/image-utils';

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
});

