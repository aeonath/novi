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
});

// Type definitions for the exposed API
// Types moved to src/types/global.d.ts to ensure availability in the renderer build
