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

export interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'staged';
  staged: boolean;
}

export interface GitOperationResult {
  success: boolean;
  error?: string;
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
      gitGetStatus: (cwd: string) => Promise<GitStatus>;
      gitStageFile: (cwd: string, filePath: string) => Promise<boolean>;
      gitUnstageFile: (cwd: string, filePath: string) => Promise<boolean>;
      gitCommit: (cwd: string, message: string) => Promise<GitOperationResult>;
      gitPush: (cwd: string) => Promise<GitOperationResult>;
      gitPull: (cwd: string) => Promise<GitOperationResult>;
      gitGetDiff: (cwd: string, filePath?: string) => Promise<string>;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      windowIsMaximized: () => Promise<boolean>;
      quit: () => void;
      // Terminal operations
      terminalCreate: (cwd?: string, cols?: number, rows?: number, customId?: string) => Promise<{ id: string }>;
      terminalWrite: (terminalId: string, data: string) => Promise<{ success: boolean }>;
      terminalResize: (terminalId: string, cols: number, rows: number) => Promise<{ success: boolean }>;
      terminalKill: (terminalId: string) => Promise<{ success: boolean }>;
      terminalOnData: (callback: (terminalId: string, data: string) => void) => void;
      terminalRemoveDataListener: () => void;
      terminalOnExit: (callback: (terminalId: string, exitCode: number) => void) => void;
      terminalRemoveExitListener: () => void;
      // Clipboard operations
      clipboardReadText: () => string;
      clipboardWriteText: (text: string) => void;
    };
  }
}

export {};
