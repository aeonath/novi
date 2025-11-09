/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { isImageFile, getMimeType, pathToFileUrl } from './image-utils';

/**
 * Image editor service for handling image file operations
 */
export class ImageEditorService {
  /**
   * Opens an image file and returns its data URL
   * @param filePath - Absolute path to the image file
   * @returns Promise resolving to base64 data URL
   */
  static async openImage(filePath: string): Promise<string> {
    if (!isImageFile(filePath)) {
      throw new Error(`File is not a supported image type: ${filePath}`);
    }

    const mimeType = getMimeType(filePath);
    if (!mimeType) {
      throw new Error(`Unable to determine MIME type for: ${filePath}`);
    }

    console.log(`[ImageEditor] Opening image: ${filePath}`);
    console.log(`[ImageEditor] Detected MIME type: ${mimeType}`);

    // Convert file path to file:// URL for loading in renderer
    const fileUrl = pathToFileUrl(filePath);
    
    return fileUrl;
  }

  /**
   * Validates if a file can be opened in the image editor
   * @param filePath - Path to validate
   * @returns true if the file can be opened
   */
  static canOpenFile(filePath: string): boolean {
    return isImageFile(filePath);
  }

  /**
   * Gets the MIME type for a file
   * @param filePath - Path to the file
   * @returns MIME type string or null
   */
  static getMimeType(filePath: string): string | null {
    return getMimeType(filePath);
  }
}

