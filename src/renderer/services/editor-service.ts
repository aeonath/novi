/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * EditorService - Centralized Monaco Editor operations
 * Handles model management, commands, diagnostics, and formatting
 */

declare const monaco: typeof import('monaco-editor');

export interface EditorModel {
  filePath: string;
  model: any; // monaco.editor.ITextModel
  viewState: any; // monaco.editor.ICodeEditorViewState | null
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export class EditorService {
  private editor: any; // monaco.editor.IStandaloneCodeEditor
  private models: Map<string, EditorModel> = new Map();
  private currentFilePath: string | null = null;

  constructor(editor: any) {
    this.editor = editor;
  }

  /**
   * Create or get a model for a file
   */
  public getOrCreateModel(filePath: string, content: string, language: string): EditorModel {
    // If model exists, update its content to match what was passed in
    if (this.models.has(filePath)) {
      const existing = this.models.get(filePath)!;
      if (existing.model.getValue() !== content) {
        existing.model.setValue(content);
      }
      return existing;
    }

    // Create new model
    const uri = monaco.Uri.file(filePath);
    const model = monaco.editor.createModel(content, language, uri);

    const editorModel: EditorModel = {
      filePath,
      model,
      viewState: null,
    };

    this.models.set(filePath, editorModel);
    console.log(`[EditorService] Created model for ${filePath} (${language})`);

    // Force retokenization after a short delay.
    // Monarch tokenizers (shell, python, markdown, etc.) load async via AMD.
    // TS/JS also need a nudge for their worker-based tokenization.
    // Re-setting the language after a delay ensures the tokenizer has loaded.
    if (language !== 'plaintext') {
      setTimeout(() => {
        try {
          if (language === 'typescript' || language === 'javascript') {
            const tsApi = (monaco as any).languages?.typescript;
            if (tsApi && typeof tsApi.getTypeScriptWorker === 'function') {
              tsApi.getTypeScriptWorker()
                .then(() => {
                  monaco.editor.setModelLanguage(model, 'plaintext');
                  monaco.editor.setModelLanguage(model, language);
                })
                .catch(() => {});
            }
          }
          monaco.editor.setModelLanguage(model, 'plaintext');
          monaco.editor.setModelLanguage(model, language);
        } catch (e) {
          console.warn(`[EditorService] Failed to retokenize ${language} model:`, e);
        }
      }, 300);
    }

    return editorModel;
  }

  /**
   * Switch to a different file/model
   */
  public switchToModel(filePath: string): boolean {
    const editorModel = this.models.get(filePath);
    if (!editorModel) {
      console.warn(`[EditorService] Model not found for ${filePath}`);
      return false;
    }

    // Save current view state before switching
    if (this.currentFilePath) {
      const currentModel = this.models.get(this.currentFilePath);
      if (currentModel) {
        currentModel.viewState = this.editor.saveViewState();
      }
    }

    // Switch model
    this.editor.setModel(editorModel.model);
    this.currentFilePath = filePath;

    // Restore view state
    if (editorModel.viewState) {
      this.editor.restoreViewState(editorModel.viewState);
    }

    // Force retokenization — Monarch tokenizers load async via AMD and may
    // not be ready when the model was first created. Re-setting the language
    // ensures the tokenizer runs once the provider is available.
    const lang = editorModel.model.getLanguageId();
    if (lang && lang !== 'plaintext') {
      monaco.editor.setModelLanguage(editorModel.model, lang);
    }

    console.log(`[EditorService] Switched to ${filePath}`);
    return true;
  }

  /**
   * Load file into editor (creates model if needed)
   */
  public loadFile(filePath: string, content: string, language: string): void {
    this.getOrCreateModel(filePath, content, language);
    this.switchToModel(filePath);
  }

  /**
   * Get current model's content
   */
  public getValue(): string {
    return this.editor.getValue();
  }

  /**
   * Get current file path
   */
  public getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  /**
   * Format current document
   */
  public async formatDocument(): Promise<boolean> {
    try {
      if (!this.editor) {
        console.error('[EditorService] No editor instance');
        return false;
      }

      console.log('[EditorService] Formatting document...');
      await this.editor.getAction('editor.action.formatDocument')?.run();
      console.log('[EditorService] Document formatted');
      return true;
    } catch (error) {
      console.error('[EditorService] Format failed:', error);
      return false;
    }
  }

  /**
   * Go to definition
   */
  public async goToDefinition(): Promise<boolean> {
    try {
      if (!this.editor) {
        console.error('[EditorService] No editor instance');
        return false;
      }

      console.log('[EditorService] Go to definition...');
      await this.editor.getAction('editor.action.revealDefinition')?.run();
      return true;
    } catch (error) {
      console.error('[EditorService] Go to definition failed:', error);
      return false;
    }
  }

  /**
   * Peek definition
   */
  public async peekDefinition(): Promise<boolean> {
    try {
      if (!this.editor) {
        console.error('[EditorService] No editor instance');
        return false;
      }

      console.log('[EditorService] Peek definition...');
      await this.editor.getAction('editor.action.peekDefinition')?.run();
      return true;
    } catch (error) {
      console.error('[EditorService] Peek definition failed:', error);
      return false;
    }
  }

  /**
   * Find all references
   */
  public async findReferences(): Promise<boolean> {
    try {
      if (!this.editor) {
        console.error('[EditorService] No editor instance');
        return false;
      }

      console.log('[EditorService] Finding references...');
      await this.editor.getAction('editor.action.referenceSearch.trigger')?.run();
      return true;
    } catch (error) {
      console.error('[EditorService] Find references failed:', error);
      return false;
    }
  }

  /**
   * Peek references
   */
  public async peekReferences(): Promise<boolean> {
    try {
      if (!this.editor) {
        console.error('[EditorService] No editor instance');
        return false;
      }

      console.log('[EditorService] Peek references...');
      await this.editor.getAction('editor.action.referenceSearch.trigger')?.run();
      return true;
    } catch (error) {
      console.error('[EditorService] Peek references failed:', error);
      return false;
    }
  }

  /**
   * Rename symbol
   */
  public async renameSymbol(): Promise<boolean> {
    try {
      if (!this.editor) {
        console.error('[EditorService] No editor instance');
        return false;
      }

      console.log('[EditorService] Rename symbol...');
      await this.editor.getAction('editor.action.rename')?.run();
      return true;
    } catch (error) {
      console.error('[EditorService] Rename symbol failed:', error);
      return false;
    }
  }

  /**
   * Set diagnostics/markers for current model
   */
  public setDiagnostics(diagnostics: Diagnostic[]): void {
    const model = this.editor.getModel();
    if (!model) {
      console.warn('[EditorService] No model to set diagnostics');
      return;
    }

    const markers = diagnostics.map((diag) => ({
      severity: this.getSeverity(diag.severity),
      message: diag.message,
      startLineNumber: diag.startLine,
      startColumn: diag.startColumn,
      endLineNumber: diag.endLine,
      endColumn: diag.endColumn,
    }));

    monaco.editor.setModelMarkers(model, 'novi', markers);
    console.log(`[EditorService] Set ${markers.length} diagnostic(s)`);
  }

  /**
   * Clear all diagnostics for current model
   */
  public clearDiagnostics(): void {
    const model = this.editor.getModel();
    if (!model) {
      return;
    }

    monaco.editor.setModelMarkers(model, 'novi', []);
    console.log('[EditorService] Cleared diagnostics');
  }

  /**
   * Run mock linting (for demonstration)
   */
  public runMockLinting(): void {
    const content = this.getValue();
    const diagnostics: Diagnostic[] = [];

    // Simple mock linting rules
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // Check for console.log (warning)
      if (line.includes('console.log')) {
        diagnostics.push({
          severity: 'warning',
          message: 'Unexpected console statement',
          startLine: index + 1,
          startColumn: line.indexOf('console.log') + 1,
          endLine: index + 1,
          endColumn: line.indexOf('console.log') + 'console.log'.length + 1,
        });
      }

      // Check for TODO comments (info)
      if (line.includes('TODO') || line.includes('FIXME')) {
        diagnostics.push({
          severity: 'info',
          message: 'TODO comment',
          startLine: index + 1,
          startColumn: line.indexOf('TODO') !== -1 ? line.indexOf('TODO') + 1 : line.indexOf('FIXME') + 1,
          endLine: index + 1,
          endColumn: line.length + 1,
        });
      }
    });

    this.setDiagnostics(diagnostics);
  }

  /**
   * Get Monaco severity constant
   */
  private getSeverity(severity: 'error' | 'warning' | 'info'): number {
    switch (severity) {
      case 'error':
        return monaco.MarkerSeverity.Error;
      case 'warning':
        return monaco.MarkerSeverity.Warning;
      case 'info':
        return monaco.MarkerSeverity.Info;
      default:
        return monaco.MarkerSeverity.Hint;
    }
  }

  /**
   * Close a model and dispose it
   */
  public closeModel(filePath: string): boolean {
    const editorModel = this.models.get(filePath);
    if (!editorModel) {
      return false;
    }

    editorModel.model.dispose();
    this.models.delete(filePath);

    if (this.currentFilePath === filePath) {
      this.currentFilePath = null;
    }

    console.log(`[EditorService] Closed model for ${filePath}`);
    return true;
  }

  /**
   * Get all open models
   */
  public getOpenModels(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Dispose all models and cleanup
   */
  public dispose(): void {
    this.models.forEach((model) => {
      model.model.dispose();
    });
    this.models.clear();
    this.currentFilePath = null;
    console.log('[EditorService] Disposed all models');
  }
}

