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

  constructor(container: HTMLElement, options: EditorOptions = {}) {
    this.container = container;
    this.initializeMonaco(options);
  }

  private initializeMonaco(options: EditorOptions): void {
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
      theme: this.currentTheme === 'light' ? 'vs-light' : 'vs-dark',
      fontSize: options.fontSize || 14,
      wordWrap: options.wordWrap || 'on',
      minimap: {
        enabled: options.minimap !== undefined ? options.minimap : true,
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
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }

  /**
   * Apply Nova theme (light or dark)
   */
  public setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    if (this.editor) {
      monaco.editor.setTheme(theme === 'light' ? 'vs-light' : 'vs-dark');
    }
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
   * Check if content has been modified
   */
  public isDirty(): boolean {
    // This will be enhanced later when we track file state
    return false;
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
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'sh': 'shell',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
  };

  return languageMap[ext || ''] || 'plaintext';
}

