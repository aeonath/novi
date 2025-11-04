import { app, BrowserWindow, ipcMain, clipboard, dialog } from 'electron';
import { join } from 'node:path';
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { getSetting, setSetting } from './settings';
import { logInfo, logError } from './logger';
import { saveCrashReport, getDiagnosticsInfo, getCrashesDirectory } from './crash-reporter';

let mainWindowRef: BrowserWindow | null = null;

// Set NODE_ENV for development (not used for branching, kept for future use)
process.env.NODE_ENV ??= 'development';

function createWindow(): void {
  const savedBounds = getSetting<{ width: number; height: number; x?: number; y?: number }>(
    'windowBounds'
  ) ?? { width: 1200, height: 800 };

  const mainWindow = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: typeof savedBounds.x === 'number' ? savedBounds.x : undefined,
    y: typeof savedBounds.y === 'number' ? savedBounds.y : undefined,
    resizable: true,
    frame: false, // Enable frameless window for custom title bar
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Configure CSP for Monaco Editor
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "font-src 'self' data:; " +
          "worker-src 'self' blob:; " +
          "child-src 'self' blob:;"
        ]
      }
    });
  });

  // Always load local built HTML file
  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  mainWindow.setMinimumSize(800, 600);

  // Persist bounds on close
  const saveBounds = (): void => {
    try {
      if (mainWindow.isDestroyed()) {
        return;
      }
      const bounds = mainWindow.getBounds();
      setSetting('windowBounds', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
      });
    } catch {
      // ignore if window already destroyed
    }
  };

  mainWindow.on('close', saveBounds);
  mainWindow.on('move', saveBounds);
  mainWindow.on('resize', saveBounds);

  mainWindowRef = mainWindow;
}

void app.whenReady().then(() => {
  logInfo('App ready');
  // IPC handler for app version
  ipcMain.handle('get-version', () => app.getVersion());

  // Generic settings IPC
  ipcMain.handle('get-setting', (_e, key: string, defaults?: unknown) => getSetting(key, defaults));
  ipcMain.handle('set-setting', (_e, key: string, value: unknown) => setSetting(key, value));
  ipcMain.on('renderer-error', (_e, payload: { message: string; stack?: string }) => {
    logError(`Renderer error: ${payload.message}`, payload.stack);
    saveCrashReport('rendererError', new Error(payload.message), payload.stack);
  });
  
  // Crash reporting and diagnostics IPC
  ipcMain.handle('copy-diagnostics', () => {
    const diagnostics = getDiagnosticsInfo();
    clipboard.writeText(diagnostics);
    return diagnostics;
  });
  ipcMain.handle('get-crashes-directory', () => getCrashesDirectory());
  
  // File system IPC handlers
  ipcMain.handle('read-directory', async (_e, path: string) => {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      const result = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = join(path, entry.name);
          const stats = await stat(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            isDirectory: entry.isDirectory(),
            size: stats.size,
          };
        })
      );
      // Sort: directories first, then files, both alphabetically
      return result.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) {
          return -1;
        }
        if (!a.isDirectory && b.isDirectory) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      logError(`Failed to read directory: ${path}`, error);
      throw error;
    }
  });
  
  ipcMain.handle('select-directory', async () => {
    if (!mainWindowRef) {
      return null;
    }
    const result = await dialog.showOpenDialog(mainWindowRef, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
  
  // File operations IPC handlers
  ipcMain.handle('open-file', async () => {
    if (!mainWindowRef) {
      return null;
    }
    const result = await dialog.showOpenDialog(mainWindowRef, {
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'xml', 'yml', 'yaml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
  
  ipcMain.handle('read-file', async (_e, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8');
      const stats = await stat(filePath);
      return {
        path: filePath,
        content,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      logError(`Failed to read file: ${filePath}`, error);
      throw error;
    }
  });

  ipcMain.handle('save-file', async (_e, filePath: string, content: string) => {
    try {
      await writeFile(filePath, content, 'utf-8');
      const stats = await stat(filePath);
      return {
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      logError(`Failed to save file: ${filePath}`, error);
      throw error;
    }
  });

  ipcMain.handle('save-file-as', async (_e, content: string) => {
    try {
      const result = await dialog.showSaveDialog(mainWindowRef!, {
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts', 'html', 'css'] },
        ],
      });
      
      if (result.canceled || !result.filePath) {
        return null;
      }
      
      await writeFile(result.filePath, content, 'utf-8');
      const stats = await stat(result.filePath);
      return {
        path: result.filePath,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      logError(`Failed to save file as`, error);
      throw error;
    }
  });
  
  // Window control IPC handlers
  ipcMain.on('window-minimize', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.minimize();
    }
  });
  
  ipcMain.on('window-maximize', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      if (mainWindowRef.isMaximized()) {
        mainWindowRef.unmaximize();
      } else {
        mainWindowRef.maximize();
      }
    }
  });
  
  ipcMain.on('window-close', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.close();
    }
  });
  
  ipcMain.handle('window-is-maximized', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      return mainWindowRef.isMaximized();
    }
    return false;
  });
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logInfo('Activate with no windows; creating window');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logInfo('All windows closed');
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    const b = mainWindowRef.getBounds();
    setSetting('windowBounds', { width: b.width, height: b.height, x: b.x, y: b.y });
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('SIGINT', () => {
  logInfo('SIGINT received');
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    const b = mainWindowRef.getBounds();
    setSetting('windowBounds', { width: b.width, height: b.height, x: b.x, y: b.y });
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  logInfo('SIGTERM received');
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    const b = mainWindowRef.getBounds();
    setSetting('windowBounds', { width: b.width, height: b.height, x: b.x, y: b.y });
  }
  process.exit(0);
});

// Crash reporting
process.on('uncaughtException', (err) => {
  logError('Uncaught exception in main', err);
  saveCrashReport('uncaughtException', err);
  // Don't exit immediately - allow crash report to be saved
  // App will likely crash anyway, but give it a moment
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});
process.on('unhandledRejection', (reason) => {
  logError('Unhandled rejection in main', reason);
  const error = reason instanceof Error ? reason : new Error(String(reason));
  saveCrashReport('unhandledRejection', error);
});
