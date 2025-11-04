/**
 * Monaco Editor Unit Tests
 * Tests for the Monaco Editor integration
 */

import { MonacoEditorView, EditorOptions, detectLanguage } from '../../renderer/editor/monaco-editor';

// Mock monaco-editor using manual mock
jest.mock('monaco-editor');

describe('MonacoEditorView', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a container element
    container = document.createElement('div');
    container.id = 'test-editor';
    document.body.appendChild(container);

    // Reset Monaco environment
    (global as any).self = global;
  });

  afterEach(() => {
    // Clean up
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Initialization', () => {
    it('should create a Monaco editor instance', () => {
      const editor = new MonacoEditorView(container);
      expect(editor).toBeDefined();
      expect(editor.getEditor()).toBeTruthy();
    });

    it('should initialize with default options', () => {
      const monaco = require('monaco-editor');
      new MonacoEditorView(container);

      expect(monaco.editor.create).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          theme: 'vs-dark',
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
        })
      );
    });

    it('should initialize with custom options', () => {
      const monaco = require('monaco-editor');
      const options: EditorOptions = {
        theme: 'light',
        fontSize: 16,
        wordWrap: 'off',
        minimap: false,
        lineNumbers: 'relative',
      };

      new MonacoEditorView(container, options);

      expect(monaco.editor.create).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          theme: 'vs-light',
          fontSize: 16,
          wordWrap: 'off',
          lineNumbers: 'relative',
        })
      );
    });

    it('should set up Monaco environment with worker configuration', () => {
      new MonacoEditorView(container);
      
      expect((global as any).self.MonacoEnvironment).toBeDefined();
      expect((global as any).self.MonacoEnvironment.getWorkerUrl).toBeInstanceOf(Function);
    });
  });

  describe('Content Management', () => {
    it('should set editor value', () => {
      const editor = new MonacoEditorView(container);
      const mockEditorInstance = editor.getEditor();

      editor.setValue('new content');

      expect(mockEditorInstance?.setValue).toHaveBeenCalledWith('new content');
    });

    it('should get editor value', () => {
      const editor = new MonacoEditorView(container);
      const value = editor.getValue();

      expect(value).toBe('test content');
    });
  });

  describe('Language Support', () => {
    it('should set editor language', () => {
      const monaco = require('monaco-editor');
      const editor = new MonacoEditorView(container);

      editor.setLanguage('typescript');

      expect(monaco.editor.setModelLanguage).toHaveBeenCalled();
    });
  });

  describe('Theme Management', () => {
    it('should set light theme', () => {
      const monaco = require('monaco-editor');
      const editor = new MonacoEditorView(container);

      editor.setTheme('light');

      expect(monaco.editor.setTheme).toHaveBeenCalledWith('vs-light');
    });

    it('should set dark theme', () => {
      const monaco = require('monaco-editor');
      const editor = new MonacoEditorView(container);

      editor.setTheme('dark');

      expect(monaco.editor.setTheme).toHaveBeenCalledWith('vs-dark');
    });
  });

  describe('Editor Options', () => {
    it('should update editor options', () => {
      const editor = new MonacoEditorView(container);
      const mockEditorInstance = editor.getEditor();

      editor.updateOptions({
        fontSize: 18,
        wordWrap: 'off',
        minimap: false,
      });

      expect(mockEditorInstance?.updateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          fontSize: 18,
          wordWrap: 'off',
          minimap: { enabled: false },
        })
      );
    });

    it('should update theme via options', () => {
      const monaco = require('monaco-editor');
      const editor = new MonacoEditorView(container);

      editor.updateOptions({ theme: 'light' });

      expect(monaco.editor.setTheme).toHaveBeenCalledWith('vs-light');
    });
  });

  describe('Editor Operations', () => {
    it('should focus editor', () => {
      const editor = new MonacoEditorView(container);
      const mockEditorInstance = editor.getEditor();

      editor.focus();

      expect(mockEditorInstance?.focus).toHaveBeenCalled();
    });

    it('should layout editor', () => {
      const editor = new MonacoEditorView(container);
      const mockEditorInstance = editor.getEditor();

      editor.layout();

      expect(mockEditorInstance?.layout).toHaveBeenCalled();
    });

    it('should dispose editor', () => {
      const editor = new MonacoEditorView(container);
      const mockEditorInstance = editor.getEditor();

      editor.dispose();

      expect(mockEditorInstance?.dispose).toHaveBeenCalled();
      expect(editor.getEditor()).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should return false for isDirty (placeholder)', () => {
      const editor = new MonacoEditorView(container);
      expect(editor.isDirty()).toBe(false);
    });
  });
});

describe('detectLanguage', () => {
  it('should detect JavaScript', () => {
    expect(detectLanguage('test.js')).toBe('javascript');
  });

  it('should detect TypeScript', () => {
    expect(detectLanguage('test.ts')).toBe('typescript');
  });

  it('should detect JSON', () => {
    expect(detectLanguage('package.json')).toBe('json');
  });

  it('should detect HTML', () => {
    expect(detectLanguage('index.html')).toBe('html');
  });

  it('should detect CSS', () => {
    expect(detectLanguage('styles.css')).toBe('css');
  });

  it('should detect Python', () => {
    expect(detectLanguage('script.py')).toBe('python');
  });

  it('should detect Markdown', () => {
    expect(detectLanguage('README.md')).toBe('markdown');
  });

  it('should return plaintext for unknown extensions', () => {
    expect(detectLanguage('file.xyz')).toBe('plaintext');
  });

  it('should return plaintext for files without extension', () => {
    expect(detectLanguage('Makefile')).toBe('plaintext');
  });

  it('should be case insensitive', () => {
    expect(detectLanguage('Test.JS')).toBe('javascript');
    expect(detectLanguage('Test.TS')).toBe('typescript');
  });
});

describe('Monaco Environment Configuration', () => {
  beforeEach(() => {
    (global as any).self = global;
  });

  it('should configure worker URLs correctly', () => {
    new MonacoEditorView(document.createElement('div'));

    const getWorkerUrl = (global as any).self.MonacoEnvironment.getWorkerUrl;
    
    expect(getWorkerUrl('', 'json')).toBe('./vs/language/json/json.worker.js');
    expect(getWorkerUrl('', 'css')).toBe('./vs/language/css/css.worker.js');
    expect(getWorkerUrl('', 'html')).toBe('./vs/language/html/html.worker.js');
    expect(getWorkerUrl('', 'typescript')).toBe('./vs/language/typescript/ts.worker.js');
    expect(getWorkerUrl('', 'javascript')).toBe('./vs/language/typescript/ts.worker.js');
    expect(getWorkerUrl('', 'other')).toBe('./vs/editor/editor.worker.js');
  });
});

