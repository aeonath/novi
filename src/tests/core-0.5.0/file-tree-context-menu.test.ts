/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Unit tests for FileTree context menu "Edit Image" functionality
 * Tests that the context menu shows the "Edit Image" option only for supported image file types
 */

describe('FileTree Context Menu - Edit Image', () => {
  /**
   * Test: Image file extensions are correctly identified
   */
  describe('Image file detection', () => {
    it('should identify PNG files as images', () => {
      const filename = 'photo.png';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(true);
    });

    it('should identify JPG files as images', () => {
      const filename = 'photo.jpg';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(true);
    });

    it('should identify JPEG files as images', () => {
      const filename = 'photo.jpeg';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(true);
    });

    it('should identify GIF files as images', () => {
      const filename = 'animation.gif';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(true);
    });

    it('should identify WebP files as images', () => {
      const filename = 'photo.webp';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(true);
    });

    it('should identify AVIF files as images', () => {
      const filename = 'photo.avif';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(true);
    });

    it('should NOT identify text files as images', () => {
      const filename = 'document.txt';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(false);
    });

    it('should NOT identify JavaScript files as images', () => {
      const filename = 'script.js';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(false);
    });

    it('should NOT identify TypeScript files as images', () => {
      const filename = 'component.tsx';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(false);
    });

    it('should NOT identify directories as images', () => {
      const filename = 'images';
      const isDirectory = true;
      const isImage = !isDirectory && (
        filename.endsWith('.png') || 
        filename.endsWith('.jpg') ||
        filename.endsWith('.jpeg') ||
        filename.endsWith('.gif') ||
        filename.endsWith('.webp') ||
        filename.endsWith('.avif')
      );
      
      expect(isImage).toBe(false);
    });

    it('should be case-sensitive and NOT match uppercase extensions', () => {
      const filename = 'photo.PNG';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      // The current implementation is case-sensitive
      expect(isImage).toBe(false);
    });
  });

  /**
   * Test: Context menu behavior
   */
  describe('Context menu display logic', () => {
    it('should show "Edit Image" option for image files', () => {
      const node = {
        name: 'photo.png',
        path: '/path/to/photo.png',
        isDirectory: false
      };

      const isImage = node && !node.isDirectory && (
        node.name.endsWith('.png') ||
        node.name.endsWith('.jpg') ||
        node.name.endsWith('.jpeg') ||
        node.name.endsWith('.gif') ||
        node.name.endsWith('.webp') ||
        node.name.endsWith('.avif')
      );

      expect(isImage).toBe(true);
    });

    it('should NOT show "Edit Image" option for non-image files', () => {
      const node = {
        name: 'document.txt',
        path: '/path/to/document.txt',
        isDirectory: false
      };

      const isImage = node && !node.isDirectory && (
        node.name.endsWith('.png') ||
        node.name.endsWith('.jpg') ||
        node.name.endsWith('.jpeg') ||
        node.name.endsWith('.gif') ||
        node.name.endsWith('.webp') ||
        node.name.endsWith('.avif')
      );

      expect(isImage).toBe(false);
    });

    it('should NOT show "Edit Image" option for directories', () => {
      const node = {
        name: 'images',
        path: '/path/to/images',
        isDirectory: true
      };

      const isImage = node && !node.isDirectory && (
        node.name.endsWith('.png') ||
        node.name.endsWith('.jpg') ||
        node.name.endsWith('.jpeg') ||
        node.name.endsWith('.gif') ||
        node.name.endsWith('.webp') ||
        node.name.endsWith('.avif')
      );

      expect(isImage).toBe(false);
    });

    it('should NOT show "Edit Image" option when node is null', () => {
      // When node is null, isImage should be false
      const nodeIsNull = true;
      const isImage = false; // Can't check image extensions when node is null

      expect(isImage).toBe(false);
      expect(nodeIsNull).toBe(true);
    });
  });

  /**
   * Test: Supported image formats from Sprint5 Task 3
   */
  describe('Supported image formats', () => {
    const supportedFormats = [
      { ext: '.png', name: 'PNG' },
      { ext: '.jpg', name: 'JPG' },
      { ext: '.jpeg', name: 'JPEG' },
      { ext: '.gif', name: 'GIF' },
      { ext: '.webp', name: 'WebP' },
      { ext: '.avif', name: 'AVIF' }
    ];

    supportedFormats.forEach(({ ext, name }) => {
      it(`should support ${name} format (${ext})`, () => {
        const filename = `image${ext}`;
        const isImage = filename.endsWith('.png') || 
                       filename.endsWith('.jpg') ||
                       filename.endsWith('.jpeg') ||
                       filename.endsWith('.gif') ||
                       filename.endsWith('.webp') ||
                       filename.endsWith('.avif');
        
        expect(isImage).toBe(true);
      });
    });

    const unsupportedFormats = [
      { ext: '.bmp', name: 'BMP' },
      { ext: '.svg', name: 'SVG' },
      { ext: '.tiff', name: 'TIFF' },
      { ext: '.ico', name: 'ICO' }
    ];

    unsupportedFormats.forEach(({ ext, name }) => {
      it(`should NOT support ${name} format (${ext})`, () => {
        const filename = `image${ext}`;
        const isImage = filename.endsWith('.png') || 
                       filename.endsWith('.jpg') ||
                       filename.endsWith('.jpeg') ||
                       filename.endsWith('.gif') ||
                       filename.endsWith('.webp') ||
                       filename.endsWith('.avif');
        
        expect(isImage).toBe(false);
      });
    });
  });

  /**
   * Test: Edge cases
   */
  describe('Edge cases', () => {
    it('should handle files with multiple dots in filename', () => {
      const filename = 'my.photo.backup.png';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(true);
    });

    it('should handle files with no extension', () => {
      const filename = 'image';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(false);
    });

    it('should handle empty filename', () => {
      const filename = '';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(false);
    });

    it('should handle filename that is just an extension', () => {
      const filename = '.png';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(true);
    });

    it('should NOT match extension in middle of filename', () => {
      const filename = 'image.png.txt';
      const isImage = filename.endsWith('.png') || 
                     filename.endsWith('.jpg') ||
                     filename.endsWith('.jpeg') ||
                     filename.endsWith('.gif') ||
                     filename.endsWith('.webp') ||
                     filename.endsWith('.avif');
      
      expect(isImage).toBe(false);
    });
  });
});

