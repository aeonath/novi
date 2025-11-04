/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  ping: () => Promise.resolve('pong'),
  getSetting: <T = unknown>(key: string, defaults?: T) =>
    ipcRenderer.invoke('get-setting', key, defaults),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),
  reportError: (message: string, stack?: string) =>
    ipcRenderer.send('renderer-error', { message, stack }),
  copyDiagnostics: () => ipcRenderer.invoke('copy-diagnostics'),
  getCrashesDirectory: () => ipcRenderer.invoke('get-crashes-directory'),
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
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
});

// Type definitions for the exposed API
// Types moved to src/types/global.d.ts to ensure availability in the renderer build
