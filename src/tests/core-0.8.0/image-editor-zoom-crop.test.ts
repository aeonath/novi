/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { computeCropHandleDrag, clampZoom, CropRegion } from '../../core/image/image-utils';

describe('computeCropHandleDrag', () => {
  const region: CropRegion = { x: 20, y: 20, width: 100, height: 80 };
  const imageWidth = 200;
  const imageHeight = 150;

  it('moves the whole region without resizing it', () => {
    const result = computeCropHandleDrag('move', region, 10, -5, imageWidth, imageHeight);
    expect(result).toEqual({ x: 30, y: 15, width: 100, height: 80 });
  });

  it('clamps a move so the region never crosses the image bounds', () => {
    const result = computeCropHandleDrag('move', region, -1000, 1000, imageWidth, imageHeight);
    expect(result.x).toBe(0);
    expect(result.y).toBe(imageHeight - region.height);
    expect(result.width).toBe(region.width);
    expect(result.height).toBe(region.height);
  });

  it('resizes from the east handle by extending width only', () => {
    const result = computeCropHandleDrag('e', region, 15, 15, imageWidth, imageHeight);
    expect(result).toEqual({ x: 20, y: 20, width: 115, height: 80 });
  });

  it('resizes from the west handle, moving x and shrinking width', () => {
    const result = computeCropHandleDrag('w', region, 10, 0, imageWidth, imageHeight);
    expect(result).toEqual({ x: 30, y: 20, width: 90, height: 80 });
  });

  it('resizes from the north handle, moving y and shrinking height', () => {
    const result = computeCropHandleDrag('n', region, 0, 10, imageWidth, imageHeight);
    expect(result).toEqual({ x: 20, y: 30, width: 100, height: 70 });
  });

  it('resizes from the south handle by extending height only', () => {
    const result = computeCropHandleDrag('s', region, 0, 20, imageWidth, imageHeight);
    expect(result).toEqual({ x: 20, y: 20, width: 100, height: 100 });
  });

  it('resizes both axes from a corner handle', () => {
    const result = computeCropHandleDrag('se', region, 20, 10, imageWidth, imageHeight);
    expect(result).toEqual({ x: 20, y: 20, width: 120, height: 90 });
  });

  it('does not let an edge handle push the region past the image bounds', () => {
    const result = computeCropHandleDrag('e', region, 1000, 0, imageWidth, imageHeight);
    expect(result.width).toBe(imageWidth - region.x);
  });

  it('does not shrink a region below the minimum size', () => {
    const result = computeCropHandleDrag('e', region, -1000, 0, imageWidth, imageHeight, 10);
    expect(result.width).toBe(10);
    const resultW = computeCropHandleDrag('w', region, 1000, 0, imageWidth, imageHeight, 10);
    expect(resultW.width).toBe(10);
    expect(resultW.x).toBe(region.x + region.width - 10);
  });

  it('starting from the full image, dragging the south-east handle inward shrinks toward the top-left corner', () => {
    const fullImage: CropRegion = { x: 0, y: 0, width: imageWidth, height: imageHeight };
    const result = computeCropHandleDrag('se', fullImage, -50, -50, imageWidth, imageHeight);
    expect(result).toEqual({ x: 0, y: 0, width: imageWidth - 50, height: imageHeight - 50 });
  });
});

describe('clampZoom', () => {
  it('passes through values within range', () => {
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it('clamps below the minimum', () => {
    expect(clampZoom(0.01)).toBe(0.1);
  });

  it('clamps above the maximum', () => {
    expect(clampZoom(10)).toBe(4.0);
  });

  it('respects custom min/max bounds', () => {
    expect(clampZoom(0.5, 1, 2)).toBe(1);
    expect(clampZoom(5, 1, 2)).toBe(2);
  });
});
