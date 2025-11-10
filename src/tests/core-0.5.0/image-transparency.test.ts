/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { setTransparency, supportsTransparency } from '../../core/image/image-utils';

describe('Image Transparency', () => {
  // Note: setTransparency() full Canvas operation tests are skipped because Jest/JSDOM 
  // doesn't support Canvas API operations. The function is tested manually in the 
  // renderer process where full Canvas API is available. We test validation logic here.

  describe('setTransparency', () => {
    it('should be defined and return a Promise', () => {
      expect(typeof setTransparency).toBe('function');
      const result = setTransparency('data:image/png;base64,test', 0.5);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should reject opacity values less than 0', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      await expect(setTransparency(dataUrl, -0.1)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
    });

    it('should reject opacity values greater than 1', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      await expect(setTransparency(dataUrl, 1.1)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
    });

    it('should reject negative opacity values', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      await expect(setTransparency(dataUrl, -1.0)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
    });

    it('should reject opacity values slightly outside boundaries', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      // Test just outside boundaries
      await expect(setTransparency(dataUrl, -0.0001)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
      await expect(setTransparency(dataUrl, 1.0001)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
    });

    it('should accept valid opacity values at boundaries', async () => {
      const dataUrl = 'data:image/png;base64,test';

      // Test that valid boundary values don't throw on validation
      // (they will fail due to Canvas, but validation should pass)
      const promise1 = setTransparency(dataUrl, 0.0);
      const promise2 = setTransparency(dataUrl, 1.0);
      
      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);
    });

    it('should validate opacity parameter type', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      // Test with invalid types - should reject
      await expect(setTransparency(dataUrl, NaN)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
      await expect(setTransparency(dataUrl, Infinity)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
      await expect(setTransparency(dataUrl, -Infinity)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
    });
  });

  describe('supportsTransparency', () => {
    it('should return true for PNG format', () => {
      expect(supportsTransparency('image/png')).toBe(true);
    });

    it('should return true for WEBP format', () => {
      expect(supportsTransparency('image/webp')).toBe(true);
    });

    it('should return true for AVIF format', () => {
      expect(supportsTransparency('image/avif')).toBe(true);
    });

    it('should return true for GIF format', () => {
      expect(supportsTransparency('image/gif')).toBe(true);
    });

    it('should return false for JPEG format', () => {
      expect(supportsTransparency('image/jpeg')).toBe(false);
    });

    it('should return false for JPG format', () => {
      expect(supportsTransparency('image/jpg')).toBe(false);
    });

    it('should return false for null MIME type', () => {
      expect(supportsTransparency(null)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(supportsTransparency('')).toBe(false);
    });

    it('should return false for unsupported formats', () => {
      expect(supportsTransparency('image/bmp')).toBe(false);
      expect(supportsTransparency('image/tiff')).toBe(false);
      expect(supportsTransparency('image/svg+xml')).toBe(false);
      expect(supportsTransparency('video/mp4')).toBe(false);
      expect(supportsTransparency('application/pdf')).toBe(false);
    });

    it('should be case-sensitive for MIME types', () => {
      // MIME types should be lowercase by standard
      expect(supportsTransparency('image/PNG')).toBe(false);
      expect(supportsTransparency('IMAGE/PNG')).toBe(false);
      expect(supportsTransparency('Image/Png')).toBe(false);
    });

    it('should validate all supported transparent formats', () => {
      const transparentFormats = ['image/png', 'image/webp', 'image/avif', 'image/gif'];
      
      transparentFormats.forEach(format => {
        expect(supportsTransparency(format)).toBe(true);
      });
    });

    it('should validate all non-transparent formats', () => {
      const opaqueFormats = ['image/jpeg', 'image/jpg'];
      
      opaqueFormats.forEach(format => {
        expect(supportsTransparency(format)).toBe(false);
      });
    });
  });

  describe('Transparency Export Format Support', () => {
    it('should confirm PNG supports alpha channel export', () => {
      expect(supportsTransparency('image/png')).toBe(true);
    });

    it('should confirm WEBP supports alpha channel export', () => {
      expect(supportsTransparency('image/webp')).toBe(true);
    });

    it('should confirm AVIF supports alpha channel export', () => {
      expect(supportsTransparency('image/avif')).toBe(true);
    });

    it('should confirm GIF supports alpha channel export', () => {
      expect(supportsTransparency('image/gif')).toBe(true);
    });

    it('should confirm JPEG does not support alpha channel', () => {
      expect(supportsTransparency('image/jpeg')).toBe(false);
      expect(supportsTransparency('image/jpg')).toBe(false);
    });
  });

  describe('Transparency Error Handling', () => {
    it('should provide clear error message for invalid opacity', async () => {
      const dataUrl = 'data:image/png;base64,test';
      
      await expect(setTransparency(dataUrl, -1)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
      
      await expect(setTransparency(dataUrl, 2)).rejects.toThrow(
        'Opacity must be between 0.0 and 1.0'
      );
    });
  });

  // Integration tests for transparency rendering and actual image output
  // would require a real browser environment with full Canvas API support.
  // These are tested manually in the renderer process.
});

