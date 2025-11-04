/**
 * MonacoEditor - Monaco Editor React wrapper
 */

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useAppContext } from '../contexts/AppContext.js';

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
}

export interface MonacoEditorProps {
  onDirtyChange?: (isDirty: boolean) => void;
  fontSize?: number;
  wordWrap?: 'on' | 'off';
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>((props, ref) => {
  const { onDirtyChange, fontSize = 14, wordWrap = 'off' } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const { theme, setActiveFilePath } = useAppContext();
  
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isDirtyFlag, setIsDirtyFlag] = useState(false);
  const [savedContent, setSavedContent] = useState('');

  // Initialize Monaco on mount
  useEffect(() => {
    if (!containerRef.current || typeof monaco === 'undefined') {
      console.warn('[MonacoEditor] Container or Monaco not available');
      return undefined;
    }

    // Define Nova themes
    defineNovaThemes();

    // Create editor instance
    try {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: '',
        language: 'typescript',
        theme: theme?.name === 'light' ? 'nova-light' : 'nova-dark',
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
      });

      console.log('[MonacoEditor] Initialized successfully');

      // Set up change listener
      const disposable = editorRef.current.onDidChangeModelContent(() => {
        if (editorRef.current) {
          const currentContent = editorRef.current.getValue();
          const dirty = currentContent !== savedContent;
          
          if (dirty !== isDirtyFlag) {
            setIsDirtyFlag(dirty);
            onDirtyChange?.(dirty);
          }
        }
      });

      return () => {
        disposable?.dispose();
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
      const monacoTheme = theme.name === 'light' ? 'nova-light' : 'nova-dark';
      monaco.editor.setTheme(monacoTheme);
    }
  }, [theme]);

  // Update options when they change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize, wordWrap });
    }
  }, [fontSize, wordWrap]);

  // Public API methods
  const loadFile = useCallback((filePath: string, content: string) => {
    if (!editorRef.current) return;

    setCurrentFilePath(filePath);
    setActiveFilePath(filePath);
    setSavedContent(content);
    editorRef.current.setValue(content);
    setIsDirtyFlag(false);
    onDirtyChange?.(false);

    // Detect and set language
    const language = detectLanguage(filePath);
    const model = editorRef.current.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }

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
  }));

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
    };
    return () => {
      delete (window as any).__monacoEditorAPI;
    };
  }, [loadFile, getValue, setValue, isDirtyMethod, markAsSaved, getFilePath, updateOptions]);

  return <div ref={containerRef} style={styles.container} />;
});

MonacoEditor.displayName = 'MonacoEditor';

// Helper functions
function defineNovaThemes(): void {
  monaco.editor.defineTheme('nova-dark', {
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

  monaco.editor.defineTheme('nova-light', {
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
  };
  return languageMap[ext] ?? 'plaintext';
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
};

