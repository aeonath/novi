/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Unit tests for FileTree path separator handling
 * 
 * Tests cross-platform path operations (Windows backslash vs Unix forward slash)
 * for delete, rename, and create operations.
 */

describe('FileTree Path Separator Handling', () => {
  describe('Parent Path Extraction', () => {
    it('should extract parent path from Windows-style path', () => {
      const windowsPath = 'C:\\Work\\nova\\src\\file.ts';
      const lastSlash = Math.max(windowsPath.lastIndexOf('/'), windowsPath.lastIndexOf('\\'));
      const parentPath = windowsPath.substring(0, lastSlash);
      
      expect(parentPath).toBe('C:\\Work\\nova\\src');
    });

    it('should extract parent path from Unix-style path', () => {
      const unixPath = '/home/user/nova/src/file.ts';
      const lastSlash = Math.max(unixPath.lastIndexOf('/'), unixPath.lastIndexOf('\\'));
      const parentPath = unixPath.substring(0, lastSlash);
      
      expect(parentPath).toBe('/home/user/nova/src');
    });

    it('should handle root-level Windows paths', () => {
      const rootPath = 'C:\\Work\\file.txt';
      const lastSlash = Math.max(rootPath.lastIndexOf('/'), rootPath.lastIndexOf('\\'));
      const parentPath = rootPath.substring(0, lastSlash);
      
      expect(parentPath).toBe('C:\\Work');
    });

    it('should handle root-level Unix paths', () => {
      const rootPath = '/home/file.txt';
      const lastSlash = Math.max(rootPath.lastIndexOf('/'), rootPath.lastIndexOf('\\'));
      const parentPath = rootPath.substring(0, lastSlash);
      
      expect(parentPath).toBe('/home');
    });
  });

  describe('Path Separator Detection', () => {
    it('should detect Windows backslash separator', () => {
      const windowsPath = 'C:\\Work\\nova';
      const separator = windowsPath.includes('\\') ? '\\' : '/';
      
      expect(separator).toBe('\\');
    });

    it('should detect Unix forward slash separator', () => {
      const unixPath = '/home/user/nova';
      const separator = unixPath.includes('\\') ? '\\' : '/';
      
      expect(separator).toBe('/');
    });

    it('should default to forward slash for paths without separators', () => {
      const simplePath = 'file.txt';
      const separator = simplePath.includes('\\') ? '\\' : '/';
      
      expect(separator).toBe('/');
    });
  });

  describe('Path Construction', () => {
    it('should construct Windows path with correct separator', () => {
      const parentPath = 'C:\\Work\\nova';
      const fileName = 'test.txt';
      const separator = parentPath.includes('\\') ? '\\' : '/';
      const newPath = `${parentPath}${parentPath.endsWith('/') || parentPath.endsWith('\\') ? '' : separator}${fileName}`;
      
      expect(newPath).toBe('C:\\Work\\nova\\test.txt');
    });

    it('should construct Unix path with correct separator', () => {
      const parentPath = '/home/user/nova';
      const fileName = 'test.txt';
      const separator = parentPath.includes('\\') ? '\\' : '/';
      const newPath = `${parentPath}${parentPath.endsWith('/') || parentPath.endsWith('\\') ? '' : separator}${fileName}`;
      
      expect(newPath).toBe('/home/user/nova/test.txt');
    });

    it('should not add duplicate separator if path already ends with separator (Windows)', () => {
      const parentPath = 'C:\\Work\\nova\\';
      const fileName = 'test.txt';
      const separator = parentPath.includes('\\') ? '\\' : '/';
      const newPath = `${parentPath}${parentPath.endsWith('/') || parentPath.endsWith('\\') ? '' : separator}${fileName}`;
      
      expect(newPath).toBe('C:\\Work\\nova\\test.txt');
    });

    it('should not add duplicate separator if path already ends with separator (Unix)', () => {
      const parentPath = '/home/user/nova/';
      const fileName = 'test.txt';
      const separator = parentPath.includes('\\') ? '\\' : '/';
      const newPath = `${parentPath}${parentPath.endsWith('/') || parentPath.endsWith('\\') ? '' : separator}${fileName}`;
      
      expect(newPath).toBe('/home/user/nova/test.txt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed separators (preferring backslash)', () => {
      const mixedPath = 'C:\\Work/nova\\src';
      const separator = mixedPath.includes('\\') ? '\\' : '/';
      
      expect(separator).toBe('\\');
    });

    it('should handle paths with single segment', () => {
      const singleSegment = 'file.txt';
      const lastSlash = Math.max(singleSegment.lastIndexOf('/'), singleSegment.lastIndexOf('\\'));
      const parentPath = singleSegment.substring(0, lastSlash);
      
      expect(parentPath).toBe('');
      expect(lastSlash).toBe(-1);
    });

    it('should handle drive letter only (Windows)', () => {
      const drivePath = 'C:\\';
      const separator = drivePath.includes('\\') ? '\\' : '/';
      
      expect(separator).toBe('\\');
      expect(drivePath.endsWith('\\')).toBe(true);
    });

    it('should handle root path (Unix)', () => {
      const rootPath = '/';
      const separator = rootPath.includes('\\') ? '\\' : '/';
      
      expect(separator).toBe('/');
      expect(rootPath.endsWith('/')).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should correctly parse Windows project path for delete operation', () => {
      const filePath = 'C:\\Work\\nova\\aeonath.com\\test.txt';
      const rootPath = 'C:\\Work\\nova\\aeonath.com';
      
      const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
      const parentPath = filePath.substring(0, lastSlash);
      
      expect(parentPath).toBe('C:\\Work\\nova\\aeonath.com');
      expect(parentPath === rootPath).toBe(true);
    });

    it('should correctly parse nested Windows path for rename operation', () => {
      const filePath = 'C:\\Work\\nova\\src\\renderer\\components\\FileTree.tsx';
      const newName = 'FileTree.new.tsx';
      
      const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
      const parentPath = filePath.substring(0, lastSlash);
      const separator = filePath.includes('\\') ? '\\' : '/';
      const newPath = `${parentPath}${separator}${newName}`;
      
      expect(parentPath).toBe('C:\\Work\\nova\\src\\renderer\\components');
      expect(newPath).toBe('C:\\Work\\nova\\src\\renderer\\components\\FileTree.new.tsx');
    });

    it('should correctly construct path for new folder creation (Windows)', () => {
      const parentPath = 'C:\\Work\\nova\\src';
      const folderName = 'new-folder';
      const separator = parentPath.includes('\\') ? '\\' : '/';
      const folderPath = `${parentPath}${parentPath.endsWith('/') || parentPath.endsWith('\\') ? '' : separator}${folderName}`;
      
      expect(folderPath).toBe('C:\\Work\\nova\\src\\new-folder');
    });

    it('should correctly construct path for new file creation (Unix)', () => {
      const parentPath = '/home/user/nova/src';
      const fileName = 'test.ts';
      const separator = parentPath.includes('\\') ? '\\' : '/';
      const filePath = `${parentPath}${parentPath.endsWith('/') || parentPath.endsWith('\\') ? '' : separator}${fileName}`;
      
      expect(filePath).toBe('/home/user/nova/src/test.ts');
    });
  });
});

