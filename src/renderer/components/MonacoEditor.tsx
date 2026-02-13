/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * MonacoEditor - Monaco Editor React wrapper
 */

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useAppContext } from '../contexts/AppContext.js';
import { EditorService } from '../services/editor-service.js';
import { markReady } from '../utils/ready-events.js';

declare const monaco: typeof import('monaco-editor');

export interface MonacoEditorHandle {
  loadFile: (filePath: string, content: string) => void;
  getValue: () => string;
  setValue: (content: string) => void;
  isDirty: () => boolean;
  markAsSaved: () => void;
  getFilePath: () => string | null;
  updateOptions: (options: any) => void;
  dispose: () => void;
  // New EditorService methods
  formatDocument: () => Promise<boolean>;
  goToDefinition: () => Promise<boolean>;
  peekDefinition: () => Promise<boolean>;
  findReferences: () => Promise<boolean>;
  renameSymbol: () => Promise<boolean>;
  runLinting: () => void;
  clearDiagnostics: () => void;
}

export interface MonacoEditorProps {
  onDirtyChange?: (isDirty: boolean) => void;
  fontSize?: number;
  wordWrap?: 'on' | 'off';
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>((props, ref) => {
  const { onDirtyChange, fontSize = 14, wordWrap = 'on' } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const vimStatusBarRef = useRef<HTMLDivElement>(null);
  const vimAdapterRef = useRef<{ dispose: () => void } | null>(null);
  const editorRef = useRef<any>(null);
  const editorServiceRef = useRef<EditorService | null>(null);
  const { theme, setActiveFilePath } = useAppContext();
  
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isDirtyFlag, setIsDirtyFlag] = useState(false);
  const [savedContent, setSavedContent] = useState('');
  const savedContentRef = useRef(''); // Ref for accessing current saved content in closures
  const onDirtyChangeRef = useRef(onDirtyChange); // Ref for accessing current callback in closures
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Update the onDirtyChange ref whenever the prop changes
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  // Initialize Monaco on mount
  useEffect(() => {
    if (!containerRef.current || typeof monaco === 'undefined') {
      console.warn('[MonacoEditor] Container or Monaco not available');
      return undefined;
    }

    // Define Novi themes
    defineNoviThemes();

    // Create editor instance
    try {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: '',
        language: 'typescript',
        theme: theme?.name === 'light' ? 'novi-light' : 'novi-dark',
        fontSize,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
        wordWrap,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        guides: {
          indentation: true,
          bracketPairs: true,
        },
        lineNumbers: 'on',
        readOnly: false,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 17,
          horizontalScrollbarSize: 17,
          alwaysConsumeMouseWheel: false,
          useShadows: false,
        },
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 5,
        lineNumbersMinChars: 3,
        // Disable word-based completions
        quickSuggestions: {
          other: false,
          comments: false,
          strings: false,
        },
        wordBasedSuggestions: 'off',
        suggestOnTriggerCharacters: false,
        // Disable Monaco's built-in context menu - we'll use Novi's custom menu
        contextmenu: false,
      });

      console.log('[MonacoEditor] Initialized successfully');

      // Initialize EditorService
      editorServiceRef.current = new EditorService(editorRef.current);
      console.log('[MonacoEditor] EditorService initialized');

      // Add custom context menu handler to the container div
      // This captures the event before it reaches Monaco's internal handlers
      const handleContextMenu = (e: MouseEvent) => {
        console.log('[MonacoEditor] Context menu triggered at:', e.clientX, e.clientY);
        e.preventDefault();
        e.stopPropagation();
        // Notify other components to close their context menus
        window.dispatchEvent(new CustomEvent('novi-close-context-menus', { detail: { source: 'MonacoEditor' } }));
        setContextMenu({ x: e.clientX, y: e.clientY });
      };
      
      if (containerRef.current) {
        // Add in capture phase to intercept before Monaco can handle it
        containerRef.current.addEventListener('contextmenu', handleContextMenu, true);
        console.log('[MonacoEditor] Context menu listener attached to container');
      }

      // Set up change listener
      const disposable = editorRef.current.onDidChangeModelContent(() => {
        if (editorRef.current) {
          const currentContent = editorRef.current.getValue();
          const dirty = currentContent !== savedContentRef.current; // Use ref to get current value
          
          if (dirty !== isDirtyFlag) {
            setIsDirtyFlag(dirty);
            onDirtyChangeRef.current?.(dirty); // Use ref to get current callback
          }
        }
      });

      // Set up keyboard shortcuts for Find and Replace
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+F for Find
        if (e.ctrlKey && e.key === 'f') {
          e.preventDefault();
          editorRef.current?.getAction('actions.find')?.run();
        }
        // Ctrl+H for Replace
        if (e.ctrlKey && e.key === 'h') {
          e.preventDefault();
          editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Initialize vim mode from setting (default on)
      (async () => {
        try {
          const on = await window.api.getSetting<boolean>('vimode', true);
          if (on && editorRef.current && vimStatusBarRef.current) {
            const mod = await import('monaco-vim');
            vimAdapterRef.current = mod.initVimMode(editorRef.current, vimStatusBarRef.current);
            console.log('[MonacoEditor] Vim mode enabled');
          }
        } catch (e) {
          console.warn('[MonacoEditor] Vim mode init failed (optional):', e);
        }
      })();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (containerRef.current) {
          containerRef.current.removeEventListener('contextmenu', handleContextMenu, true);
        }
        if (vimAdapterRef.current) {
          try {
            vimAdapterRef.current.dispose();
          } catch (_) {}
          vimAdapterRef.current = null;
        }
        disposable?.dispose();
        editorServiceRef.current?.dispose();
        editorRef.current?.dispose();
      };
    } catch (error) {
      console.error('[MonacoEditor] Failed to initialize:', error);
      return undefined;
    }
  }, []);

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current && theme) {
      const monacoTheme = theme.name === 'light' ? 'novi-light' : 'novi-dark';
      monaco.editor.setTheme(monacoTheme);
    }
  }, [theme]);

  // Update options when they change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize, wordWrap });
    }
  }, [fontSize, wordWrap]);

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (contextMenu) {
      const handleClickOutside = () => setContextMenu(null);
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setContextMenu(null);
        }
      };

      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenu]);

  // Close context menu when another component opens its menu
  useEffect(() => {
    const handleCloseContextMenus = (e: CustomEvent) => {
      if (e.detail.source !== 'MonacoEditor') {
        setContextMenu(null);
      }
    };
    window.addEventListener('novi-close-context-menus', handleCloseContextMenus as EventListener);
    return () => window.removeEventListener('novi-close-context-menus', handleCloseContextMenus as EventListener);
  }, []);

  // React to vimode setting changes from Novi Shell (set vimode on/off)
  useEffect(() => {
    const handleVimodeChanged = async (e: CustomEvent<{ enabled: boolean }>) => {
      const enabled = e.detail?.enabled ?? false;
      if (!editorRef.current) return;
      if (vimAdapterRef.current) {
        try {
          vimAdapterRef.current.dispose();
        } catch (_) {}
        vimAdapterRef.current = null;
      }
      if (enabled && vimStatusBarRef.current) {
        try {
          const mod = await import('monaco-vim');
          vimAdapterRef.current = mod.initVimMode(editorRef.current, vimStatusBarRef.current);
          console.log('[MonacoEditor] Vim mode enabled (from Shell)');
        } catch (err) {
          console.warn('[MonacoEditor] Vim mode init failed:', err);
        }
      }
    };
    window.addEventListener('novi-vimode-changed', handleVimodeChanged as EventListener);
    return () => window.removeEventListener('novi-vimode-changed', handleVimodeChanged as EventListener);
  }, []);

  // Context menu action handlers
  const handleCut = useCallback(async () => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editorRef.current.getModel()?.getValueInRange(selection);
        if (text && window.api?.clipboardWriteText) {
          window.api.clipboardWriteText(text);
          editorRef.current.executeEdits('context-menu', [{
            range: selection,
            text: ''
          }]);
        }
      }
    }
    setContextMenu(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editorRef.current.getModel()?.getValueInRange(selection);
        if (text) {
          const api = (window as any).api;
          if (api && api.clipboardWriteText) {
            try {
              await api.clipboardWriteText(text);
              console.log('[MonacoEditor] Copied to clipboard:', text.substring(0, 50) + '...');
            } catch (error) {
              console.error('[MonacoEditor] Failed to copy:', error);
            }
          } else {
            console.error('[MonacoEditor] Clipboard API not available');
          }
        }
      }
    }
    setContextMenu(null);
  }, []);

  const handlePaste = useCallback(async () => {
    if (editorRef.current) {
      const api = (window as any).api;
      if (api && api.clipboardReadText) {
        try {
          const text = await api.clipboardReadText();
          console.log('[MonacoEditor] Read from clipboard:', text ? text.length : 0, 'chars');
          if (text) {
            const selection = editorRef.current.getSelection();
            if (selection) {
              editorRef.current.executeEdits('context-menu', [{
                range: selection,
                text: text
              }]);
              console.log('[MonacoEditor] Pasted from clipboard:', text.substring(0, 50) + '...');
            }
          } else {
            console.warn('[MonacoEditor] No text in clipboard');
          }
        } catch (error) {
          console.error('[MonacoEditor] Failed to paste:', error);
        }
      } else {
        console.error('[MonacoEditor] Clipboard API not available');
      }
    }
    setContextMenu(null);
  }, []);

  const handleQuit = useCallback(() => {
    const api = (window as any).api;
    if (api && api.quit) {
      api.quit();
    }
    setContextMenu(null);
  }, []);

  // Public API methods
  const loadFile = useCallback((filePath: string, content: string) => {
    if (!editorServiceRef.current) return;

    const language = detectLanguage(filePath);
    
    setCurrentFilePath(filePath);
    setActiveFilePath(filePath);
    setSavedContent(content);
    savedContentRef.current = content; // Update ref so change listener has current value
    setIsDirtyFlag(false);
    onDirtyChange?.(false);

    // Use EditorService to load file
    editorServiceRef.current.loadFile(filePath, content, language);

    console.log(`[MonacoEditor] Loaded file: ${filePath} (${language})`);
  }, [onDirtyChange, setActiveFilePath]);

  const getValue = useCallback(() => {
    return editorRef.current?.getValue() ?? '';
  }, []);

  const setValue = useCallback((content: string) => {
    editorRef.current?.setValue(content);
  }, []);

  const markAsSaved = useCallback(() => {
    const content = editorRef.current?.getValue() ?? '';
    setSavedContent(content);
    savedContentRef.current = content; // Update ref so change listener has current value
    setIsDirtyFlag(false);
    onDirtyChange?.(false);
  }, [onDirtyChange]);

  const getFilePath = useCallback(() => {
    return currentFilePath;
  }, [currentFilePath]);

  const updateOptions = useCallback((options: any) => {
    editorRef.current?.updateOptions(options);
  }, []);

  const dispose = useCallback(() => {
    editorRef.current?.dispose();
    editorRef.current = null;
  }, []);

  const isDirtyMethod = useCallback(() => {
    return isDirtyFlag;
  }, [isDirtyFlag]);

  // EditorService command methods
  const formatDocument = useCallback(async () => {
    if (!editorServiceRef.current) return false;
    return await editorServiceRef.current.formatDocument();
  }, []);

  const goToDefinition = useCallback(async () => {
    if (!editorServiceRef.current) return false;
    return await editorServiceRef.current.goToDefinition();
  }, []);

  const peekDefinition = useCallback(async () => {
    if (!editorServiceRef.current) return false;
    return await editorServiceRef.current.peekDefinition();
  }, []);

  const findReferences = useCallback(async () => {
    if (!editorServiceRef.current) return false;
    return await editorServiceRef.current.findReferences();
  }, []);

  const renameSymbol = useCallback(async () => {
    if (!editorServiceRef.current) return false;
    return await editorServiceRef.current.renameSymbol();
  }, []);

  const runLinting = useCallback(() => {
    if (!editorServiceRef.current) return;
    editorServiceRef.current.runMockLinting();
  }, []);

  const clearDiagnostics = useCallback(() => {
    if (!editorServiceRef.current) return;
    editorServiceRef.current.clearDiagnostics();
  }, []);

  const focus = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    loadFile,
    getValue,
    setValue,
    isDirty: isDirtyMethod,
    markAsSaved,
    getFilePath,
    updateOptions,
    dispose,
    // EditorService methods
    formatDocument,
    goToDefinition,
    peekDefinition,
    findReferences,
    renameSymbol,
    runLinting,
    clearDiagnostics,
    focus,
  }));

  // Load syntax extensions once on mount
  useEffect(() => {
    // Signal that Monaco is ready for use
    markReady('monaco-ready');
    
    // Load all syntax extensions (from main process via IPC) - only once on mount
    if (window.api?.loadAllExtensions) {
      window.api.loadAllExtensions().then((result: any) => {
        if (result.success && result.languages && result.languages.length > 0) {
          console.log(`[MonacoEditor] Loading ${result.languages.length} syntax extension(s)...`);
          
          // Register each language with Monaco
          result.languages.forEach((lang: any) => {
            try {
              monaco.languages.register({
                id: lang.languageId,
                extensions: lang.extensions,
                aliases: lang.aliases || [],
              });
              
              // Set up the tokenizer if grammar is provided
              if (lang.grammar) {
                monaco.languages.setMonarchTokensProvider(lang.languageId, lang.grammar);
              }
              
              console.log(`[MonacoEditor] Registered language '${lang.languageId}' for extensions: ${lang.extensions.join(', ')}`);
            } catch (error) {
              console.error(`[MonacoEditor] Failed to register language '${lang.languageId}':`, error);
            }
          });
          
          console.log(`[MonacoEditor] Loaded ${result.loaded} syntax extension(s), ${result.discarded} discarded.`);
        } else if (result.success && result.loaded === 0) {
          console.log('[MonacoEditor] No syntax extensions found');
        } else {
          console.warn('[MonacoEditor] Failed to load syntax extensions:', result.error);
        }
      }).catch((error: any) => {
        console.error('[MonacoEditor] Error loading syntax extensions:', error);
      });
    }
  }, []); // Empty dependency array - only run once on mount

  // Expose to window for backward compatibility during migration
  useEffect(() => {
    (window as any).__monacoEditorAPI = {
      loadFile,
      getValue,
      setValue,
      isDirty: isDirtyMethod,
      markAsSaved,
      getFilePath,
      updateOptions,
      formatDocument,
      goToDefinition,
      peekDefinition,
      findReferences,
      renameSymbol,
      runLinting,
      clearDiagnostics,
      focus,
    };
    
    return () => {
      delete (window as any).__monacoEditorAPI;
    };
  }, [loadFile, getValue, setValue, isDirtyMethod, markAsSaved, getFilePath, updateOptions, formatDocument, goToDefinition, peekDefinition, findReferences, renameSymbol, runLinting, clearDiagnostics, focus]);

  console.log('[MonacoEditor] Rendering, contextMenu:', contextMenu);
  
  return (
    <>
      <div style={styles.editorWrapper}>
        <div ref={containerRef} style={styles.container} />
        <div ref={vimStatusBarRef} style={styles.vimStatusBar} aria-hidden="true" />
      </div>
      
      {/* Novi's custom context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#2d2d30',
            border: '1px solid #454545',
            borderRadius: '3px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            minWidth: '150px',
            padding: '4px 0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={styles.contextMenuItem}
            onClick={handleCut}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#37373d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ✂️ Cut
          </div>
          <div
            style={styles.contextMenuItem}
            onClick={handleCopy}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#37373d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            📋 Copy
          </div>
          <div
            style={styles.contextMenuItem}
            onClick={handlePaste}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#37373d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            📄 Paste
          </div>
          <div style={styles.contextMenuSeparator} />
          <div
            style={styles.contextMenuItem}
            onClick={() => {
              setContextMenu(null);
              // Call the global action handler
              const actionAPI = (window as any).__actionAPI;
              if (actionAPI && actionAPI.onNewTerminal) {
                actionAPI.onNewTerminal();
              }
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#37373d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            💻 New Terminal
          </div>
          <div style={styles.contextMenuSeparator} />
          <div
            style={styles.contextMenuItem}
            onClick={handleQuit}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#37373d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            🚪 Quit
          </div>
        </div>
      )}
    </>
  );
});

MonacoEditor.displayName = 'MonacoEditor';

// Helper functions
function defineNoviThemes(): void {
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
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#ffffff',
      'editor.lineHighlightBackground': '#2d2d30',
      'editor.selectionBackground': '#264f78',
    },
  });

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
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1e1e1e',
      'editor.lineHighlightBackground': '#f5f5f5',
      'editor.selectionBackground': '#add6ff',
    },
  });
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const languageMap: Record<string, string> = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', mts: 'typescript', cts: 'typescript',
    tsx: 'typescript', jsx: 'javascript',
    json: 'json',
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    md: 'markdown',
    py: 'python', pyw: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    sh: 'shell', bash: 'shell', zsh: 'shell',
    xml: 'xml',
    yaml: 'yaml', yml: 'yaml',
    sql: 'sql',
    ly: 'lyric', // Lyric language extension
  };
  return languageMap[ext] ?? 'plaintext';
}

const styles = {
  editorWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  vimStatusBar: {
    flexShrink: 0,
    height: '22px',
    minHeight: '22px',
    backgroundColor: '#252526',
    borderTop: '1px solid #3e3e42',
    fontSize: '12px',
    color: '#cccccc',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
  },
  contextMenuItem: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#cccccc',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
    userSelect: 'none' as const,
  } as React.CSSProperties & {
    ':hover'?: React.CSSProperties;
  },
  contextMenuSeparator: {
    height: '1px',
    backgroundColor: '#454545',
    margin: '4px 0',
  },
};


