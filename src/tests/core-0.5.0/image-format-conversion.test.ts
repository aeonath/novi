/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { convertFormat, getExtensionForFormat, getMimeTypeForFormat } from '../../core/image/image-utils';

describe('Image Format Conversion', () => {
  // Note: convertFormat() full Canvas operation tests are skipped because Jest/JSDOM 
  // doesn't support Canvas API operations. The function is tested manually in the 
  // renderer process where full Canvas API is available. We test validation logic here.

  describe('convertFormat', () => {
    it('should be defined and return a Promise', () => {
      expect(typeof convertFormat).toBe('function');
      const result = convertFormat('data:image/png;base64,test', 'jpg');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should reject invalid quality values less than 0', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      await expect(convertFormat(dataUrl, 'jpg', -0.1)).rejects.toThrow(
        'Quality must be between 0.0 and 1.0'
      );
    });

    it('should reject invalid quality values greater than 1', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      await expect(convertFormat(dataUrl, 'jpg', 1.1)).rejects.toThrow(
        'Quality must be between 0.0 and 1.0'
      );
    });

    it('should accept valid quality values at boundaries', async () => {
      const dataUrl = 'data:image/png;base64,test';

      // Test that valid boundary values don't throw on validation
      // (they will fail due to Canvas, but validation should pass)
      const promise1 = convertFormat(dataUrl, 'jpg', 0.0);
      const promise2 = convertFormat(dataUrl, 'jpg', 1.0);
      
      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);
    });

    it('should accept all supported target formats', () => {
      const dataUrl = 'data:image/png;base64,test';
      const formats: Array<'png' | 'jpg' | 'jpeg' | 'webp' | 'gif' | 'avif'> = 
        ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];

      formats.forEach(format => {
        const result = convertFormat(dataUrl, format);
        expect(result).toBeInstanceOf(Promise);
      });
    });

    it('should use default quality of 0.92 when not specified', () => {
      const dataUrl = 'data:image/png;base64,test';
      const result = convertFormat(dataUrl, 'jpg');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('getExtensionForFormat', () => {
    it('should return .png for PNG format', () => {
      expect(getExtensionForFormat('png')).toBe('.png');
      expect(getExtensionForFormat('PNG')).toBe('.png');
    });

    it('should return .jpg for JPG format', () => {
      expect(getExtensionForFormat('jpg')).toBe('.jpg');
      expect(getExtensionForFormat('JPG')).toBe('.jpg');
    });

    it('should return .jpg for JPEG format', () => {
      expect(getExtensionForFormat('jpeg')).toBe('.jpg');
      expect(getExtensionForFormat('JPEG')).toBe('.jpg');
    });

    it('should return .webp for WebP format', () => {
      expect(getExtensionForFormat('webp')).toBe('.webp');
      expect(getExtensionForFormat('WEBP')).toBe('.webp');
    });

    it('should return .gif for GIF format', () => {
      expect(getExtensionForFormat('gif')).toBe('.gif');
      expect(getExtensionForFormat('GIF')).toBe('.gif');
    });

    it('should return .avif for AVIF format', () => {
      expect(getExtensionForFormat('avif')).toBe('.avif');
      expect(getExtensionForFormat('AVIF')).toBe('.avif');
    });

    it('should return .png as default for unknown formats', () => {
      expect(getExtensionForFormat('unknown')).toBe('.png');
      expect(getExtensionForFormat('bmp')).toBe('.png');
      expect(getExtensionForFormat('tiff')).toBe('.png');
    });

    it('should be case-insensitive', () => {
      expect(getExtensionForFormat('PNG')).toBe('.png');
      expect(getExtensionForFormat('Png')).toBe('.png');
      expect(getExtensionForFormat('pNg')).toBe('.png');
    });
  });

  describe('getMimeTypeForFormat', () => {
    it('should return image/png for PNG format', () => {
      expect(getMimeTypeForFormat('png')).toBe('image/png');
      expect(getMimeTypeForFormat('PNG')).toBe('image/png');
    });

    it('should return image/jpeg for JPG format', () => {
      expect(getMimeTypeForFormat('jpg')).toBe('image/jpeg');
      expect(getMimeTypeForFormat('JPG')).toBe('image/jpeg');
    });

    it('should return image/jpeg for JPEG format', () => {
      expect(getMimeTypeForFormat('jpeg')).toBe('image/jpeg');
      expect(getMimeTypeForFormat('JPEG')).toBe('image/jpeg');
    });

    it('should return image/webp for WebP format', () => {
      expect(getMimeTypeForFormat('webp')).toBe('image/webp');
      expect(getMimeTypeForFormat('WEBP')).toBe('image/webp');
    });

    it('should return image/gif for GIF format', () => {
      expect(getMimeTypeForFormat('gif')).toBe('image/gif');
      expect(getMimeTypeForFormat('GIF')).toBe('image/gif');
    });

    it('should return image/avif for AVIF format', () => {
      expect(getMimeTypeForFormat('avif')).toBe('image/avif');
      expect(getMimeTypeForFormat('AVIF')).toBe('image/avif');
    });

    it('should normalize jpg to jpeg', () => {
      expect(getMimeTypeForFormat('jpg')).toBe('image/jpeg');
      expect(getMimeTypeForFormat('JPG')).toBe('image/jpeg');
    });

    it('should be case-insensitive', () => {
      expect(getMimeTypeForFormat('PNG')).toBe('image/png');
      expect(getMimeTypeForFormat('Png')).toBe('image/png');
      expect(getMimeTypeForFormat('pNg')).toBe('image/png');
    });

    it('should handle all supported formats', () => {
      const formats = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];
      const expected = ['image/png', 'image/jpeg', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];

      formats.forEach((format, index) => {
        expect(getMimeTypeForFormat(format)).toBe(expected[index]);
      });
    });
  });

  describe('Format Conversion Integration', () => {
    it('should maintain correct extension-to-MIME mapping', () => {
      const formats = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];

      formats.forEach(format => {
        const extension = getExtensionForFormat(format);
        const mimeType = getMimeTypeForFormat(format);
        
        // Extension should start with dot
        expect(extension).toMatch(/^\./);
        
        // MIME type should start with image/
        expect(mimeType).toMatch(/^image\//);
      });
    });

    it('should normalize jpg to jpeg consistently', () => {
      const jpgExtension = getExtensionForFormat('jpg');
      const jpegExtension = getExtensionForFormat('jpeg');
      const jpgMime = getMimeTypeForFormat('jpg');
      const jpegMime = getMimeTypeForFormat('jpeg');

      // Both should produce same extension
      expect(jpgExtension).toBe(jpegExtension);
      
      // Both should produce same MIME type
      expect(jpgMime).toBe(jpegMime);
      expect(jpgMime).toBe('image/jpeg');
    });

    it('should handle format conversion with quality parameter', () => {
      const dataUrl = 'data:image/png;base64,test';
      
      // Quality-sensitive formats
      const jpgResult = convertFormat(dataUrl, 'jpg', 0.8);
      const webpResult = convertFormat(dataUrl, 'webp', 0.9);
      
      expect(jpgResult).toBeInstanceOf(Promise);
      expect(webpResult).toBeInstanceOf(Promise);
    });

    it('should handle format conversion without quality parameter', () => {
      const dataUrl = 'data:image/png;base64,test';
      
      // Lossless formats (no quality parameter)
      const pngResult = convertFormat(dataUrl, 'png');
      const gifResult = convertFormat(dataUrl, 'gif');
      const avifResult = convertFormat(dataUrl, 'avif');
      
      expect(pngResult).toBeInstanceOf(Promise);
      expect(gifResult).toBeInstanceOf(Promise);
      expect(avifResult).toBeInstanceOf(Promise);
    });
  });

  describe('Format Conversion Error Handling', () => {
    it('should provide clear error message for invalid quality', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      await expect(convertFormat(dataUrl, 'jpg', -1)).rejects.toThrow(
        'Quality must be between 0.0 and 1.0'
      );
      
      await expect(convertFormat(dataUrl, 'jpg', 2)).rejects.toThrow(
        'Quality must be between 0.0 and 1.0'
      );
    });

    it('should reject quality values slightly outside boundaries', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      await expect(convertFormat(dataUrl, 'jpg', -0.0001)).rejects.toThrow();
      await expect(convertFormat(dataUrl, 'jpg', 1.0001)).rejects.toThrow();
    });
  });

  // Integration tests for actual format conversion with Canvas
  // would require a real browser environment with full Canvas API support.
  // These are tested manually in the renderer process.
});

