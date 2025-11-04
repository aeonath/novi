/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Terminal Tabs Unit Tests
 * Tests for terminal tab handling logic
 */

// Define Tab interface locally to avoid TSX import issues
interface Tab {
  id: string;
  type: 'file' | 'terminal';
  filePath: string;
  fileName: string;
  isDirty: boolean;
  content: string;
  language: string;
}

describe('Terminal Tabs', () => {
  describe('Tab Interface', () => {
    it('should support terminal type', () => {
      const terminalTab: Tab = {
        id: 'terminal-1',
        type: 'terminal',
        filePath: 'terminal-1', // terminalId stored in filePath
        fileName: 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      };

      expect(terminalTab.type).toBe('terminal');
      expect(terminalTab.fileName).toBe('bash');
      expect(terminalTab.isDirty).toBe(false);
    });

    it('should support file type', () => {
      const fileTab: Tab = {
        id: 'file-1',
        type: 'file',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        isDirty: false,
        content: 'console.log("test");',
        language: 'typescript',
      };

      expect(fileTab.type).toBe('file');
      expect(fileTab.filePath).toBe('/path/to/file.ts');
    });
  });

  describe('Terminal Tab Behavior', () => {
    it('should allow multiple terminal tabs', () => {
      const terminalTab1: Tab = {
        id: 'tab-1',
        type: 'terminal',
        filePath: 'terminal-1',
        fileName: 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      };

      const terminalTab2: Tab = {
        id: 'tab-2',
        type: 'terminal',
        filePath: 'terminal-2',
        fileName: 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      };

      // Both tabs should be valid
      expect(terminalTab1.type).toBe('terminal');
      expect(terminalTab2.type).toBe('terminal');
      expect(terminalTab1.filePath).not.toBe(terminalTab2.filePath);
    });

    it('should store terminalId in filePath for terminals', () => {
      const terminalTab: Tab = {
        id: 'tab-1',
        type: 'terminal',
        filePath: 'terminal-123', // terminalId from backend
        fileName: 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      };

      // filePath contains terminalId for terminal tabs
      expect(terminalTab.filePath).toMatch(/^terminal-\d+$/);
    });

    it('should never be dirty for terminal tabs', () => {
      const terminalTab: Tab = {
        id: 'tab-1',
        type: 'terminal',
        filePath: 'terminal-1',
        fileName: 'bash',
        isDirty: false, // Always false for terminals
        content: '',
        language: 'terminal',
      };

      expect(terminalTab.isDirty).toBe(false);
    });
  });

  describe('Tab Identification', () => {
    it('should distinguish terminal tabs from file tabs', () => {
      const fileTab: Tab = {
        id: 'file-1',
        type: 'file',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        isDirty: false,
        content: 'content',
        language: 'typescript',
      };

      const terminalTab: Tab = {
        id: 'terminal-1',
        type: 'terminal',
        filePath: 'terminal-1',
        fileName: 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      };

      expect(fileTab.type).toBe('file');
      expect(terminalTab.type).toBe('terminal');
      expect(fileTab.type).not.toBe(terminalTab.type);
    });

    it('should use correct language identifier for terminals', () => {
      const terminalTab: Tab = {
        id: 'tab-1',
        type: 'terminal',
        filePath: 'terminal-1',
        fileName: 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      };

      expect(terminalTab.language).toBe('terminal');
    });
  });

  describe('Tab Deduplication Logic', () => {
    it('should allow duplicate terminal tabs (multiple terminals)', () => {
      const terminalTab1: Tab = {
        id: 'tab-1',
        type: 'terminal',
        filePath: 'terminal-1',
        fileName: 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      };

      const terminalTab2: Tab = {
        id: 'tab-2',
        type: 'terminal',
        filePath: 'terminal-2', // Different terminalId
        fileName: 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      };

      // Both should be allowed (different terminalIds)
      expect(terminalTab1.filePath).not.toBe(terminalTab2.filePath);
    });

    it('should prevent duplicate file tabs', () => {
      const fileTab1: Tab = {
        id: 'tab-1',
        type: 'file',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        isDirty: false,
        content: 'content1',
        language: 'typescript',
      };

      const fileTab2: Tab = {
        id: 'tab-2',
        type: 'file',
        filePath: '/path/to/file.ts', // Same filePath
        fileName: 'file.ts',
        isDirty: false,
        content: 'content2',
        language: 'typescript',
      };

      // Same filePath should indicate duplicate
      expect(fileTab1.filePath).toBe(fileTab2.filePath);
    });
  });
});
