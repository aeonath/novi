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
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
});

// Type definitions for the exposed API
// Types moved to src/types/global.d.ts to ensure availability in the renderer build
