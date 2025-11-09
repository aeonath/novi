/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import {
  calculateProportionalDimensions,
  scaleDimensions,
} from '../../core/image/image-utils';

describe('Image Resize and Scale Functions', () => {
  describe('calculateProportionalDimensions', () => {
    it('should calculate height from width maintaining aspect ratio', () => {
      const result = calculateProportionalDimensions(1920, 1080, 960, null);
      expect(result).toEqual({ width: 960, height: 540 });
    });

    it('should calculate width from height maintaining aspect ratio', () => {
      const result = calculateProportionalDimensions(1920, 1080, null, 540);
      expect(result).toEqual({ width: 960, height: 540 });
    });

    it('should return both dimensions when both are specified', () => {
      const result = calculateProportionalDimensions(1920, 1080, 1000, 600);
      expect(result).toEqual({ width: 1000, height: 600 });
    });

    it('should return original dimensions when neither is specified', () => {
      const result = calculateProportionalDimensions(1920, 1080, null, null);
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('should handle portrait orientation', () => {
      const result = calculateProportionalDimensions(1080, 1920, 540, null);
      expect(result).toEqual({ width: 540, height: 960 });
    });

    it('should handle square images', () => {
      const result = calculateProportionalDimensions(1000, 1000, 500, null);
      expect(result).toEqual({ width: 500, height: 500 });
    });

    it('should round fractional dimensions', () => {
      const result = calculateProportionalDimensions(1920, 1080, 1000, null);
      expect(result.height).toBe(563); // 1000 / (1920/1080) = 562.5, rounded to 563
    });
  });

  describe('scaleDimensions', () => {
    it('should scale dimensions by 50%', () => {
      const result = scaleDimensions(1920, 1080, 0.5);
      expect(result).toEqual({ width: 960, height: 540 });
    });

    it('should scale dimensions by 200%', () => {
      const result = scaleDimensions(800, 600, 2.0);
      expect(result).toEqual({ width: 1600, height: 1200 });
    });

    it('should scale dimensions by 75%', () => {
      const result = scaleDimensions(1000, 1000, 0.75);
      expect(result).toEqual({ width: 750, height: 750 });
    });

    it('should scale dimensions by 150%', () => {
      const result = scaleDimensions(800, 600, 1.5);
      expect(result).toEqual({ width: 1200, height: 900 });
    });

    it('should handle fractional results by rounding', () => {
      const result = scaleDimensions(1920, 1080, 0.33);
      expect(result.width).toBe(634); // 1920 * 0.33 = 633.6, rounded to 634
      expect(result.height).toBe(356); // 1080 * 0.33 = 356.4, rounded to 356
    });

    it('should handle scale factor of 1.0 (no change)', () => {
      const result = scaleDimensions(800, 600, 1.0);
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it('should handle very small scale factors', () => {
      const result = scaleDimensions(1000, 1000, 0.1);
      expect(result).toEqual({ width: 100, height: 100 });
    });

    it('should handle large scale factors', () => {
      const result = scaleDimensions(100, 100, 10.0);
      expect(result).toEqual({ width: 1000, height: 1000 });
    });
  });
  
  // Note: resizeImage() tests are skipped because Jest/JSDOM doesn't support
  // Canvas API operations. The function is tested manually in the renderer process
  // where full Canvas API is available.
});

