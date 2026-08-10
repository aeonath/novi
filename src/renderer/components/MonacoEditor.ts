/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * MonacoEditor - Monaco Editor wrapper (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, setStyles } from '../core/dom.js';
import { appState } from '../core/app-state.js';
import { bus } from '../core/event-bus.js';
import { EditorService } from '../services/editor-service.js';
import { markReady } from '../utils/ready-events.js';
import { convertTmToMonarch } from '../../core/tm-to-monarch.js';

declare const monaco: typeof import('monaco-editor');

const WORD_WRAP_COLUMN = 90;

export interface MonacoEditorConfig {
  onDirtyChange?: (isDirty: boolean) => void;
  fontSize?: number;
  wordWrap?: boolean;
  lineNumbers?: boolean;
}

export class MonacoEditor extends Component {
  private editor: any = null;
  private editorService: EditorService | null = null;
  private editorContainer: HTMLElement;
  private vimStatusBar: HTMLElement;
  private vimAdapter: { dispose: () => void } | null = null;
  private contextMenuEl: HTMLElement | null = null;

  private currentFilePath: string | null = null;
  private savedContent = '';
  private savedContentMap: Map<string, string> = new Map();
  private isDirtyFlag = false;
  private onDirtyChange?: (isDirty: boolean) => void;
  private _fontSize: number;
  private _wordWrap: boolean;
  private _lineNumbers: boolean;
  private _showRuler = false;
  private _columnBreakEnabled = false;
  private _columnBreakValue = 90;
  private _columnBreakHard = false;

  constructor(config: MonacoEditorConfig = {}) {
    super('div');
    this.onDirtyChange = config.onDirtyChange;
    this._fontSize = config.fontSize ?? 14;
    this._wordWrap = config.wordWrap ?? false;
    this._lineNumbers = config.lineNumbers ?? true;

    // Wrapper
    setStyles(this.el, {
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden',
    });

    this.editorContainer = el('div');
    setStyles(this.editorContainer, { flex: '1', minHeight: '0', overflow: 'hidden' });

    this.vimStatusBar = el('div', { className: 'novi-vim-statusbar' });
    this.vimStatusBar.setAttribute('aria-hidden', 'true');
    setStyles(this.vimStatusBar, {
      flexShrink: '0', height: '22px', minHeight: '22px',
      backgroundColor: '#252526', borderTop: '1px solid #3e3e42',
      fontSize: '12px', color: '#cccccc', padding: '0 8px',
      display: 'flex', alignItems: 'center',
    });

    this.el.append(this.editorContainer, this.vimStatusBar);
  }

  protected onMount(): void {
    this.initEditor();
  }

  set fontSize(size: number) {
    this._fontSize = size;
    if (this.editor) {
      this.editor.updateOptions({ fontSize: size, lineHeight: size + 8 });
    }
  }

  set wordWrap(enabled: boolean) {
    this._wordWrap = enabled;
    if (this.editor) {
      this.editor.updateOptions({ wordWrap: enabled ? 'wordWrapColumn' : 'off', wordWrapColumn: this.effectiveWrapColumn() });
    }
  }

  /** Word Wrap's column follows Column Break's value whenever Column Break is enabled. */
  private effectiveWrapColumn(): number {
    return this._columnBreakEnabled ? this._columnBreakValue : WORD_WRAP_COLUMN;
  }

  set lineNumbers(enabled: boolean) {
    this._lineNumbers = enabled;
    if (this.editor) {
      this.editor.updateOptions({ lineNumbers: enabled ? 'on' : 'off' });
    }
  }

  /** Column Break settings — target line-length column, independent of Word Wrap. */
  setColumnBreak(enabled: boolean, value: number, hard: boolean): void {
    this._columnBreakEnabled = enabled;
    this._columnBreakValue = value;
    this._columnBreakHard = hard;
    this.applyRuler();
    // Word Wrap's column follows Column Break's value while it's enabled —
    // reapply live so an already-wrapped editor picks up the new column.
    if (this._wordWrap && this.editor) {
      this.editor.updateOptions({ wordWrapColumn: this.effectiveWrapColumn() });
    }
  }

  setShowRuler(enabled: boolean): void {
    this._showRuler = enabled;
    this.applyRuler();
  }

  private applyRuler(): void {
    if (!this.editor) return;
    this.editor.updateOptions({ rulers: this._showRuler ? [this._columnBreakValue] : [] });
  }

  /**
   * Loads Column Break / Show Ruler prefs (not passed through the config —
   * these are purely editor-internal, same self-contained pattern as
   * initVim() below) and applies the ruler. Fired once at editor creation;
   * live changes afterward arrive via the novi-columnbreak-changed /
   * novi-showruler-changed window events wired up in initEditor().
   */
  private async loadEditorPrefs(): Promise<void> {
    try {
      this._columnBreakEnabled = !!(await window.api?.getSetting<boolean>('columnbreak', false));
      this._columnBreakValue = (await window.api?.getSetting<number>('columnbreakvalue', 90)) ?? 90;
      this._columnBreakHard = !!(await window.api?.getSetting<boolean>('columnbreakhard', false));
      this._showRuler = !!(await window.api?.getSetting<boolean>('showruler', false));
      this.applyRuler();
      // Word Wrap was applied at editor creation using whatever Column
      // Break state existed then (still the defaults, since this load
      // hadn't resolved yet) — reapply now that the real values are in.
      if (this._wordWrap && this.editor) {
        this.editor.updateOptions({ wordWrapColumn: this.effectiveWrapColumn() });
      }
    } catch { /* use defaults */ }
  }

  /**
   * Hard Break: as the user types past the Column Break column, split the
   * line with a real newline instead of leaving it to Monaco's (purely
   * visual) word wrap. The two are alternatives — Word Wrap being on always
   * wins, so this no-ops in that case. Only reacts to actual keystrokes
   * (onDidType), not paste/programmatic edits, so it won't reflow pasted
   * text or fight with other edits; it breaks exactly at the column
   * boundary rather than the nearest word boundary.
   */
  private maybeHardBreak(): void {
    if (!this.editor || this._wordWrap || !this._columnBreakEnabled || !this._columnBreakHard) return;
    const model = this.editor.getModel();
    const pos = this.editor.getPosition();
    if (!model || !pos) return;
    const breakColumn = this._columnBreakValue + 1;
    if (pos.column < breakColumn) return;
    if (model.getLineContent(pos.lineNumber).length < this._columnBreakValue) return;
    this.editor.executeEdits('hard-break', [{
      range: new monaco.Range(pos.lineNumber, breakColumn, pos.lineNumber, breakColumn),
      text: '\n',
    }]);
  }

  private initEditor(): void {
    if (!this.editorContainer || typeof monaco === 'undefined') return;

    // Register worker-based languages
    const workerLangs = [
      { id: 'typescript', extensions: ['.ts', '.tsx'], aliases: ['TypeScript', 'ts', 'typescript'] },
      { id: 'javascript', extensions: ['.js', '.jsx', '.mjs', '.cjs'], aliases: ['JavaScript', 'js', 'javascript'] },
      { id: 'json', extensions: ['.json', '.jsonc'], aliases: ['JSON', 'json'] },
      { id: 'html', extensions: ['.html', '.htm'], aliases: ['HTML', 'html'] },
      { id: 'css', extensions: ['.css'], aliases: ['CSS', 'css'] },
    ];
    workerLangs.forEach(({ id, extensions, aliases }) => {
      if (!monaco.languages.getLanguages().find(l => l.id === id)) {
        monaco.languages.register({ id, extensions, aliases });
      }
    });

    // Configure TS/JS language services
    try {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true, esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowJs: true, typeRoots: ['node_modules/@types'],
      });
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true, esModuleInterop: true, allowJs: true,
      });
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    } catch (_) {}

    // Register Monarch-based languages via AMD
    const amdRequire = (typeof (window as any).require === 'function') ? (window as any).require : null;
    if (amdRequire) {
      const builtInLangModules = [
        { languageId: 'python', moduleId: 'vs/python-B-Y2SC3b', extensions: ['.py', '.rpy', '.pyw', '.cpy', '.gyp', '.gypi'], aliases: ['Python', 'py'] },
        { languageId: 'shell', moduleId: 'vs/shell-ClXCKCEW', extensions: ['.sh', '.bash', '.zsh'], aliases: ['Shell Script', 'sh', 'bash', 'zsh'] },
        { languageId: 'markdown', moduleId: 'vs/markdown-C_rD0bIw', extensions: ['.md', '.markdown'], aliases: ['Markdown', 'markdown'] },
      ];
      builtInLangModules.forEach(({ languageId, moduleId, extensions, aliases }) => {
        amdRequire([moduleId], (mod: any) => {
          try {
            if (!monaco.languages.getLanguages().some(l => l.id === languageId)) {
              monaco.languages.register({ id: languageId, extensions, aliases });
            }
            if (mod?.language) monaco.languages.setMonarchTokensProvider(languageId, mod.language);
            if (mod?.conf) { try { monaco.languages.setLanguageConfiguration(languageId, mod.conf); } catch (_) {} }
            monaco.editor.getModels().forEach((model) => {
              if (model.getLanguageId() === languageId) {
                monaco.editor.setModelLanguage(model, 'plaintext');
                monaco.editor.setModelLanguage(model, languageId);
              }
            });
          } catch (err) {
            console.error(`[MonacoEditor] Failed to register ${languageId} tokenizer:`, err);
          }
        }, (err: any) => {
          console.error(`[MonacoEditor] AMD load failed for ${moduleId}:`, err);
        });
      });
    }

    defineNoviThemes();

    const theme = appState.theme;
    try {
      this.editor = monaco.editor.create(this.editorContainer, {
        value: '', language: 'typescript',
        theme: theme?.name === 'light' ? 'novi-light' : 'novi-dark',
        fontSize: this._fontSize,
        fontFamily: "'DejaVu Sans Mono', monospace",
        wordWrap: this._wordWrap ? 'wordWrapColumn' : 'off', wordWrapColumn: this.effectiveWrapColumn(),
        wrappingStrategy: 'advanced', wrappingIndent: 'same',
        lineHeight: this._fontSize + 8,
        minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: true },
        lineNumbers: this._lineNumbers ? 'on' : 'off', readOnly: false,
        scrollbar: { vertical: 'visible', horizontal: 'visible', verticalScrollbarSize: 17, horizontalScrollbarSize: 17, alwaysConsumeMouseWheel: false, useShadows: false },
        glyphMargin: false, folding: true, lineDecorationsWidth: 5, lineNumbersMinChars: 3,
        quickSuggestions: { other: false, comments: false, strings: false },
        wordBasedSuggestions: 'off', suggestOnTriggerCharacters: false, contextmenu: false,
      });

      this.editorService = new EditorService(this.editor);

      // Shift+Insert — classic X11/Windows terminal-style paste. Reuses the
      // same Electron-clipboard path as Ctrl+V/the right-click menu (Monaco's
      // own clipboard actions can be unreliable under Electron's clipboard
      // permissions), and is scoped to this editor's own keybinding context
      // so it only fires while the editor actually has focus.
      this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, () => {
        void this.handlePaste();
      });

      // Context menu
      const handleCtxMenu = (e: MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        window.dispatchEvent(new CustomEvent('novi-close-context-menus', { detail: { source: 'MonacoEditor' } }));
        this.showContextMenu(e.clientX, e.clientY);
      };
      this.editorContainer.addEventListener('contextmenu', handleCtxMenu, true);
      this.addCleanup(() => this.editorContainer.removeEventListener('contextmenu', handleCtxMenu, true));

      // Change listener
      const disposable = this.editor.onDidChangeModelContent(() => {
        if (this.editor) {
          const dirty = this.editor.getValue() !== this.savedContent;
          this.isDirtyFlag = dirty;
          this.onDirtyChange?.(dirty);
        }
      });
      this.addCleanup(() => disposable?.dispose());

      // Status bar position
      const updatePos = () => {
        const api = (window as any).__statusBarAPI;
        if (!this.editor || !api?.addItem) return;
        const pos = this.editor.getPosition();
        const model = this.editor.getModel();
        const lineCount = model?.getLineCount() ?? 0;
        if (pos) {
          api.addItem({ id: 'editor-position', text: `Ln ${pos.lineNumber}, Col ${pos.column} (${lineCount} lines)` }, 'right');
        }
      };
      updatePos();
      const posDisp = this.editor.onDidChangeCursorPosition(updatePos);
      this.addCleanup(() => { posDisp?.dispose(); (window as any).__statusBarAPI?.removeItem?.('editor-position'); });

      // Find/Replace (Ctrl+F/Ctrl+H) are now dispatched centrally by App.ts's
      // keyboard shortcut handler via __monacoEditorAPI.openFind/openReplace,
      // so they respect the user's Keyboard Shortcuts customization and only
      // fire while a file tab is actually focused (this used to be a global
      // document-level listener that fired unconditionally).

      // Vim mode
      this.initVim();

      // Column Break / Show Ruler — self-contained, same pattern as Vim mode:
      // read the settings directly rather than routing through App.ts, since
      // nothing outside the editor needs this state.
      void this.loadEditorPrefs();
      const typeDisposable = this.editor.onDidType(() => this.maybeHardBreak());
      this.addCleanup(() => typeDisposable?.dispose());

      const columnBreakHandler = (e: CustomEvent<{ enabled: boolean; value: number; hard: boolean }>) => {
        this.setColumnBreak(e.detail?.enabled ?? false, e.detail?.value ?? 90, e.detail?.hard ?? false);
      };
      window.addEventListener('novi-columnbreak-changed', columnBreakHandler as EventListener);
      this.addCleanup(() => window.removeEventListener('novi-columnbreak-changed', columnBreakHandler as EventListener));

      const showRulerHandler = (e: CustomEvent<{ enabled: boolean }>) => {
        this.setShowRuler(e.detail?.enabled ?? false);
      };
      window.addEventListener('novi-showruler-changed', showRulerHandler as EventListener);
      this.addCleanup(() => window.removeEventListener('novi-showruler-changed', showRulerHandler as EventListener));

      // Close context menu on outside click
      const closeCtxMenus = (e: CustomEvent) => {
        if (e.detail?.source !== 'MonacoEditor') this.hideContextMenu();
      };
      window.addEventListener('novi-close-context-menus', closeCtxMenus as EventListener);
      this.addCleanup(() => window.removeEventListener('novi-close-context-menus', closeCtxMenus as EventListener));

      // React to vimode changes
      const vimodeHandler = async (e: CustomEvent<{ enabled: boolean }>) => {
        const enabled = e.detail?.enabled ?? false;
        if (!this.editor) return;
        if (this.vimAdapter) {
          try { this.vimAdapter.dispose(); } catch (_) {}
          this.vimAdapter = null;
        }
        if (enabled) await this.initVim();
        // Retokenize to restore syntax highlighting after vim toggle
        const model = this.editor.getModel();
        if (model) {
          const lang = model.getLanguageId();
          monaco.editor.setModelLanguage(model, lang);
        }
      };
      window.addEventListener('novi-vimode-changed', vimodeHandler as unknown as EventListener);
      this.addCleanup(() => window.removeEventListener('novi-vimode-changed', vimodeHandler as unknown as EventListener));

      // Theme changes
      const themeUnsub = bus.on('app:theme-changed', () => {
        if (this.editor) {
          const t = appState.theme;
          monaco.editor.setTheme(t?.name === 'light' ? 'novi-light' : 'novi-dark');
        }
      });
      this.addCleanup(themeUnsub);

      // Expose window API
      this.exposeAPI();

      // Load extensions
      markReady('monaco-ready');
      this.loadExtensions();
    } catch (error) {
      console.error('[MonacoEditor] Failed to initialize:', error);
    }
  }

  private async initVim(): Promise<void> {
    try {
      const on = await window.api.getSetting<boolean>('vimode', false);
      if (on && this.editor && this.vimStatusBar) {
        const mod = await import('monaco-vim');
        this.vimAdapter = mod.initVimMode(this.editor, this.vimStatusBar);
        const Vim = (mod as any).VimMode?.Vim;
        if (Vim && typeof Vim.defineEx === 'function') {
          Vim.defineEx('write', 'w', (_cm: unknown, params: { callback?: () => void }) => {
            const win = window as any;
            const api = win.__monacoEditorAPI;
            if (!api?.getFilePath || !win.api?.saveFile) return;
            const fp = api.getFilePath();
            if (!fp) return;
            win.api.saveFile(fp, api.getValue()).then(() => {
              api.markAsSaved();
              const tb = win.__tabBarAPI;
              if (tb?.getActiveTab) { const a = tb.getActiveTab(); if (a?.type === 'file') tb.updateTabDirty(a.id, false); }
              params?.callback?.();
            }).catch(() => params?.callback?.());
          });
        }
        // Retokenize after vim init to preserve syntax highlighting
        setTimeout(() => {
          if (!this.editor) return;
          const m = this.editor.getModel();
          if (m) {
            const lang = m.getLanguageId();
            monaco.editor.setModelLanguage(m, lang);
          }
        }, 0);
      }
    } catch (_) {}
  }

  private loadExtensions(): void {
    if (window.api?.loadAllExtensions) {
      window.api.loadAllExtensions().then((result: any) => {
        if (result.success && result.extensions?.length > 0) {
          for (const ext of result.extensions) {
            try {
              monaco.languages.register({ id: ext.languageId, extensions: ext.fileExtensions, aliases: ext.aliases || [] });
              if (ext.tmGrammar) {
                const monarchGrammar = convertTmToMonarch(ext.tmGrammar);
                monaco.languages.setMonarchTokensProvider(ext.languageId, monarchGrammar);
              }
              console.log(`[MonacoEditor] Registered extension language: ${ext.languageId}`);
            } catch (_) {}
          }
        }
      }).catch(() => {});
    }
  }

  private exposeAPI(): void {
    (window as any).__monacoEditorAPI = {
      loadFile: (fp: string, content: string) => this.loadFile(fp, content),
      switchToFile: (fp: string) => this.switchToFile(fp),
      getValue: () => this.getValue(),
      setValue: (c: string) => this.setValue(c),
      isDirty: () => this.isDirtyFlag,
      markAsSaved: () => this.markAsSaved(),
      getFilePath: () => this.currentFilePath,
      updateOptions: (opts: any) => this.editor?.updateOptions(opts),
      formatDocument: () => this.editorService?.formatDocument() ?? Promise.resolve(false),
      goToDefinition: () => this.editorService?.goToDefinition() ?? Promise.resolve(false),
      peekDefinition: () => this.editorService?.peekDefinition() ?? Promise.resolve(false),
      findReferences: () => this.editorService?.findReferences() ?? Promise.resolve(false),
      renameSymbol: () => this.editorService?.renameSymbol() ?? Promise.resolve(false),
      runLinting: () => this.editorService?.runMockLinting(),
      clearDiagnostics: () => this.editorService?.clearDiagnostics(),
      focus: () => this.editor?.focus(),
      openCommandPalette: () => { this.editor?.focus(); this.editor?.trigger('', 'editor.action.quickCommand', null); },
      undo: () => { this.editor?.focus(); this.editor?.trigger('menu', 'undo', null); },
      redo: () => { this.editor?.focus(); this.editor?.trigger('menu', 'redo', null); },
      cut: () => this.handleCut(),
      copy: () => this.handleCopy(),
      paste: () => this.handlePaste(),
      selectAll: () => { this.editor?.focus(); this.editor?.trigger('menu', 'editor.action.selectAll', null); },
      openFind: () => { this.editor?.focus(); this.editor?.getAction('actions.find')?.run(); },
      openReplace: () => { this.editor?.focus(); this.editor?.getAction('editor.action.startFindReplaceAction')?.run(); },
      canUndo: () => !!this.editor?.getModel()?.canUndo(),
      canRedo: () => !!this.editor?.getModel()?.canRedo(),
    };
  }

  loadFile(filePath: string, content: string): void {
    if (!this.editorService) return;
    const language = detectLanguage(filePath);
    this.currentFilePath = filePath;
    appState.activeFilePath = filePath;
    this.savedContent = content;
    this.savedContentMap.set(filePath, content);
    this.isDirtyFlag = false;
    this.onDirtyChange?.(false);
    this.editorService.loadFile(filePath, content, language);
  }

  /**
   * Switch to an already-open file without overwriting its model content.
   * Used on tab switch to preserve unsaved edits.
   */
  switchToFile(filePath: string): boolean {
    if (!this.editorService) return false;
    // Save current file's savedContent before switching
    if (this.currentFilePath) {
      this.savedContentMap.set(this.currentFilePath, this.savedContent);
    }
    if (!this.editorService.switchToModel(filePath)) return false;
    this.currentFilePath = filePath;
    appState.activeFilePath = filePath;
    // Restore saved content baseline for dirty tracking
    this.savedContent = this.savedContentMap.get(filePath) ?? '';
    const currentContent = this.editorService.getValue();
    this.isDirtyFlag = currentContent !== this.savedContent;
    this.onDirtyChange?.(this.isDirtyFlag);
    return true;
  }

  getValue(): string { return this.editor?.getValue() ?? ''; }
  setValue(content: string): void { this.editor?.setValue(content); }

  markAsSaved(): void {
    this.savedContent = this.editor?.getValue() ?? '';
    if (this.currentFilePath) {
      this.savedContentMap.set(this.currentFilePath, this.savedContent);
    }
    this.isDirtyFlag = false;
    this.onDirtyChange?.(false);
  }

  focus(): void { this.editor?.focus(); }

  private showContextMenu(x: number, y: number): void {
    this.hideContextMenu();
    const menu = el('div');
    setStyles(menu, {
      position: 'fixed', top: `${y}px`, left: `${x}px`,
      backgroundColor: '#2d2d30', border: '1px solid #454545', borderRadius: '3px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)', zIndex: '10000', minWidth: '150px', padding: '4px 0',
    });
    menu.addEventListener('click', (e) => e.stopPropagation());

    const makeItem = (text: string, handler: () => void) => {
      const item = el('div', {}, text);
      setStyles(item, { padding: '6px 12px', fontSize: '13px', color: '#cccccc', cursor: 'pointer', transition: 'background-color 0.1s', userSelect: 'none' });
      item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#37373d'; });
      item.addEventListener('mouseleave', () => { item.style.backgroundColor = 'transparent'; });
      item.addEventListener('click', handler);
      return item;
    };

    menu.appendChild(makeItem('\u2702\uFE0F Cut', () => this.handleCut()));
    menu.appendChild(makeItem('\u{1F4CB} Copy', () => this.handleCopy()));
    menu.appendChild(makeItem('\u{1F4C4} Paste', () => this.handlePaste()));
    const sep = el('div');
    setStyles(sep, { height: '1px', backgroundColor: '#454545', margin: '4px 0' });
    menu.appendChild(sep);
    menu.appendChild(makeItem('\u{1F4BB} New Terminal', () => {
      this.hideContextMenu();
      (window as any).__actionAPI?.onNewTerminal?.();
    }));

    document.body.appendChild(menu);
    this.contextMenuEl = menu;

    const close = () => { this.hideContextMenu(); document.removeEventListener('click', close); };
    document.addEventListener('click', close);
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') { this.hideContextMenu(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  private hideContextMenu(): void {
    if (this.contextMenuEl) { this.contextMenuEl.remove(); this.contextMenuEl = null; }
  }

  private async handleCut(): Promise<void> {
    if (this.editor) {
      const sel = this.editor.getSelection();
      if (sel && !sel.isEmpty()) {
        const text = this.editor.getModel()?.getValueInRange(sel);
        if (text && window.api?.clipboardWriteText) {
          window.api.clipboardWriteText(text);
          this.editor.executeEdits('context-menu', [{ range: sel, text: '' }]);
        }
      }
    }
    this.hideContextMenu();
  }

  private async handleCopy(): Promise<void> {
    if (this.editor) {
      const sel = this.editor.getSelection();
      if (sel && !sel.isEmpty()) {
        const text = this.editor.getModel()?.getValueInRange(sel);
        if (text && (window as any).api?.clipboardWriteText) {
          await (window as any).api.clipboardWriteText(text);
        }
      }
    }
    this.hideContextMenu();
  }

  private async handlePaste(): Promise<void> {
    if (this.editor) {
      const api = (window as any).api;
      if (api?.clipboardReadText) {
        const text = await api.clipboardReadText();
        if (text) {
          const sel = this.editor.getSelection();
          if (sel) this.editor.executeEdits('context-menu', [{ range: sel, text }]);
        }
      }
    }
    this.hideContextMenu();
  }

  protected onDestroy(): void {
    this.hideContextMenu();
    if (this.vimAdapter) { try { this.vimAdapter.dispose(); } catch (_) {} }
    this.editorService?.dispose();
    this.editor?.dispose();
    delete (window as any).__monacoEditorAPI;
  }
}

function defineNoviThemes(): void {
  monaco.editor.defineTheme('novi-dark', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'function', foreground: 'dcdcaa' },
      { token: 'variable', foreground: '9cdcfe' },
      { token: 'type', foreground: '4ec9b0' },
    ],
    colors: {
      'editor.background': '#1e1e1e', 'editor.foreground': '#cccccc',
      'editor.lineHighlightBackground': '#2d2d30', 'editor.selectionBackground': '#264f78',
    },
  });
  monaco.editor.defineTheme('novi-light', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
      { token: 'string', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'function', foreground: '795e26' },
      { token: 'variable', foreground: '001080' },
    ],
    colors: {
      'editor.background': '#ffffff', 'editor.foreground': '#1e1e1e',
      'editor.lineHighlightBackground': '#f5f5f5', 'editor.selectionBackground': '#add6ff',
    },
  });
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', mts: 'typescript', cts: 'typescript',
    tsx: 'typescript', jsx: 'javascript', json: 'json',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    md: 'markdown', py: 'python', pyw: 'python', rs: 'rust', go: 'go', java: 'java',
    c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp',
    cs: 'csharp', php: 'php', rb: 'ruby', sh: 'shell', bash: 'shell', zsh: 'shell',
    xml: 'xml', yaml: 'yaml', yml: 'yaml', sql: 'sql',
  };
  return map[ext] ?? 'plaintext';
}
