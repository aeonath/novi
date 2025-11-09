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

