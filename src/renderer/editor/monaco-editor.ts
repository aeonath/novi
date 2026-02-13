/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Monaco Editor Integration for Nova
 * 
 * This component wraps the Monaco Editor and integrates it with Nova's theme system
 * and file operations.
 */

// Monaco types for TypeScript
/// <reference types="monaco-editor" />

// Monaco is loaded via AMD loader, so we use the global
declare const monaco: typeof import('monaco-editor');

import type { Theme } from '../theme.js';

export interface EditorOptions {
  language?: string;
  theme?: string;
  fontSize?: number;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  minimap?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative';
  readOnly?: boolean;
}

export class MonacoEditorView {
  private editor: any | null = null;
  private container: HTMLElement;
  private currentTheme: 'light' | 'dark' = 'dark';
  private currentFilePath: string | null = null;
  private isDirtyFlag: boolean = false;
  private savedContent: string = '';
  private onDirtyChangeCallback: ((isDirty: boolean) => void) | null = null;

  constructor(container: HTMLElement, options: EditorOptions = {}) {
    this.container = container;
    this.defineNovaThemes();
    this.initializeMonaco(options);
    this.setupChangeListener();
  }

  /**
   * Define custom Nova themes for Monaco
   */
  private defineNovaThemes(): void {
    // Define Nova Dark theme
    monaco.editor.defineTheme('novi-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'function', foreground: 'dcdcaa' },
        { token: 'variable', foreground: '9cdcfe' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'class', foreground: '4ec9b0' },
        { token: 'interface', foreground: '4ec9b0' },
        { token: 'namespace', foreground: '4ec9b0' },
        { token: 'parameter', foreground: '9cdcfe' },
        { token: 'property', foreground: '9cdcfe' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'delimiter', foreground: 'd4d4d4' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#2d2d30',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorCursor.foreground': '#ffffff',
        'editorWhitespace.foreground': '#3e3e42',
        'editorIndentGuide.background': '#3e3e42',
        'editorIndentGuide.activeBackground': '#707070',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorWidget.background': '#252526',
        'editorWidget.border': '#3e3e42',
        'editorSuggestWidget.background': '#252526',
        'editorSuggestWidget.border': '#3e3e42',
        'editorSuggestWidget.foreground': '#cccccc',
        'editorSuggestWidget.selectedBackground': '#062f4a',
        'editorHoverWidget.background': '#252526',
        'editorHoverWidget.border': '#3e3e42',
        'input.background': '#2d2d30',
        'input.border': '#3e3e42',
        'input.foreground': '#cccccc',
        'inputOption.activeBorder': '#007acc',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464b3',
        'scrollbarSlider.activeBackground': '#bfbfbf66',
      },
    });

    // Define Nova Light theme
    monaco.editor.defineTheme('novi-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
        { token: 'string', foreground: 'a31515' },
        { token: 'number', foreground: '098658' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'function', foreground: '795e26' },
        { token: 'variable', foreground: '001080' },
        { token: 'type', foreground: '2d9574' },
        { token: 'class', foreground: '2d9574' },
        { token: 'interface', foreground: '2d9574' },
        { token: 'namespace', foreground: '2d9574' },
        { token: 'parameter', foreground: '001080' },
        { token: 'property', foreground: '001080' },
        { token: 'operator', foreground: '000000' },
        { token: 'delimiter', foreground: '000000' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1e1e1e',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editor.selectionBackground': '#add6ff',
        'editor.inactiveSelectionBackground': '#e5ebf1',
        'editorCursor.foreground': '#000000',
        'editorWhitespace.foreground': '#cccccc',
        'editorIndentGuide.background': '#cccccc',
        'editorIndentGuide.activeBackground': '#999999',
        'editorLineNumber.foreground': '#999999',
        'editorLineNumber.activeForeground': '#333333',
        'editorWidget.background': '#f5f5f5',
        'editorWidget.border': '#cccccc',
        'editorSuggestWidget.background': '#f5f5f5',
        'editorSuggestWidget.border': '#cccccc',
        'editorSuggestWidget.foreground': '#333333',
        'editorSuggestWidget.selectedBackground': '#c8e4f8',
        'editorHoverWidget.background': '#f5f5f5',
        'editorHoverWidget.border': '#cccccc',
        'input.background': '#ffffff',
        'input.border': '#cccccc',
        'input.foreground': '#333333',
        'inputOption.activeBorder': '#0066cc',
        'scrollbarSlider.background': '#64646466',
        'scrollbarSlider.hoverBackground': '#646464b3',
        'scrollbarSlider.activeBackground': '#00000099',
      },
    });
  }

  private initializeMonaco(options: EditorOptions): void {
    try {
      // Set up Monaco environment for web workers
      self.MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: string, label: string) {
          if (label === 'json') {
            return './vs/language/json/json.worker.js';
          }
          if (label === 'css' || label === 'scss' || label === 'less') {
            return './vs/language/css/css.worker.js';
          }
          if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './vs/language/html/html.worker.js';
          }
          if (label === 'typescript' || label === 'javascript') {
            return './vs/language/typescript/ts.worker.js';
          }
          return './vs/editor/editor.worker.js';
        },
      };

      // Determine theme
      const novaTheme = options.theme || 'dark';
      this.currentTheme = novaTheme === 'light' ? 'light' : 'dark';

      // Create editor instance
      this.editor = monaco.editor.create(this.container, {
        value: this.getWelcomeContent(),
        language: options.language || 'plaintext',
        theme: this.currentTheme === 'light' ? 'novi-light' : 'novi-dark',
        fontSize: options.fontSize || 14,
        wordWrap: options.wordWrap || 'on',
        minimap: {
          enabled: false, // Disabled for Sprint 3 Task 5
        },
        lineNumbers: options.lineNumbers || 'on',
        readOnly: options.readOnly || false,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        bracketPairColorization: {
          enabled: true,
        },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
      });

      console.log('[MonacoEditor] Initialized successfully');
    } catch (error) {
      console.error('[MonacoEditor] Failed to initialize:', error);
      throw error; // Re-throw so caller can handle
    }
  }

  private setupChangeListener(): void {
    if (!this.editor) {
      return;
    }

    // Listen for content changes
    this.editor.onDidChangeModelContent(() => {
      const currentContent = this.getValue();
      const wasDirty = this.isDirtyFlag;
      this.isDirtyFlag = currentContent !== this.savedContent;

      // Notify callback if dirty state changed
      if (wasDirty !== this.isDirtyFlag && this.onDirtyChangeCallback) {
        this.onDirtyChangeCallback(this.isDirtyFlag);
      }
    });
  }

  private getWelcomeContent(): string {
    return `// Welcome to Nova IDE
// Press Ctrl+K to open the Action HUD

// This is the Monaco Editor - a powerful code editor
// Features available:
// - Syntax highlighting
// - IntelliSense and auto-completion
// - Find and replace (Ctrl+F)
// - Multiple cursors (Alt+Click)
// - Go to definition (F12)

// Try editing this file or open a new one!

function helloNova() {
  console.log("Build. Learn. Iterate.");
}
`;
  }

  /**
   * Set the editor content
   */
  public setValue(content: string): void {
    if (this.editor) {
      this.editor.setValue(content);
    }
  }

  /**
   * Get the current editor content
   */
  public getValue(): string {
    return this.editor?.getValue() || '';
  }

  /**
   * Set the programming language
   */
  public setLanguage(language: string): void {
    if (this.editor) {
      const model = this.editor.getModel();
      if (model) {
        console.log(`[MonacoEditor] Setting language to: ${language}`);
        monaco.editor.setModelLanguage(model, language);
      } else {
        console.warn('[MonacoEditor] No model available to set language');
      }
    } else {
      console.warn('[MonacoEditor] Editor not initialized, cannot set language');
    }
  }

  /**
   * Apply Nova theme (light or dark)
   */
  public setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    if (this.editor) {
      monaco.editor.setTheme(theme === 'light' ? 'novi-light' : 'novi-dark');
    }
  }

  /**
   * Apply Novi theme from Theme object
   */
  public applyNoviTheme(theme: Theme): void {
    const monacoTheme = theme.id === 'light' ? 'light' : 'dark';
    this.setTheme(monacoTheme);
  }

  /**
   * Update editor options
   */
  public updateOptions(options: EditorOptions): void {
    if (!this.editor) {
      return;
    }

    this.editor.updateOptions({
      fontSize: options.fontSize,
      wordWrap: options.wordWrap,
      minimap: options.minimap !== undefined ? { enabled: options.minimap } : undefined,
      lineNumbers: options.lineNumbers,
      readOnly: options.readOnly,
    });

    if (options.theme) {
      this.setTheme(options.theme === 'light' ? 'light' : 'dark');
    }
  }

  /**
   * Focus the editor
   */
  public focus(): void {
    this.editor?.focus();
  }

  /**
   * Get editor instance (for advanced usage)
   */
  public getEditor(): any | null {
    return this.editor;
  }

  /**
   * Load a file into the editor
   */
  public loadFile(filePath: string, content: string): void {
    this.currentFilePath = filePath;
    this.savedContent = content;
    this.setValue(content);
    this.isDirtyFlag = false;
    
    // Detect and set language
    const language = detectLanguage(filePath);
    console.log(`[MonacoEditor] Loading file: ${filePath}, detected language: ${language}`);
    this.setLanguage(language);
    
    // Notify dirty state changed
    if (this.onDirtyChangeCallback) {
      this.onDirtyChangeCallback(false);
    }
  }

  /**
   * Mark content as saved
   */
  public markAsSaved(): void {
    this.savedContent = this.getValue();
    this.isDirtyFlag = false;
    
    if (this.onDirtyChangeCallback) {
      this.onDirtyChangeCallback(false);
    }
  }

  /**
   * Set the current file path
   */
  public setFilePath(filePath: string): void {
    this.currentFilePath = filePath;
  }

  /**
   * Get the current file path
   */
  public getFilePath(): string | null {
    return this.currentFilePath;
  }

  /**
   * Check if content has been modified
   */
  public isDirty(): boolean {
    return this.isDirtyFlag;
  }

  /**
   * Register a callback for dirty state changes
   */
  public onDirtyChange(callback: (isDirty: boolean) => void): void {
    this.onDirtyChangeCallback = callback;
  }

  /**
   * Resize the editor
   */
  public layout(): void {
    this.editor?.layout();
  }

  /**
   * Dispose the editor
   */
  public dispose(): void {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  }
}

/**
 * Helper function to detect language from file extension
 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'ts': 'typescript',
    'mts': 'typescript',
    'cts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    
    // Web
    'json': 'json',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    'xml': 'xml',
    
    // Markup/Documentation
    'md': 'markdown',
    'markdown': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
    
    // Systems Programming
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'hpp': 'cpp',
    'hxx': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    
    // Scripting
    'py': 'python',
    'pyw': 'python',
    'rb': 'ruby',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'php': 'php',
    
    // JVM Languages
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',
    
    // Database
    'sql': 'sql',
    
    // Other
    'r': 'r',
    'swift': 'swift',
    'dart': 'dart',
  };

  return languageMap[ext || ''] || 'plaintext';
}

