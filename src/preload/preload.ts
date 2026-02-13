/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getCommandLineArgs: () => ipcRenderer.invoke('get-command-line-args'),
  ping: () => Promise.resolve('pong'),
  getSetting: <T = unknown>(key: string, defaults?: T) =>
    ipcRenderer.invoke('get-setting', key, defaults),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),
  reportError: (message: string, stack?: string) =>
    ipcRenderer.send('renderer-error', { message, stack }),
  copyDiagnostics: () => ipcRenderer.invoke('copy-diagnostics'),
  getCrashesDirectory: () => ipcRenderer.invoke('get-crashes-directory'),
  // updateMenuForTab removed - using custom CSS menu bar in renderer
  readDirectory: (path: string) => ipcRenderer.invoke('read-directory', path),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('save-file', filePath, content),
  saveFileAs: (content: string) => ipcRenderer.invoke('save-file-as', content),
  // Recovery operations
  saveRecoveryFiles: (tabs: Array<{ filePath: string; content: string }>) => 
    ipcRenderer.invoke('save-recovery-files', tabs),
  getRecoveryFiles: () => ipcRenderer.invoke('get-recovery-files'),
  deleteRecoveryFile: (id: string) => ipcRenderer.invoke('delete-recovery-file', id),
  clearRecoveryFiles: () => ipcRenderer.invoke('clear-recovery-files'),
  // File system operations
  createFile: (filePath: string) => ipcRenderer.invoke('create-file', filePath),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('create-directory', dirPath),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  deleteFile: (filePath: string, isDirectory: boolean) => ipcRenderer.invoke('delete-file', filePath, isDirectory),
  // Git operations
  gitGetStatus: (cwd: string) => ipcRenderer.invoke('git-get-status', cwd),
  gitStageFile: (cwd: string, filePath: string) => ipcRenderer.invoke('git-stage-file', cwd, filePath),
  gitUnstageFile: (cwd: string, filePath: string) => ipcRenderer.invoke('git-unstage-file', cwd, filePath),
  gitCommit: (cwd: string, message: string) => ipcRenderer.invoke('git-commit', cwd, message),
  gitPush: (cwd: string) => ipcRenderer.invoke('git-push', cwd),
  gitPull: (cwd: string) => ipcRenderer.invoke('git-pull', cwd),
  gitGetDiff: (cwd: string, filePath?: string) => ipcRenderer.invoke('git-get-diff', cwd, filePath),
  
  // Git watcher (event-driven monitoring)
  gitStartWatching: (repoPath: string) => ipcRenderer.invoke('git-start-watching', repoPath),
  gitStopWatching: () => ipcRenderer.invoke('git-stop-watching'),
  gitOnChange: (callback: (event: { type: string; path: string }) => void) => {
    const handler = (_event: any, data: { type: string; path: string }) => callback(data);
    ipcRenderer.on('git-change', handler);
  },
  gitRemoveChangeListener: () => {
    ipcRenderer.removeAllListeners('git-change');
  },
  gitManualRefresh: (cwd: string) => ipcRenderer.invoke('git-manual-refresh', cwd),
  
  // Git credential handling
  gitOnCredentialRequest: (callback: (request: any) => void) => {
    const handler = (_event: any, request: any) => callback(request);
    ipcRenderer.on('git-credential-request', handler);
  },
  gitRemoveCredentialListener: () => {
    ipcRenderer.removeAllListeners('git-credential-request');
  },
  gitProvideCredentials: (response: any) => ipcRenderer.invoke('git-credential-response', response),
  
  // File tree watcher
  fileTreeStartWatching: (dirPath: string) => ipcRenderer.invoke('filetree-start-watching', dirPath),
  fileTreeStopWatching: () => ipcRenderer.invoke('filetree-stop-watching'),
  fileTreeOnChange: (callback: (event: { type: string; path: string }) => void) => {
    const handler = (_event: any, data: { type: string; path: string }) => callback(data);
    ipcRenderer.on('filetree-change', handler);
  },
  fileTreeRemoveChangeListener: () => {
    ipcRenderer.removeAllListeners('filetree-change');
  },
  
  // Workspace operations
  workspaceSave: (state: any) => ipcRenderer.invoke('workspace-save', state),
  workspaceLoad: () => ipcRenderer.invoke('workspace-load'),
  workspaceClear: () => ipcRenderer.invoke('workspace-clear'),
  workspaceGetPath: () => ipcRenderer.invoke('workspace-get-path'),
  // Extension loading
  loadLyricExtension: () => ipcRenderer.invoke('load-lyric-extension'),
  loadAllExtensions: () => ipcRenderer.invoke('load-all-extensions'),
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  quit: () => ipcRenderer.send('app-quit'),
  // Terminal operations
  terminalCreate: (cwd?: string, cols?: number, rows?: number, customId?: string) => ipcRenderer.invoke('terminal-create', cwd, cols, rows, customId),
  terminalWrite: (terminalId: string, data: string) => ipcRenderer.invoke('terminal-write', terminalId, data),
  terminalResize: (terminalId: string, cols: number, rows: number) => ipcRenderer.invoke('terminal-resize', terminalId, cols, rows),
  terminalKill: (terminalId: string) => ipcRenderer.invoke('terminal-kill', terminalId),
  // Terminal event listener (for receiving data from main process)
  terminalOnData: (callback: (terminalId: string, data: string) => void) => {
    // Remove ALL existing listeners first to prevent duplicates
    ipcRenderer.removeAllListeners('terminal-data');
    
    // Now add the new listener
    ipcRenderer.on('terminal-data', (_event, terminalId: string, data: string) => {
      callback(terminalId, data);
    });
  },
  terminalRemoveDataListener: () => {
    ipcRenderer.removeAllListeners('terminal-data');
  },
  // Terminal PWD listener (for working directory updates)
  terminalOnPwd: (callback: (terminalId: string, pwd: string) => void) => {
    ipcRenderer.removeAllListeners('terminal-pwd');
    ipcRenderer.on('terminal-pwd', (_event, terminalId: string, pwd: string) => {
      callback(terminalId, pwd);
    });
  },
  terminalRemovePwdListener: () => {
    ipcRenderer.removeAllListeners('terminal-pwd');
  },
  // Terminal initial CWD (sent when PTY is created, so file tree can show path before first PWD)
  terminalOnInitialCwd: (callback: (terminalId: string, cwd: string) => void) => {
    ipcRenderer.removeAllListeners('terminal-initial-cwd');
    ipcRenderer.on('terminal-initial-cwd', (_event, terminalId: string, cwd: string) => {
      callback(terminalId, cwd);
    });
  },
  terminalRemoveInitialCwdListener: () => {
    ipcRenderer.removeAllListeners('terminal-initial-cwd');
  },
  // Terminal exit listener (for terminal process termination)
  terminalOnExit: (callback: (terminalId: string, exitCode: number) => void) => {
    // Remove ALL existing listeners first to prevent duplicates
    ipcRenderer.removeAllListeners('terminal-exit');
    
    // Now add the new listener
    ipcRenderer.on('terminal-exit', (_event, terminalId: string, exitCode: number) => {
      callback(terminalId, exitCode);
    });
  },
  terminalRemoveExitListener: () => {
    ipcRenderer.removeAllListeners('terminal-exit');
  },
  // Clipboard operations (via IPC to main process)
  clipboardReadText: () => ipcRenderer.invoke('clipboard-read-text'),
  clipboardWriteText: (text: string) => ipcRenderer.invoke('clipboard-write-text', text),
  // Menu command listener
  onMenuCommand: (callback: (command: string) => void) => {
    ipcRenderer.on('menu-command', (_event, command: string) => {
      callback(command);
    });
  },
  removeMenuCommandListener: () => {
    ipcRenderer.removeAllListeners('menu-command');
  },
  // Command stats operations
  commandStatsRecord: (command: string) => ipcRenderer.invoke('command-stats-record', command),
  commandStatsGetTop: (limit?: number) => ipcRenderer.invoke('command-stats-get-top', limit),
  commandStatsGetAll: () => ipcRenderer.invoke('command-stats-get-all'),
  commandStatsClear: () => ipcRenderer.invoke('command-stats-clear'),
});

// Type definitions for the exposed API
// Types moved to src/types/global.d.ts to ensure availability in the renderer build
