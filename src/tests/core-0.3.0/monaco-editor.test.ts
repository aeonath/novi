/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

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
    
    // Clear all mocks before each test
    jest.clearAllMocks();
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
      const editor = new MonacoEditorView(container);
      
      // Verify editor was created
      expect(editor).toBeDefined();
      expect(editor.getEditor()).toBeTruthy();
    });

    it('should initialize with custom options', () => {
      const options: EditorOptions = {
        theme: 'light',
        fontSize: 16,
        wordWrap: 'off',
        minimap: false,
        lineNumbers: 'relative',
      };

      const editor = new MonacoEditorView(container, options);
      
      // Verify editor was created with custom options
      expect(editor).toBeDefined();
      expect(editor.getEditor()).toBeTruthy();
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
      const editor = new MonacoEditorView(container);

      // Should not throw
      expect(() => editor.setLanguage('typescript')).not.toThrow();
    });
  });

  describe('Theme Management', () => {
    it('should set light theme', () => {
      const editor = new MonacoEditorView(container);

      // Should not throw
      expect(() => editor.setTheme('light')).not.toThrow();
    });

    it('should set dark theme', () => {
      const editor = new MonacoEditorView(container);

      // Should not throw
      expect(() => editor.setTheme('dark')).not.toThrow();
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
      const editor = new MonacoEditorView(container);

      // Should not throw
      expect(() => editor.updateOptions({ theme: 'light' })).not.toThrow();
    });
  });

  describe('Novi Theme Synchronization', () => {
    it('should define Nova custom themes on initialization', () => {
      const editor = new MonacoEditorView(container);
      expect(editor).toBeDefined();
      expect(monaco.editor.defineTheme).toHaveBeenCalled();
    });

    it('should apply Nova dark theme by default', () => {
      const editor = new MonacoEditorView(container);
      expect(editor).toBeDefined();
      const createCalls = (monaco.editor.create as jest.Mock).mock.calls;
      expect(createCalls.length).toBeGreaterThan(0);
    });

    it('should apply Nova light theme when specified', () => {
      const editor = new MonacoEditorView(container, { theme: 'light' });
      expect(editor).toBeDefined();
      const createCalls = (monaco.editor.create as jest.Mock).mock.calls;
      expect(createCalls.length).toBeGreaterThan(0);
    });

    it('should switch to novi-light theme', () => {
      const editor = new MonacoEditorView(container);
      editor.setTheme('light');
      expect(monaco.editor.setTheme).toHaveBeenCalledWith('novi-light');
    });

    it('should switch to novi-dark theme', () => {
      const editor = new MonacoEditorView(container);
      editor.setTheme('dark');
      expect(monaco.editor.setTheme).toHaveBeenCalledWith('novi-dark');
    });

    it('should apply theme from Novi Theme object (light)', () => {
      const editor = new MonacoEditorView(container);
      const mockTheme = {
        id: 'light',
        name: 'Light',
        colors: {} as any,
        typography: {} as any,
        spacing: {} as any,
        shadows: {} as any,
        borderRadius: {} as any,
      };
      editor.applyNoviTheme(mockTheme);
      expect(monaco.editor.setTheme).toHaveBeenCalledWith('novi-light');
    });

    it('should apply theme from Novi Theme object (dark)', () => {
      const editor = new MonacoEditorView(container);
      const mockTheme = {
        id: 'dark',
        name: 'Dark',
        colors: {} as any,
        typography: {} as any,
        spacing: {} as any,
        shadows: {} as any,
        borderRadius: {} as any,
      };
      editor.applyNoviTheme(mockTheme);
      expect(monaco.editor.setTheme).toHaveBeenCalledWith('novi-dark');
    });

    it('should default to dark theme for unknown theme ids', () => {
      const editor = new MonacoEditorView(container);
      const mockTheme = {
        id: 'unknown',
        name: 'Unknown',
        colors: {} as any,
        typography: {} as any,
        spacing: {} as any,
        shadows: {} as any,
        borderRadius: {} as any,
      };
      editor.applyNoviTheme(mockTheme);
      expect(monaco.editor.setTheme).toHaveBeenCalledWith('novi-dark');
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

  it('should detect modern JavaScript variants', () => {
    expect(detectLanguage('module.mjs')).toBe('javascript');
    expect(detectLanguage('module.cjs')).toBe('javascript');
  });

  it('should detect modern TypeScript variants', () => {
    expect(detectLanguage('module.mts')).toBe('typescript');
    expect(detectLanguage('module.cts')).toBe('typescript');
  });

  it('should detect C/C++ files', () => {
    expect(detectLanguage('file.c')).toBe('c');
    expect(detectLanguage('file.h')).toBe('c');
    expect(detectLanguage('file.cpp')).toBe('cpp');
    expect(detectLanguage('file.hpp')).toBe('cpp');
    expect(detectLanguage('file.cc')).toBe('cpp');
  });

  it('should detect shell scripts', () => {
    expect(detectLanguage('script.sh')).toBe('shell');
    expect(detectLanguage('script.bash')).toBe('shell');
    expect(detectLanguage('script.zsh')).toBe('shell');
  });

  it('should detect YAML files', () => {
    expect(detectLanguage('config.yaml')).toBe('yaml');
    expect(detectLanguage('config.yml')).toBe('yaml');
  });

  it('should detect JVM languages', () => {
    expect(detectLanguage('Main.java')).toBe('java');
    expect(detectLanguage('Main.kt')).toBe('kotlin');
    expect(detectLanguage('Main.scala')).toBe('scala');
  });

  it('should detect web files', () => {
    expect(detectLanguage('page.html')).toBe('html');
    expect(detectLanguage('page.htm')).toBe('html');
    expect(detectLanguage('style.scss')).toBe('scss');
    expect(detectLanguage('style.sass')).toBe('scss');
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

