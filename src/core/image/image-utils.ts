/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Supported image MIME types for the editor
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/avif',
] as const;

/**
 * Supported image file extensions
 */
export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
] as const;

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];
export type SupportedImageExtension = typeof SUPPORTED_IMAGE_EXTENSIONS[number];

/**
 * Detects if a file is an image based on its extension
 * @param filePath - Path to the file
 * @returns true if the file is a supported image type
 */
export function isImageFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext as SupportedImageExtension);
}

/**
 * Gets the MIME type for a given file extension
 * @param filePath - Path to the file
 * @returns MIME type string or null if not supported
 */
export function getMimeType(filePath: string): SupportedImageType | null {
  const ext = getFileExtension(filePath);
  
  const mimeMap: Record<string, SupportedImageType> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
  };
  
  return mimeMap[ext] || null;
}

/**
 * Gets the file extension from a path (lowercase with dot)
 * @param filePath - Path to the file
 * @returns File extension (e.g., '.png')
 */
export function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.substring(lastDot).toLowerCase();
}

/**
 * Gets dimensions of an image from a data URL
 * @param dataUrl - Base64 data URL of the image
 * @returns Promise resolving to { width, height }
 */
export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Converts a file path to a file:// URL for loading in the renderer
 * @param filePath - Absolute file path
 * @returns file:// URL
 */
export function pathToFileUrl(filePath: string): string {
  // Convert Windows backslashes to forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Ensure it starts with file://
  if (normalizedPath.startsWith('file://')) {
    return normalizedPath;
  }
  
  // Handle absolute paths
  if (normalizedPath.match(/^[A-Za-z]:\//)) {
    // Windows path like C:/Users/...
    return `file:///${normalizedPath}`;
  } else if (normalizedPath.startsWith('/')) {
    // Unix path like /home/...
    return `file://${normalizedPath}`;
  }
  
  throw new Error(`Invalid file path: ${filePath}`);
}

/**
 * Calculates dimensions for proportional scaling
 * @param originalWidth - Original width
 * @param originalHeight - Original height
 * @param targetWidth - Target width (or null to maintain aspect ratio from height)
 * @param targetHeight - Target height (or null to maintain aspect ratio from width)
 * @returns Calculated dimensions maintaining aspect ratio
 */
export function calculateProportionalDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number | null,
  targetHeight: number | null
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  if (targetWidth && targetHeight) {
    // Both dimensions specified - return as is
    return { width: targetWidth, height: targetHeight };
  } else if (targetWidth) {
    // Only width specified - calculate height
    return { width: targetWidth, height: Math.round(targetWidth / aspectRatio) };
  } else if (targetHeight) {
    // Only height specified - calculate width
    return { width: Math.round(targetHeight * aspectRatio), height: targetHeight };
  } else {
    // Neither specified - return original
    return { width: originalWidth, height: originalHeight };
  }
}

/**
 * Scales dimensions by a percentage
 * @param width - Original width
 * @param height - Original height
 * @param scale - Scale factor (e.g., 0.5 for 50%, 2.0 for 200%)
 * @returns Scaled dimensions
 */
export function scaleDimensions(
  width: number,
  height: number,
  scale: number
): { width: number; height: number } {
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Resizes an image using canvas
 * @param imageDataUrl - Source image as data URL
 * @param width - Target width
 * @param height - Target height
 * @returns Promise resolving to resized image data URL
 */
export function resizeImage(
  imageDataUrl: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL
        const resizedDataUrl = canvas.toDataURL('image/png');
        resolve(resizedDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * Crops an image to a specified region
 * @param imageDataUrl - Source image as data URL
 * @param x - X coordinate of crop region (top-left)
 * @param y - Y coordinate of crop region (top-left)
 * @param width - Width of crop region
 * @param height - Height of crop region
 * @returns Promise resolving to cropped image data URL
 */
export function cropImage(
  imageDataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Validate crop region
        if (x < 0 || y < 0 || width <= 0 || height <= 0) {
          reject(new Error('Invalid crop region dimensions'));
          return;
        }
        
        if (x + width > img.width || y + height > img.height) {
          reject(new Error('Crop region exceeds image bounds'));
          return;
        }
        
        // Create canvas for cropped region
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw cropped region
        // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        
        // Convert to data URL
        const croppedDataUrl = canvas.toDataURL('image/png');
        resolve(croppedDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * Adjusts the opacity/transparency of an image
 * @param imageDataUrl - Source image as data URL
 * @param opacity - Opacity value between 0.0 (fully transparent) and 1.0 (fully opaque)
 * @returns Promise resolving to image data URL with adjusted transparency
 */
export function setTransparency(
  imageDataUrl: string,
  opacity: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate opacity range
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      reject(new Error('Opacity must be between 0.0 and 1.0'));
      return;
    }

    const img = new Image();
    
    img.onload = () => {
      try {
        // Create canvas with same dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Set global alpha for opacity
        ctx.globalAlpha = opacity;
        
        // Draw image with adjusted opacity
        ctx.drawImage(img, 0, 0);
        
        // Convert to data URL with PNG to preserve alpha channel
        const transparentDataUrl = canvas.toDataURL('image/png');
        resolve(transparentDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for transparency adjustment'));
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * Checks if an image format supports transparency
 * @param mimeType - MIME type of the image
 * @returns true if the format supports alpha channel
 */
export function supportsTransparency(mimeType: string | null): boolean {
  if (!mimeType) return false;
  
  const transparentFormats = ['image/png', 'image/webp', 'image/avif', 'image/gif'];
  return transparentFormats.includes(mimeType);
}

/**
 * Converts an image to a different format
 * @param imageDataUrl - Source image as data URL
 * @param targetFormat - Target format ('png', 'jpg', 'jpeg', 'webp', 'gif', 'avif')
 * @param quality - Quality for lossy formats (0-1, default 0.92)
 * @returns Promise resolving to converted image data URL
 */
export function convertFormat(
  imageDataUrl: string,
  targetFormat: 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif' | 'avif',
  quality: number = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Normalize format
    const normalizedFormat = targetFormat === 'jpg' ? 'jpeg' : targetFormat;
    
    // Validate quality parameter
    if (quality < 0 || quality > 1) {
      reject(new Error('Quality must be between 0.0 and 1.0'));
      return;
    }

    const img = new Image();
    
    img.onload = () => {
      try {
        // Create canvas with same dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // For JPEG, fill with white background (no transparency support)
        if (normalizedFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Convert to target format
        const mimeType = `image/${normalizedFormat}`;
        let convertedDataUrl: string;
        
        // Quality parameter only applies to lossy formats (JPEG, WEBP)
        if (normalizedFormat === 'jpeg' || normalizedFormat === 'webp') {
          convertedDataUrl = canvas.toDataURL(mimeType, quality);
        } else {
          convertedDataUrl = canvas.toDataURL(mimeType);
        }
        
        resolve(convertedDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for format conversion'));
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * A crop selection expressed in natural (unscaled) image pixels.
 */
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Which part of a crop selection a drag handle controls. 'move' translates
 * the whole region; the compass directions resize from that edge/corner —
 * mirrors mspaint's crop tool (edge handles resize one axis, corner handles
 * resize both).
 */
export type CropHandleMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * Computes the new crop region after dragging a handle (or the selection
 * body, for 'move') by (dxNatural, dyNatural) natural image pixels away from
 * startRegion. The result is clamped so the region never leaves the
 * [0, imageWidth] x [0, imageHeight] bounds and never shrinks below minSize
 * on either axis.
 * @param mode - Which handle is being dragged
 * @param startRegion - The crop region at the start of the drag
 * @param dxNatural - Horizontal drag distance, in natural image pixels
 * @param dyNatural - Vertical drag distance, in natural image pixels
 * @param imageWidth - Natural width of the image being cropped
 * @param imageHeight - Natural height of the image being cropped
 * @param minSize - Minimum width/height the region may be resized to
 * @returns The updated crop region
 */
export function computeCropHandleDrag(
  mode: CropHandleMode,
  startRegion: CropRegion,
  dxNatural: number,
  dyNatural: number,
  imageWidth: number,
  imageHeight: number,
  minSize = 1
): CropRegion {
  const clamp = (value: number, lo: number, hi: number): number => Math.min(Math.max(value, lo), hi);

  let { x, y, width, height } = startRegion;

  if (mode === 'move') {
    x = clamp(startRegion.x + dxNatural, 0, imageWidth - startRegion.width);
    y = clamp(startRegion.y + dyNatural, 0, imageHeight - startRegion.height);
    return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
  }

  if (mode.includes('n')) {
    const newY = clamp(startRegion.y + dyNatural, 0, startRegion.y + startRegion.height - minSize);
    height = startRegion.height - (newY - startRegion.y);
    y = newY;
  }
  if (mode.includes('s')) {
    height = clamp(startRegion.height + dyNatural, minSize, imageHeight - startRegion.y);
  }
  if (mode.includes('w')) {
    const newX = clamp(startRegion.x + dxNatural, 0, startRegion.x + startRegion.width - minSize);
    width = startRegion.width - (newX - startRegion.x);
    x = newX;
  }
  if (mode.includes('e')) {
    width = clamp(startRegion.width + dxNatural, minSize, imageWidth - startRegion.x);
  }

  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

/**
 * Clamps a view zoom factor (1.0 = 100%) to a sane display range.
 * @param zoom - Requested zoom factor
 * @param min - Minimum allowed zoom factor
 * @param max - Maximum allowed zoom factor
 * @returns The clamped zoom factor
 */
export function clampZoom(zoom: number, min = 0.1, max = 4.0): number {
  return Math.min(Math.max(zoom, min), max);
}

/**
 * Gets the file extension for a given format
 * @param format - Image format
 * @returns File extension with dot (e.g., '.png')
 */
export function getExtensionForFormat(format: string): string {
  const extensionMap: Record<string, string> = {
    'png': '.png',
    'jpg': '.jpg',
    'jpeg': '.jpg',
    'webp': '.webp',
    'gif': '.gif',
    'avif': '.avif',
  };
  
  return extensionMap[format.toLowerCase()] || '.png';
}

/**
 * Gets the MIME type for a given format
 * @param format - Image format
 * @returns MIME type string
 */
export function getMimeTypeForFormat(format: string): string {
  const normalizedFormat = format.toLowerCase() === 'jpg' ? 'jpeg' : format.toLowerCase();
  return `image/${normalizedFormat}`;
}

