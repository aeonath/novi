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

