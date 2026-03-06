/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * EditorService Unit Tests
 * Tests for centralized Monaco Editor operations
 */

import { EditorService, Diagnostic } from '../../renderer/services/editor-service';

// Mock Monaco
const mockMonaco = {
  Uri: {
    file: jest.fn((path: string) => ({ path })),
  },
  editor: {
    createModel: jest.fn((content: string, _language: string, _uri: any) => {
      let currentContent = content;
      return {
        getValue: jest.fn(() => currentContent),
        setValue: jest.fn((newContent: string) => { currentContent = newContent; }),
        dispose: jest.fn(),
      };
    }),
    setModelMarkers: jest.fn(),
  },
  MarkerSeverity: {
    Error: 8,
    Warning: 4,
    Info: 2,
    Hint: 1,
  },
};

// Make monaco available globally
(global as any).monaco = mockMonaco;

describe('EditorService', () => {
  let mockEditor: any;
  let editorService: EditorService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEditor = {
      getValue: jest.fn(() => 'test content'),
      setModel: jest.fn(),
      getModel: jest.fn(() => ({ path: 'test.ts' })),
      saveViewState: jest.fn(() => ({ position: 1 })),
      restoreViewState: jest.fn(),
      getAction: jest.fn((_actionId: string) => ({
        run: jest.fn().mockResolvedValue(true),
      })),
    };

    editorService = new EditorService(mockEditor);
  });

  describe('Model Management', () => {
    it('should create a new model for a file', () => {
      const model = editorService.getOrCreateModel('test.ts', 'const x = 1;', 'typescript');

      expect(model).toBeDefined();
      expect(model.filePath).toBe('test.ts');
      expect(mockMonaco.editor.createModel).toHaveBeenCalledWith(
        'const x = 1;',
        'typescript',
        expect.any(Object)
      );
    });

    it('should return existing model if already created', () => {
      const model1 = editorService.getOrCreateModel('test.ts', 'const x = 1;', 'typescript');
      const model2 = editorService.getOrCreateModel('test.ts', 'const x = 2;', 'typescript');

      expect(model1).toBe(model2);
      expect(mockMonaco.editor.createModel).toHaveBeenCalledTimes(1);
    });

    it('should switch between models', () => {
      editorService.getOrCreateModel('file1.ts', 'content1', 'typescript');
      editorService.getOrCreateModel('file2.ts', 'content2', 'typescript');

      const switched = editorService.switchToModel('file1.ts');

      expect(switched).toBe(true);
      expect(mockEditor.setModel).toHaveBeenCalled();
    });

    it('should save and restore view state when switching', () => {
      editorService.loadFile('file1.ts', 'content1', 'typescript');
      editorService.loadFile('file2.ts', 'content2', 'typescript');
      editorService.switchToModel('file1.ts');

      expect(mockEditor.saveViewState).toHaveBeenCalled();
      expect(mockEditor.restoreViewState).toHaveBeenCalled();
    });

    it('should close and dispose a model', () => {
      const model = editorService.getOrCreateModel('test.ts', 'content', 'typescript');
      const closed = editorService.closeModel('test.ts');

      expect(closed).toBe(true);
      expect(model.model.dispose).toHaveBeenCalled();
    });

    it('should get list of open models', () => {
      editorService.getOrCreateModel('file1.ts', 'content1', 'typescript');
      editorService.getOrCreateModel('file2.ts', 'content2', 'typescript');

      const openModels = editorService.getOpenModels();

      expect(openModels).toEqual(['file1.ts', 'file2.ts']);
    });
  });

  describe('Editor Commands', () => {
    it('should format document', async () => {
      const result = await editorService.formatDocument();

      expect(result).toBe(true);
      expect(mockEditor.getAction).toHaveBeenCalledWith('editor.action.formatDocument');
    });

    it('should go to definition', async () => {
      const result = await editorService.goToDefinition();

      expect(result).toBe(true);
      expect(mockEditor.getAction).toHaveBeenCalledWith('editor.action.revealDefinition');
    });

    it('should peek definition', async () => {
      const result = await editorService.peekDefinition();

      expect(result).toBe(true);
      expect(mockEditor.getAction).toHaveBeenCalledWith('editor.action.peekDefinition');
    });

    it('should find references', async () => {
      const result = await editorService.findReferences();

      expect(result).toBe(true);
      expect(mockEditor.getAction).toHaveBeenCalledWith('editor.action.referenceSearch.trigger');
    });

    it('should rename symbol', async () => {
      const result = await editorService.renameSymbol();

      expect(result).toBe(true);
      expect(mockEditor.getAction).toHaveBeenCalledWith('editor.action.rename');
    });

    it('should handle command errors gracefully', async () => {
      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockEditor.getAction = jest.fn(() => ({
        run: jest.fn().mockRejectedValue(new Error('Command failed')),
      }));

      const result = await editorService.formatDocument();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[EditorService] Format failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Diagnostics', () => {
    it('should set diagnostics on current model', () => {
      editorService.loadFile('test.ts', 'content', 'typescript');

      const diagnostics: Diagnostic[] = [
        {
          severity: 'error',
          message: 'Test error',
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 10,
        },
      ];

      editorService.setDiagnostics(diagnostics);

      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        expect.any(Object),
        'novi',
        expect.arrayContaining([
          expect.objectContaining({
            severity: mockMonaco.MarkerSeverity.Error,
            message: 'Test error',
          }),
        ])
      );
    });

    it('should clear all diagnostics', () => {
      editorService.loadFile('test.ts', 'content', 'typescript');
      editorService.clearDiagnostics();

      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        expect.any(Object),
        'novi',
        []
      );
    });

    it('should run mock linting', () => {
      mockEditor.getValue = jest.fn(() => 'const x = 1;\nconsole.log(x);\n// TODO: fix');
      editorService.loadFile('test.ts', '', 'typescript');
      
      editorService.runMockLinting();

      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalled();
    });

    it('should detect console.log statements in linting', () => {
      mockEditor.getValue = jest.fn(() => 'console.log("test");');
      editorService.loadFile('test.ts', '', 'typescript');
      
      editorService.runMockLinting();

      const markers = (mockMonaco.editor.setModelMarkers as jest.Mock).mock.calls[0][2];
      expect(markers.length).toBeGreaterThan(0);
      expect(markers[0].message).toContain('console');
    });

    it('should detect TODO comments in linting', () => {
      mockEditor.getValue = jest.fn(() => '// TODO: implement this');
      editorService.loadFile('test.ts', '', 'typescript');
      
      editorService.runMockLinting();

      const markers = (mockMonaco.editor.setModelMarkers as jest.Mock).mock.calls[0][2];
      expect(markers.length).toBeGreaterThan(0);
      expect(markers[0].message).toContain('TODO');
    });

    it('should map severity levels correctly', () => {
      const diagnostics: Diagnostic[] = [
        { severity: 'error', message: 'Error', startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 },
        { severity: 'warning', message: 'Warning', startLine: 2, startColumn: 1, endLine: 2, endColumn: 1 },
        { severity: 'info', message: 'Info', startLine: 3, startColumn: 1, endLine: 3, endColumn: 1 },
      ];

      editorService.loadFile('test.ts', '', 'typescript');
      editorService.setDiagnostics(diagnostics);

      const markers = (mockMonaco.editor.setModelMarkers as jest.Mock).mock.calls[0][2];
      expect(markers[0].severity).toBe(mockMonaco.MarkerSeverity.Error);
      expect(markers[1].severity).toBe(mockMonaco.MarkerSeverity.Warning);
      expect(markers[2].severity).toBe(mockMonaco.MarkerSeverity.Info);
    });
  });

  describe('Content Operations', () => {
    it('should get current value', () => {
      mockEditor.getValue = jest.fn(() => 'test content');

      const value = editorService.getValue();

      expect(value).toBe('test content');
    });

    it('should get current file path', () => {
      editorService.loadFile('test.ts', 'content', 'typescript');

      const filePath = editorService.getCurrentFilePath();

      expect(filePath).toBe('test.ts');
    });

    it('should return null for file path when no file loaded', () => {
      const filePath = editorService.getCurrentFilePath();

      expect(filePath).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should dispose all models', () => {
      const model1 = editorService.getOrCreateModel('file1.ts', 'content1', 'typescript');
      const model2 = editorService.getOrCreateModel('file2.ts', 'content2', 'typescript');

      editorService.dispose();

      expect(model1.model.dispose).toHaveBeenCalled();
      expect(model2.model.dispose).toHaveBeenCalled();
      expect(editorService.getOpenModels()).toEqual([]);
    });
  });
});

