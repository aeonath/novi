/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { app, BrowserWindow, ipcMain, clipboard, dialog, Menu } from 'electron';
import { join, normalize, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readdir, stat, readFile, writeFile, mkdir, rm, rename as fsRename } from 'node:fs/promises';
import { getSetting, setSetting } from './settings';
import { logInfo, logError } from './logger';
import { saveCrashReport, getDiagnosticsInfo, getCrashesDirectory } from './crash-reporter';
import { saveRecoveryFiles, getRecoveryFiles, deleteRecoveryFile, clearAllRecoveryFiles, cleanupOldRecoveryFiles } from './recovery';
import { logSuccess, logError as logFSError } from './services/fs-logger';
import { gitService } from './services/git-service';
import { gitWatcher } from './services/git-watcher';
import { gitCredentialHelper } from './services/git-credential-helper';
import { terminalService, DEFAULT_GITBASH_PATH } from './services/terminal-service';
import type { ShellType } from './services/terminal-service';
import { workspaceManager } from './services/workspace-service';
import { fileTreeWatcher } from './services/file-tree-watcher';
import { editorFileWatcher } from './services/editor-file-watcher';
import { initializeMenu, setMenuCommandHandler, MenuCommand, buildMenu } from './menu';
import { commandStatsService } from './services/command-stats-service';
import { loadAllExtensions } from '../core/extension-loader';

let mainWindowRef: BrowserWindow | null = null;

// --- Debug logging gate (main process) ---
// When debug is off, console.log and console.info become no-ops.
// console.warn and console.error are always active.
const _origLog = console.log.bind(console);
const _origInfo = console.info.bind(console);
const _noop = () => {};

function applyDebugMode(enabled: boolean) {
  console.log = enabled ? _origLog : _noop;
  console.info = enabled ? _origInfo : _noop;
}

// Load debug setting synchronously at startup
applyDebugMode(!!getSetting<boolean>('debug', false));

// Load shell settings at startup
{
  const defaultShellType: ShellType = process.platform === 'win32' ? 'gitbash' : 'linux';
  const shellType = getSetting<ShellType>('shellType', defaultShellType) || defaultShellType;
  const shellPath = getSetting<string>('shellPath', DEFAULT_GITBASH_PATH) || DEFAULT_GITBASH_PATH;
  terminalService.setShell(shellType, shellPath);
}

// --- MSYS / Git-bash path conversion ---
// Git-bash reports POSIX paths via $PWD: /c/Work → C:\Work, / → Git root, /usr → Git root\usr
// We detect the Git install root once and convert all incoming PWD paths.
let cachedGitRoot: string | null | undefined; // undefined = not yet detected

function getGitRoot(): string | null {
  if (cachedGitRoot !== undefined) return cachedGitRoot;
  const candidates = [
    'C:\\Program Files\\Git',
    'C:\\Program Files (x86)\\Git',
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      cachedGitRoot = p;
      return p;
    }
  }
  cachedGitRoot = null;
  return null;
}

function msysToWindows(posixPath: string): string {
  // Already a Windows path (PowerShell, cmd)
  if (/^[A-Za-z]:/.test(posixPath)) return posixPath;
  // Not a POSIX path
  if (!posixPath.startsWith('/')) return posixPath;

  // Drive letter: /c/Work → C:\Work, /d/ → D:\
  const driveMatch = posixPath.match(/^\/([a-zA-Z])(\/.*)?$/);
  if (driveMatch) {
    const drive = driveMatch[1].toUpperCase();
    const rest = (driveMatch[2] || '\\').replace(/\//g, '\\');
    return `${drive}:${rest}`;
  }

  // MSYS root paths: /, /usr, /etc, /tmp → Git install dir + path
  const gitRoot = getGitRoot();
  if (gitRoot) {
    if (posixPath === '/') return gitRoot;
    return gitRoot + posixPath.replace(/\//g, '\\');
  }

  // Fallback: return as-is
  return posixPath;
}

/** App version from this project's package.json (not Electron/parent package). */
function getAppVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    if (typeof pkg.version === 'string') return pkg.version;
  } catch {
    // ignore
  }
  return 'unknown';
}

// Set NODE_ENV for development (not used for branching, kept for future use)
process.env.NODE_ENV ??= 'development';

/**
 * Handle menu commands
 */
// Menu command handler
async function handleMenuCommand(command: MenuCommand, window: BrowserWindow): Promise<void> {
  logInfo(`[Menu] Handling command: ${command}`);
  
  // Record command execution
  commandStatsService.recordCommand(command);
  
  // Handle DevTools toggle in main process
  if (command === 'toggle-devtools') {
    const isOpen = window.webContents.isDevToolsOpened();
    if (isOpen) {
      window.webContents.closeDevTools();
      setSetting('devToolsEnabled', false);
      logInfo('[Menu] DevTools disabled');
    } else {
      window.webContents.openDevTools();
      setSetting('devToolsEnabled', true);
      logInfo('[Menu] DevTools enabled');
    }
    // Rebuild menu to update label
    const menu = buildMenu(window);
    Menu.setApplicationMenu(menu);
    return;
  }

  // Handle show-hidden-files toggle in main process
  if (command === 'show-hidden-files') {
    const current = !!getSetting<boolean>('showhiddenfiles', false);
    setSetting('showhiddenfiles', !current);
    // Rebuild menu to update checkbox state
    const menu = buildMenu(window);
    Menu.setApplicationMenu(menu);
    // Forward to renderer so file tree refreshes
    window.webContents.send('menu-command', command);
    return;
  }

  // Send other commands to renderer
  window.webContents.send('menu-command', command);
}

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
    icon: join(__dirname, '../renderer/assets/icon.png'),
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

  // Initialize application menu
  setMenuCommandHandler(handleMenuCommand);
  initializeMenu(mainWindow);
  mainWindow.setMenuBarVisibility(true);

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

  // Sync devtools setting and menu label when devtools are opened/closed externally
  mainWindow.webContents.on('devtools-opened', () => {
    setSetting('devToolsEnabled', true);
    const menu = buildMenu(mainWindow);
    Menu.setApplicationMenu(menu);
  });
  mainWindow.webContents.on('devtools-closed', () => {
    setSetting('devToolsEnabled', false);
    const menu = buildMenu(mainWindow);
    Menu.setApplicationMenu(menu);
  });

  mainWindowRef = mainWindow;
  
  // Set main window for credential helper
  gitCredentialHelper.setMainWindow(mainWindow);
}

app.setAppUserModelId('studio.miranova.novi');

void app.whenReady().then(() => {
  logInfo('App ready');
  
  // Load command stats
  void commandStatsService.loadStats();
  
  // Clean up old recovery files (older than 7 days)
  void cleanupOldRecoveryFiles();
  
  // IPC handler for app version (read from this app's package.json, not Electron's app.getVersion())
  ipcMain.handle('get-version', () => getAppVersion());

  // IPC handler for command-line args
  ipcMain.handle('get-command-line-args', () => process.argv);

  // Platform detection
  ipcMain.handle('get-platform', () => process.platform);
  ipcMain.handle('check-wsl-available', () => {
    if (process.platform !== 'win32') return false;
    if (!existsSync('C:\\Windows\\System32\\wsl.exe')) return false;
    try {
      const output = execFileSync('C:\\Windows\\System32\\wsl.exe', ['--list', '--quiet'], {
        encoding: 'utf16le',
        timeout: 5000,
        windowsHide: true,
      });
      // Check if any non-empty lines exist (actual distro names)
      const distros = output.split(/\r?\n/).filter(line => line.trim().length > 0);
      return distros.length > 0;
    } catch {
      return false;
    }
  });

  // Generic settings IPC
  ipcMain.handle('get-setting', (_e, key: string, defaults?: unknown) => getSetting(key, defaults));
  ipcMain.handle('set-setting', (_e, key: string, value: unknown) => {
    setSetting(key, value);
    if (key === 'debug') applyDebugMode(!!value);
    if (key === 'shellType' || key === 'shellPath') {
      const defaultSt: ShellType = process.platform === 'win32' ? 'gitbash' : 'linux';
      const st = getSetting<ShellType>('shellType', defaultSt) || defaultSt;
      const sp = getSetting<string>('shellPath', DEFAULT_GITBASH_PATH) || DEFAULT_GITBASH_PATH;
      terminalService.setShell(st, sp);
    }
  });
  ipcMain.on('renderer-error', (_e, payload: { message: string; stack?: string }) => {
    logError(`Renderer error: ${payload.message}`, payload.stack);
    saveCrashReport('rendererError', new Error(payload.message), payload.stack);
  });
  
  // Developer Tools toggle — called from renderer's custom title bar menu
  ipcMain.handle('toggle-devtools', () => {
    if (!mainWindowRef) return;
    const isOpen = mainWindowRef.webContents.isDevToolsOpened();
    if (isOpen) {
      mainWindowRef.webContents.closeDevTools();
      setSetting('devToolsEnabled', false);
      logInfo('[Menu] DevTools disabled');
    } else {
      mainWindowRef.webContents.openDevTools();
      setSetting('devToolsEnabled', true);
      logInfo('[Menu] DevTools enabled');
    }
    // Rebuild native menu to update label
    const menu = buildMenu(mainWindowRef);
    Menu.setApplicationMenu(menu);
  });
  
  // Crash reporting and diagnostics IPC
  ipcMain.handle('copy-diagnostics', () => {
    const diagnostics = getDiagnosticsInfo();
    clipboard.writeText(diagnostics);
    return diagnostics;
  });
  ipcMain.handle('get-crashes-directory', () => getCrashesDirectory());
  
  // Extension loader IPC handler — generic, loads all extensions from ~/.novi/extensions/
  ipcMain.handle('load-all-extensions', async () => {
    try {
      return await loadAllExtensions();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        loaded: 0,
        discarded: 0,
        extensions: [],
      };
    }
  });
  
  // File system IPC handlers
  // Windows system/protected names to skip when reading drive root (avoids EPERM)
  const WINDOWS_SYSTEM_NAMES = new Set([
    'hiberfil.sys', 'pagefile.sys', 'swapfile.sys', 'DumpStack.log', 'appverifUI.dll',
    '$Recycle.Bin', 'System Volume Information', 'Documents and Settings', 'PerfLogs',
    'Recovery', 'Config.Msi',
  ]);

  ipcMain.handle('read-directory', async (_e, path: string) => {
    try {
      // Normalize path: "C:" -> "C:\"; Git Bash/Unix-style "/c/Work" -> "C:\Work" so readdir sees a valid Windows path
      let dirPath = /^[A-Za-z]:$/.test(path) ? path + '\\' : path;
      const unixDriveMatch = path.match(/^\/([a-zA-Z])\/(.*)$/);
      if (unixDriveMatch) {
        const letter = unixDriveMatch[1].toUpperCase();
        const rest = (unixDriveMatch[2] || '').replace(/\//g, '\\');
        dirPath = rest ? `${letter}:\\${rest}` : `${letter}:\\`;
      }
      const entries = await readdir(dirPath, { withFileTypes: true });
      const isDriveRoot = /^[A-Za-z]:[\/\\]?$/.test(dirPath.replace(/\\/g, '/'));

      const showHidden = !!getSetting<boolean>('showhiddenfiles', false);
      const filtered: { name: string; path: string; type: string; isDirectory: boolean; size: number }[] = [];
      for (const entry of entries) {
        if (isDriveRoot && WINDOWS_SYSTEM_NAMES.has(entry.name)) continue;
        if (!showHidden && entry.name.startsWith('.')) continue;
        const fullPath = join(dirPath, entry.name);
        const isDir = entry.isDirectory();
        filtered.push({
          name: entry.name,
          path: fullPath,
          type: isDir ? 'directory' : 'file',
          isDirectory: isDir,
          size: 0,
        });
      }
      return filtered.sort((a, b) => {
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
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
  
  /** Normalize path for fs: on Windows convert MSYS (/c/...) to Windows (C:\...) and normalize slashes */
  function normalizePathForFs(p: string): string {
    if (process.platform === 'win32') {
      const m = p.match(/^\/([a-zA-Z])\/(.*)$/);
      if (m) p = m[1].toUpperCase() + ':\\' + m[2].replace(/\//g, '\\');
    }
    return normalize(p);
  }

  ipcMain.handle('read-file', async (_e, filePath: string) => {
    const resolvedPath = normalizePathForFs(filePath);
    try {
      const content = await readFile(resolvedPath, 'utf-8');
      const stats = await stat(resolvedPath);
      return {
        path: resolvedPath,
        content,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error: unknown) {
      const isENOENT = error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
      if (isENOENT) {
        const parentDir = dirname(resolvedPath);
        try {
          const parentStats = await stat(parentDir);
          if (parentStats.isDirectory()) {
            return {
              path: resolvedPath,
              content: '',
              size: 0,
              modified: new Date(),
            };
          }
        } catch {
          // parent doesn't exist or not a directory
        }
      }
      logError(`Failed to read file: ${filePath}`, error);
      throw error;
    }
  });

  ipcMain.handle('save-file', async (_e, filePath: string, content: string) => {
    try {
      editorFileWatcher.markSaved(filePath);
      const parentDir = dirname(filePath);
      await mkdir(parentDir, { recursive: true });
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
    const resolvedPath = normalizePathForFs(filePath);
    try {
      await writeFile(resolvedPath, '', 'utf-8');
      await logSuccess('create-file', resolvedPath);
      return { success: true, path: resolvedPath };
    } catch (error) {
      await logFSError('create-file', resolvedPath, error as Error);
      throw error;
    }
  });

  ipcMain.handle('create-directory', async (_e, dirPath: string) => {
    const resolvedPath = normalizePathForFs(dirPath);
    try {
      await mkdir(resolvedPath, { recursive: false });
      await logSuccess('create-directory', resolvedPath);
      return { success: true, path: resolvedPath };
    } catch (error) {
      await logFSError('create-directory', resolvedPath, error as Error);
      throw error;
    }
  });

  ipcMain.handle('rename-file', async (_e, oldPath: string, newPath: string) => {
    const resolvedOld = normalizePathForFs(oldPath);
    const resolvedNew = normalizePathForFs(newPath);
    try {
      await fsRename(resolvedOld, resolvedNew);
      await logSuccess('rename-file', resolvedOld, `-> ${resolvedNew}`);
      return { success: true, oldPath: resolvedOld, newPath: resolvedNew };
    } catch (error) {
      await logFSError('rename-file', resolvedOld, error as Error);
      throw error;
    }
  });

  ipcMain.handle('delete-file', async (_e, filePath: string, isDirectory: boolean) => {
    const resolvedPath = normalizePathForFs(filePath);
    try {
      if (isDirectory) {
        await rm(resolvedPath, { recursive: true, force: false });
      } else {
        await rm(resolvedPath, { force: false });
      }
      await logSuccess('delete-file', resolvedPath, isDirectory ? '(directory)' : '(file)');
      return { success: true, path: resolvedPath };
    } catch (error) {
      await logFSError('delete-file', resolvedPath, error as Error);
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

  // Git watcher IPC handlers (event-driven monitoring)
  ipcMain.handle('git-start-watching', async (_e, repoPath: string) => {
    try {
      const normalized = repoPath.replace(/\\/g, '/');
      if (/^[A-Za-z]:\/?$/.test(normalized)) return; // don't watch drive root
      // Only watch if .git is directly in this directory
      if (!existsSync(join(repoPath, '.git'))) return;
      await gitWatcher.watch(repoPath);
      logInfo(`Started watching git repository: ${repoPath}`);
    } catch (error) {
      logError('Failed to start git watcher', error as Error);
      throw error;
    }
  });

  ipcMain.handle('git-stop-watching', async () => {
    try {
      await gitWatcher.unwatch();
      logInfo('Stopped watching git repository');
    } catch (error) {
      logError('Failed to stop git watcher', error as Error);
      throw error;
    }
  });

  ipcMain.handle('git-find-root', async (_e, cwd: string) => {
    try {
      return await gitService.findRoot(cwd);
    } catch {
      return null;
    }
  });

  ipcMain.handle('git-manual-refresh', async (_e, cwd: string) => {
    try {
      return await gitService.getStatus(cwd);
    } catch (error) {
      logError('Failed to manually refresh git status', error as Error);
      throw error;
    }
  });

  // Git credential response handler
  ipcMain.handle('git-credential-response', async (_e, response: any) => {
    try {
      console.log('[Git] Credential response received');
      gitCredentialHelper.provideCredentials(response);
      return { success: true };
    } catch (error) {
      logError('Failed to handle credential response', error as Error);
      throw error;
    }
  });

  // Forward git change events to renderer (only fires on .git/ internal changes)
  gitWatcher.on('change', (event) => {
    mainWindowRef?.webContents.send('git-change', event);
  });

  // File tree watcher IPC handlers (root + expanded dirs only, depth 1)
  ipcMain.handle('filetree-start-watching', async (_e, rootPath: string, expandedPaths?: string[]) => {
    try {
      fileTreeWatcher.watch(rootPath, expandedPaths ?? []);
      logInfo(`Started watching file tree: ${rootPath} (${(expandedPaths ?? []).length} expanded)`);
    } catch (error) {
      logError('Failed to start file tree watcher', error as Error);
      throw error;
    }
  });

  ipcMain.handle('filetree-stop-watching', async () => {
    try {
      fileTreeWatcher.stop();
      logInfo('Stopped watching file tree');
    } catch (error) {
      logError('Failed to stop file tree watcher', error as Error);
      throw error;
    }
  });

  // Forward file tree change events to renderer
  fileTreeWatcher.on('change', (event) => {
    mainWindowRef?.webContents.send('filetree-change', event);
  });

  // Editor file watcher IPC handlers (watches individual open files for external changes)
  ipcMain.handle('editor-watch-file', async (_e, filePath: string) => {
    editorFileWatcher.watchFile(filePath);
  });

  ipcMain.handle('editor-unwatch-file', async (_e, filePath: string) => {
    editorFileWatcher.unwatchFile(filePath);
  });

  editorFileWatcher.on('file-changed', (filePath: string) => {
    mainWindowRef?.webContents.send('editor-file-changed', filePath);
  });

  // Absorb watcher errors so they don't become unhandled EventEmitter exceptions
  fileTreeWatcher.on('error', (err: unknown) => {
    logError('File tree watcher error', err instanceof Error ? err : new Error(String(err)));
  });
  gitWatcher.on('error', (err: unknown) => {
    logError('Git watcher error', err instanceof Error ? err : new Error(String(err)));
  });

  // Workspace IPC handlers
  ipcMain.handle('workspace-save', async (_e, state: any) => {
    try {
      await workspaceManager.saveWorkspace(state);
      return { success: true };
    } catch (error) {
      logError('Failed to save workspace', error as Error);
      throw error;
    }
  });

  ipcMain.handle('workspace-load', async () => {
    try {
      const state = await workspaceManager.loadWorkspace();
      return state;
    } catch (error) {
      logError('Failed to load workspace', error as Error);
      throw error;
    }
  });

  ipcMain.handle('workspace-clear', async () => {
    try {
      await workspaceManager.clearWorkspace();
      return { success: true };
    } catch (error) {
      logError('Failed to clear workspace', error as Error);
      throw error;
    }
  });

  ipcMain.handle('workspace-get-path', async () => {
    try {
      return { path: workspaceManager.getWorkspaceFilePath() };
    } catch (error) {
      logError('Failed to get workspace path', error as Error);
      throw error;
    }
  });

  // Command Stats IPC handlers
  ipcMain.handle('command-stats-record', async (_e, command: string) => {
    try {
      commandStatsService.recordCommand(command);
      return { success: true };
    } catch (error) {
      logError('Failed to record command', error as Error);
      return { success: false };
    }
  });

  ipcMain.handle('command-stats-get-top', async (_e, limit = 8) => {
    try {
      return commandStatsService.getTopCommands(limit);
    } catch (error) {
      logError('Failed to get top commands', error as Error);
      return [];
    }
  });

  ipcMain.handle('command-stats-get-all', async () => {
    try {
      return commandStatsService.getAllStats();
    } catch (error) {
      logError('Failed to get all stats', error as Error);
      return {};
    }
  });

  ipcMain.handle('command-stats-clear', async () => {
    try {
      await commandStatsService.clearStats();
      return { success: true };
    } catch (error) {
      logError('Failed to clear stats', error as Error);
      return { success: false };
    }
  });

  // Terminal IPC handlers
  ipcMain.handle('terminal-create', async (_e, cwd?: string, cols = 80, rows = 24, customId?: string) => {
    try {
      const cwdPath = cwd || process.cwd();
      const terminalId = terminalService.createSession(cwd, cols, rows, customId);
      const session = terminalService.getSession(terminalId);
      
      if (!session || !mainWindowRef) {
        throw new Error('Failed to create terminal session');
      }

      // Send initial CWD so file tree can show it before first PWD from shell
      if (!mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('terminal-initial-cwd', terminalId, cwdPath);
        // Shells without PROMPT_COMMAND (cmd, powershell) never emit OSC 7,
        // so the file tree stays in loading state. Send terminal-pwd directly.
        const shellType = terminalService.getShellType();
        const isBashLike = shellType === 'gitbash' || shellType === 'wsl' || shellType === 'linux';
        if (!isBashLike) {
          mainWindowRef.webContents.send('terminal-pwd', terminalId, cwdPath);
        }
      }

      // Forward PTY output to renderer
      // OSC 7 CWD notification: ESC ] 7 ; file://hostname/path BEL-or-ST
      const OSC7_RE = /\x1b\]7;file:\/\/[^/]*(\/[^\x07\x1b]*)(?:\x07|\x1b\\)/;
      // Track whether we still need to inject a cd for workspace restore.
      // The first OSC 7 proves bash has fully initialized (PROMPT_COMMAND fired).
      let pendingCdRestore = cwd ? cwd : null;

      // Batch PTY output into ~16ms frames to reduce IPC overhead.
      // Instead of sending every tiny PTY chunk as a separate IPC message,
      // we accumulate data and flush once per frame (~60fps).
      // Buffer is capped at MAX_BUFFER_BYTES to prevent memory explosion
      // when shell scripts produce high-throughput output (build tools, aws cli, etc.).
      let dataBuffer = '';
      let dataBufferLen = 0;
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const FLUSH_INTERVAL_MS = 16;
      const MAX_BUFFER_BYTES = 128 * 1024; // 128KB — flush immediately if exceeded

      const flushBuffer = () => {
        flushTimer = null;
        if (dataBuffer && mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('terminal-data', terminalId, dataBuffer);
          dataBuffer = '';
          dataBufferLen = 0;
        }
      };

      session.pty.onData((data: string) => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          // Parse OSC 7 to extract CWD (invisible to xterm.js — no stripping needed)
          const osc7Match = OSC7_RE.exec(data);
          if (osc7Match) {
            const rawPath = decodeURIComponent(osc7Match[1]);
            const resolvedPath = process.platform === 'win32' ? msysToWindows(rawPath) : rawPath;

            // If we have a pending cd restore and bash is now ready, inject it
            if (pendingCdRestore) {
              const targetPath = pendingCdRestore;
              pendingCdRestore = null; // Only inject once
              // Normalize for comparison: both to forward-slash lowercase
              const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
              if (norm(resolvedPath) !== norm(targetPath)) {
                session.pty.write(`cd "${targetPath.replace(/\\/g, '/')}" && clear\r`);
              } else {
                // Already in the right directory — notify renderer so the file tree loads
                mainWindowRef.webContents.send('terminal-pwd', terminalId, resolvedPath);
              }
            } else {
              mainWindowRef.webContents.send('terminal-pwd', terminalId, resolvedPath);
            }
          }
          // Accumulate data and schedule flush on next frame boundary
          dataBuffer += data;
          dataBufferLen += data.length;
          if (dataBufferLen >= MAX_BUFFER_BYTES) {
            // Buffer is large — flush immediately to prevent memory buildup
            if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
            flushBuffer();
          } else if (!flushTimer) {
            flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL_MS);
          }
        }
      });

      // Forward PTY exit to renderer so it can close the tab
      session.pty.onExit((exitEvent) => {
        logInfo(`[Main] Terminal ${terminalId} exited with code ${exitEvent.exitCode}`);
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('terminal-exit', terminalId, exitEvent.exitCode);
        }
      });

      logInfo(`[Main] Terminal ${terminalId} created with PTY successfully`);
      return { id: terminalId, initialCwd: cwdPath };
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
  
  // Browse for executable file (used by settings UI for custom shell paths)
  ipcMain.handle('browse-for-executable', async () => {
    if (!mainWindowRef) return null;
    const result = await dialog.showOpenDialog(mainWindowRef, {
      properties: ['openFile'],
      filters: [{ name: 'Executables', extensions: ['exe'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // terminal-restart IPC removed — shell restart now uses terminalKill + terminalCreate
  // from the renderer side, avoiding session map corruption from async onExit handlers.

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

  // Clipboard IPC handlers
  ipcMain.handle('clipboard-read-text', async () => {
    try {
      const { clipboard } = await import('electron');
      return clipboard.readText();
    } catch (error) {
      logError('Failed to read clipboard', error as Error);
      return '';
    }
  });

  ipcMain.handle('clipboard-write-text', async (_e, text: string) => {
    try {
      const { clipboard } = await import('electron');
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      logError('Failed to write clipboard', error as Error);
      return { success: false };
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
