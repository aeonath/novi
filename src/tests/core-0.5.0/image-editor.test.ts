/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { ImageEditorService } from '../../core/image/image-editor';

describe('ImageEditorService', () => {
  describe('canOpenFile', () => {
    it('should return true for supported image files', () => {
      expect(ImageEditorService.canOpenFile('test.png')).toBe(true);
      expect(ImageEditorService.canOpenFile('test.jpg')).toBe(true);
      expect(ImageEditorService.canOpenFile('test.jpeg')).toBe(true);
      expect(ImageEditorService.canOpenFile('test.gif')).toBe(true);
      expect(ImageEditorService.canOpenFile('test.webp')).toBe(true);
      expect(ImageEditorService.canOpenFile('test.avif')).toBe(true);
    });

    it('should return false for unsupported files', () => {
      expect(ImageEditorService.canOpenFile('test.txt')).toBe(false);
      expect(ImageEditorService.canOpenFile('test.js')).toBe(false);
      expect(ImageEditorService.canOpenFile('test.pdf')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(ImageEditorService.canOpenFile('test.PNG')).toBe(true);
      expect(ImageEditorService.canOpenFile('test.JPEG')).toBe(true);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(ImageEditorService.getMimeType('test.png')).toBe('image/png');
      expect(ImageEditorService.getMimeType('test.jpg')).toBe('image/jpeg');
      expect(ImageEditorService.getMimeType('test.jpeg')).toBe('image/jpeg');
      expect(ImageEditorService.getMimeType('test.gif')).toBe('image/gif');
      expect(ImageEditorService.getMimeType('test.webp')).toBe('image/webp');
      expect(ImageEditorService.getMimeType('test.avif')).toBe('image/avif');
    });

    it('should return null for unsupported extensions', () => {
      expect(ImageEditorService.getMimeType('test.txt')).toBeNull();
      expect(ImageEditorService.getMimeType('test.pdf')).toBeNull();
    });
  });

  describe('openImage', () => {
    it('should return file URL for supported images', async () => {
      const result = await ImageEditorService.openImage('C:/test/image.png');
      expect(result).toBe('file:///C:/test/image.png');
    });

    it('should convert backslashes to forward slashes', async () => {
      const result = await ImageEditorService.openImage('C:\\test\\image.png');
      expect(result).toBe('file:///C:/test/image.png');
    });

    it('should throw error for unsupported file types', async () => {
      await expect(ImageEditorService.openImage('test.txt')).rejects.toThrow(
        'File is not a supported image type'
      );
    });

    it('should log console messages', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await ImageEditorService.openImage('C:/test/image.png');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ImageEditor] Opening image:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ImageEditor] Detected MIME type:')
      );

      consoleLogSpy.mockRestore();
    });
  });
});

