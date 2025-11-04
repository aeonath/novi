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

export interface RecoveryFile {
  id: string;
  originalPath: string;
  timestamp: number;
  content: string;
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
      saveFile: (filePath: string, content: string) => Promise<{ path: string; size: number; modified: Date }>;
      saveFileAs: (content: string) => Promise<{ path: string; size: number; modified: Date } | null>;
      saveRecoveryFiles: (tabs: Array<{ filePath: string; content: string }>) => Promise<{ success: boolean }>;
      getRecoveryFiles: () => Promise<RecoveryFile[]>;
      deleteRecoveryFile: (id: string) => Promise<{ success: boolean }>;
      clearRecoveryFiles: () => Promise<{ success: boolean }>;
      createFile: (filePath: string) => Promise<{ success: boolean; path: string }>;
      createDirectory: (dirPath: string) => Promise<{ success: boolean; path: string }>;
      renameFile: (oldPath: string, newPath: string) => Promise<{ success: boolean; oldPath: string; newPath: string }>;
      deleteFile: (filePath: string, isDirectory: boolean) => Promise<{ success: boolean; path: string }>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      windowIsMaximized: () => Promise<boolean>;
    };
  }
}

export {};
