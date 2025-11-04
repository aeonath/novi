// Global ambient types for renderer access to preload API

// Monaco Editor global (loaded via AMD)
/// <reference types="monaco-editor" />

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  isDirectory: boolean;
  size: number;
}

export interface FileData {
  path: string;
  content: string;
  size: number;
  modified: Date;
}

declare global {
  // Monaco Editor AMD global
  const monaco: typeof import('monaco-editor');
  
  interface Window {
    api: {
      getVersion: () => Promise<string>;
      ping: () => Promise<string>;
      getSetting: <T = unknown>(key: string, defaults?: T) => Promise<T | undefined>;
      setSetting: (key: string, value: unknown) => Promise<unknown>;
      reportError: (message: string, stack?: string) => void;
      copyDiagnostics: () => Promise<string>;
      getCrashesDirectory: () => Promise<string>;
      readDirectory: (path: string) => Promise<DirectoryEntry[]>;
      selectDirectory: () => Promise<string | null>;
      openFile: () => Promise<string | null>;
      readFile: (filePath: string) => Promise<FileData>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      windowIsMaximized: () => Promise<boolean>;
    };
  }
}

export {};
