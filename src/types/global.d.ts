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

export interface WorkspaceState {
  workspaceRoot: string | null;
  openFiles: Array<{
    filePath: string;
    content?: string;
    isDirty?: boolean;
  }>;
  openTerminals: Array<{
    id: string;
    name: string;
  }>;
  openNoviPrompts: Array<{
    id: string;
    name: string;
  }>;
  activeTabId: string | null;
  activeTabType: 'file' | 'terminal' | 'novi-prompt' | null;
  layout: {
    showGitPanel: boolean;
    gitPanelCollapsed?: boolean;
  };
  gitBranch?: string;
  lastSaved: string;
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

export interface GitCredentialRequest {
  type: 'password' | 'username' | 'passphrase';
  prompt: string;
  protocol?: string;
  host?: string;
  username?: string;
}

export interface GitCredentialResponse {
  username?: string;
  password?: string;
  cancelled: boolean;
}

declare global {
  // Monaco Editor AMD global
  const monaco: typeof import('monaco-editor');
  
  interface Window {
    api: {
      getVersion: () => Promise<string>;
      getCommandLineArgs: () => Promise<string[]>;
      ping: () => Promise<string>;
      getSetting: <T = unknown>(key: string, defaults?: T) => Promise<T | undefined>;
      setSetting: (key: string, value: unknown) => Promise<unknown>;
      reportError: (message: string, stack?: string) => void;
      copyDiagnostics: () => Promise<string>;
      getCrashesDirectory: () => Promise<string>;
      // updateMenuForTab removed - using custom CSS menu bar in renderer
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
      gitStartWatching: (repoPath: string) => Promise<void>;
      gitStopWatching: () => Promise<void>;
      gitOnChange: (callback: (event: { type: string; path: string }) => void) => void;
      gitRemoveChangeListener: () => void;
      gitManualRefresh: (cwd: string) => Promise<GitStatus>;
      gitFindRoot: (cwd: string) => Promise<string | null>;
      gitOnCredentialRequest: (callback: (request: GitCredentialRequest) => void) => void;
      gitRemoveCredentialListener: () => void;
      gitProvideCredentials: (response: GitCredentialResponse) => Promise<{ success: boolean }>;
      fileTreeStartWatching: (rootPath: string, expandedPaths?: string[]) => Promise<void>;
      fileTreeStopWatching: () => Promise<void>;
      fileTreeOnChange: (callback: (event: { type: string; path: string }) => void) => void;
      fileTreeRemoveChangeListener: () => void;
      workspaceSave: (state: WorkspaceState) => Promise<{ success: boolean }>;
      workspaceLoad: () => Promise<WorkspaceState | null>;
      workspaceClear: () => Promise<{ success: boolean }>;
      workspaceGetPath: () => Promise<{ path: string }>;
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
      terminalOnPwd: (callback: (terminalId: string, pwd: string) => void) => void;
      terminalRemovePwdListener: () => void;
      terminalOnInitialCwd: (callback: (terminalId: string, cwd: string) => void) => void;
      terminalRemoveInitialCwdListener: () => void;
      terminalOnExit: (callback: (terminalId: string, exitCode: number) => void) => void;
      terminalRemoveExitListener: () => void;
      // Clipboard operations (async via IPC)
      clipboardReadText: () => Promise<string>;
      clipboardWriteText: (text: string) => Promise<{ success: boolean }>;
      // Menu command listener
      onMenuCommand: (callback: (command: string) => void) => void;
      removeMenuCommandListener: () => void;
      // Command stats operations
      commandStatsRecord: (command: string) => Promise<{ success: boolean }>;
      commandStatsGetTop: (limit?: number) => Promise<CommandStat[]>;
      commandStatsGetAll: () => Promise<CommandStats>;
      commandStatsClear: () => Promise<{ success: boolean }>;
    };
  }
}

export interface CommandStat {
  command: string;
  count: number;
  lastUsed: string;
}

export interface CommandStats {
  [command: string]: {
    count: number;
    lastUsed: string;
  };
}

export {};
