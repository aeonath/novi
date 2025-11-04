/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { app, BrowserWindow, ipcMain, clipboard, dialog } from 'electron';
import { join } from 'node:path';
import { readdir, stat, readFile, writeFile, mkdir, rm, rename as fsRename } from 'node:fs/promises';
import { getSetting, setSetting } from './settings';
import { logInfo, logError } from './logger';
import { saveCrashReport, getDiagnosticsInfo, getCrashesDirectory } from './crash-reporter';
import { saveRecoveryFiles, getRecoveryFiles, deleteRecoveryFile, clearAllRecoveryFiles, cleanupOldRecoveryFiles } from './recovery';
import { logSuccess, logError as logFSError } from './services/fs-logger';
import { gitService } from './services/git-service';
import { terminalService } from './services/terminal-service';

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
    show: false, // Don't show until ready to prevent white screen
    backgroundColor: '#1e1e1e', // Match app background color
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Configure CSP for Monaco Editor support
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; " +
          "style-src 'self' 'unsafe-inline' data:; " +
          "font-src 'self' data: blob:; " +
          "img-src 'self' data: blob:; " +
          "worker-src 'self' blob: data:; " +
          "child-src 'self' blob: data:;"
        ]
      }
    });
  });

  // Always load local built HTML file
  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  mainWindow.setMinimumSize(800, 600);

  // Show window when ready to prevent white screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Force window to foreground on Windows
    if (process.platform === 'win32') {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);
    } else {
      mainWindow.focus();
    }
    
    logInfo('Window shown and focused');
  });

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
  
  // Clean up old recovery files (older than 7 days)
  void cleanupOldRecoveryFiles();
  
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

  // Recovery file IPC handlers
  ipcMain.handle('save-recovery-files', async (_e, tabs: Array<{ filePath: string; content: string }>) => {
    try {
      await saveRecoveryFiles(tabs);
      return { success: true };
    } catch (error) {
      logError('Failed to save recovery files', error);
      throw error;
    }
  });

  ipcMain.handle('get-recovery-files', async () => {
    try {
      return await getRecoveryFiles();
    } catch (error) {
      logError('Failed to get recovery files', error);
      throw error;
    }
  });

  ipcMain.handle('delete-recovery-file', async (_e, id: string) => {
    try {
      await deleteRecoveryFile(id);
      return { success: true };
    } catch (error) {
      logError(`Failed to delete recovery file ${id}`, error);
      throw error;
    }
  });

  ipcMain.handle('clear-recovery-files', async () => {
    try {
      await clearAllRecoveryFiles();
      return { success: true };
    } catch (error) {
      logError('Failed to clear recovery files', error);
      throw error;
    }
  });

  // File system operation IPC handlers with logging
  ipcMain.handle('create-file', async (_e, filePath: string) => {
    try {
      await writeFile(filePath, '', 'utf-8');
      await logSuccess('create-file', filePath);
      return { success: true, path: filePath };
    } catch (error) {
      await logFSError('create-file', filePath, error as Error);
      throw error;
    }
  });

  ipcMain.handle('create-directory', async (_e, dirPath: string) => {
    try {
      await mkdir(dirPath, { recursive: false });
      await logSuccess('create-directory', dirPath);
      return { success: true, path: dirPath };
    } catch (error) {
      await logFSError('create-directory', dirPath, error as Error);
      throw error;
    }
  });

  ipcMain.handle('rename-file', async (_e, oldPath: string, newPath: string) => {
    try {
      await fsRename(oldPath, newPath);
      await logSuccess('rename-file', oldPath, `-> ${newPath}`);
      return { success: true, oldPath, newPath };
    } catch (error) {
      await logFSError('rename-file', oldPath, error as Error);
      throw error;
    }
  });

  ipcMain.handle('delete-file', async (_e, filePath: string, isDirectory: boolean) => {
    try {
      if (isDirectory) {
        await rm(filePath, { recursive: true, force: false });
      } else {
        await rm(filePath, { force: false });
      }
      await logSuccess('delete-file', filePath, isDirectory ? '(directory)' : '(file)');
      return { success: true, path: filePath };
    } catch (error) {
      await logFSError('delete-file', filePath, error as Error);
      throw error;
    }
  });

  // Git IPC handlers
  ipcMain.handle('git-get-status', async (_e, cwd: string) => {
    try {
      return await gitService.getStatus(cwd);
    } catch (error) {
      logError('Failed to get git status', error as Error);
      throw error;
    }
  });

  ipcMain.handle('git-stage-file', async (_e, cwd: string, filePath: string) => {
    try {
      return await gitService.stageFile(cwd, filePath);
    } catch (error) {
      logError('Failed to stage file', error as Error);
      throw error;
    }
  });

  ipcMain.handle('git-unstage-file', async (_e, cwd: string, filePath: string) => {
    try {
      return await gitService.unstageFile(cwd, filePath);
    } catch (error) {
      logError('Failed to unstage file', error as Error);
      throw error;
    }
  });

  ipcMain.handle('git-commit', async (_e, cwd: string, message: string) => {
    try {
      return await gitService.commit(cwd, message);
    } catch (error) {
      logError('Failed to commit', error as Error);
      throw error;
    }
  });

  ipcMain.handle('git-push', async (_e, cwd: string) => {
    try {
      return await gitService.push(cwd);
    } catch (error) {
      logError('Failed to push', error as Error);
      throw error;
    }
  });

  ipcMain.handle('git-pull', async (_e, cwd: string) => {
    try {
      return await gitService.pull(cwd);
    } catch (error) {
      logError('Failed to pull', error as Error);
      throw error;
    }
  });

  ipcMain.handle('git-get-diff', async (_e, cwd: string, filePath?: string) => {
    try {
      return await gitService.getDiff(cwd, filePath);
    } catch (error) {
      logError('Failed to get diff', error as Error);
      throw error;
    }
  });

  // Terminal IPC handlers
  ipcMain.handle('terminal-create', async (_e, cwd?: string, cols = 80, rows = 24) => {
    try {
      const terminalId = terminalService.createSession(cwd, cols, rows);
      const session = terminalService.getSession(terminalId);
      
      if (!session || !mainWindowRef) {
        throw new Error('Failed to create terminal session');
      }

      // Forward PTY output to renderer
      session.pty.onData((data: string) => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('terminal-data', terminalId, data);
        }
      });

      logInfo(`[Main] Terminal ${terminalId} created with PTY successfully`);
      return { id: terminalId };
    } catch (error) {
      logError('Failed to create terminal', error as Error);
      throw error;
    }
  });

  ipcMain.handle('terminal-write', async (_e, terminalId: string, data: string) => {
    try {
      const success = terminalService.writeToTerminal(terminalId, data);
      return { success };
    } catch (error) {
      logError(`Failed to write to terminal ${terminalId}`, error as Error);
      return { success: false };
    }
  });

  ipcMain.handle('terminal-resize', async (_e, terminalId: string, cols: number, rows: number) => {
    try {
      const success = terminalService.resizeTerminal(terminalId, cols, rows);
      return { success };
    } catch (error) {
      logError(`Failed to resize terminal ${terminalId}`, error as Error);
      return { success: false };
    }
  });

  ipcMain.handle('terminal-kill', async (_e, terminalId: string) => {
    try {
      const success = terminalService.killSession(terminalId);
      return { success };
    } catch (error) {
      logError(`Failed to kill terminal ${terminalId}`, error as Error);
      return { success: false };
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
  
  ipcMain.on('app-quit', () => {
    logInfo('[Main] App quit requested via IPC');
    app.quit();
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
  // Cleanup terminal sessions
  terminalService.cleanup();
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
