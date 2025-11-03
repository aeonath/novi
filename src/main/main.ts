import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { getSetting, setSetting } from './settings';
import { logInfo, logError } from './logger';

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
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
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
});
process.on('unhandledRejection', (reason) => {
  logError('Unhandled rejection in main', reason);
});
