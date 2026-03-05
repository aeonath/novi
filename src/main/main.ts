/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { app, BrowserWindow, ipcMain, clipboard, dialog } from 'electron';
import { join, normalize, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { readdir, stat, readFile, writeFile, mkdir, rm, rename as fsRename } from 'node:fs/promises';
import { getSetting, setSetting } from './settings';
import { logInfo, logError } from './logger';
import { saveCrashReport, getDiagnosticsInfo, getCrashesDirectory } from './crash-reporter';
import { saveRecoveryFiles, getRecoveryFiles, deleteRecoveryFile, clearAllRecoveryFiles, cleanupOldRecoveryFiles } from './recovery';
import { logSuccess, logError as logFSError } from './services/fs-logger';
import { gitService } from './services/git-service';
import { gitWatcher } from './services/git-watcher';
import { gitCredentialHelper } from './services/git-credential-helper';
import { terminalService } from './services/terminal-service';
import { ensureNoviStubDir } from './novi-stub';
import { workspaceManager } from './services/workspace-service';
import { fileTreeWatcher } from './services/file-tree-watcher';
import { initializeMenu, setMenuCommandHandler, MenuCommand } from './menu';
import { commandStatsService } from './services/command-stats-service';
import { loadLyricExtension, loadAllExtensions } from '../core/extension-loader';

let mainWindowRef: BrowserWindow | null = null;

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
  return '0.6.9';
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
    window.webContents.toggleDevTools();
    logInfo('[Menu] DevTools toggled');
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

  // Generic settings IPC
  ipcMain.handle('get-setting', (_e, key: string, defaults?: unknown) => getSetting(key, defaults));
  ipcMain.handle('set-setting', (_e, key: string, value: unknown) => setSetting(key, value));
  ipcMain.on('renderer-error', (_e, payload: { message: string; stack?: string }) => {
    logError(`Renderer error: ${payload.message}`, payload.stack);
    saveCrashReport('rendererError', new Error(payload.message), payload.stack);
  });
  
  // Native menu IPC handlers removed - using custom CSS menu bar in renderer
  
  // Crash reporting and diagnostics IPC
  ipcMain.handle('copy-diagnostics', () => {
    const diagnostics = getDiagnosticsInfo();
    clipboard.writeText(diagnostics);
    return diagnostics;
  });
  ipcMain.handle('get-crashes-directory', () => getCrashesDirectory());
  
  // Extension loader IPC handler
  ipcMain.handle('load-lyric-extension', async () => {
    try {
      const result = await loadLyricExtension();
      if (result.success) {
        // Read extension manifest to get language info
        const { readFile: fsReadFile } = await import('node:fs/promises');
        const { join: pathJoin } = await import('node:path');
        const { homedir } = await import('node:os');
        
        const extensionsDir = pathJoin(homedir(), '.nova', 'extensions');
        const manifestPath = pathJoin(extensionsDir, 'lyric-lang', 'package.json');
        const manifest = JSON.parse(await fsReadFile(manifestPath, 'utf-8'));
        
        const language = manifest.contributes?.languages?.[0];
        const grammar = manifest.contributes?.grammars?.[0];
        
        // Read grammar file (for validation, but we'll use hardcoded Monarch grammar)
        const grammarPath = pathJoin(extensionsDir, 'lyric-lang', grammar.path);
        await fsReadFile(grammarPath, 'utf-8'); // Just validate it exists
        
        // Convert TextMate grammar to Monarch (simplified)
        const monarchGrammar = {
          defaultToken: '',
          tokenPostfix: '.lyric',
          
          keywords: [
            'def', 'class', 'var', 'god', 'bin', 'int', 'flt', 'str', 'rex', 'pyobject', 'None', 'return',
            'if', 'else', 'elif', 'given', 'for', 'done', 'try', 'catch', 'finally', 'raise', 'importpy',
            'break', 'continue', 'and', 'or', 'not', 'in', 'as', 'true', 'false', 'True', 'False', 'end',
            'self', 'print', 'input', 'float', 'len', 'range', 'type', 'isinstance', 'open', 'regex', 
            'append', 'keys', 'values'
          ],
          
          operators: ['=', '>', '<', '!', '+', '-', '*', '/', '%', '&', '|', '^', '~'],
          
          tokenizer: {
            root: [
              // Special symbols - must come before operators
              [/\+\+\+/, 'keyword'],
              
              // Comments
              [/#.*$/, 'comment'],
              
              // Strings
              [/"([^"\\]|\\.)*$/, 'string.invalid'],
              [/"/, 'string', '@string'],
              [/'([^'\\]|\\.)*$/, 'string.invalid'],
              [/'/, 'string', '@singleQuoteString'],
              
              // Keywords - using @keywords reference
              [/[a-zA-Z_]\w*/, {
                cases: {
                  '@keywords': 'keyword',
                  '@default': 'identifier'
                }
              }],
              
              // Numbers
              [/\d+\.\d+/, 'number.float'],
              [/\d+/, 'number'],
              
              // Operators
              [/[=><&|!+\-*\/%^~]/, 'operator'],
            ],
            
            string: [
              [/[^\\"]+/, 'string'],
              [/\\./, 'string.escape'],
              [/"/, 'string', '@pop'],
            ],
            
            singleQuoteString: [
              [/[^\\']+/, 'string'],
              [/\\./, 'string.escape'],
              [/'/, 'string', '@pop'],
            ],
          },
        };
        
        return {
          success: true,
          languageId: language.id,
          extensions: language.extensions,
          aliases: language.aliases,
          grammar: monarchGrammar,
        };
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  
  // Load all extensions IPC handler
  ipcMain.handle('load-all-extensions', async () => {
    try {
      const result = await loadAllExtensions();
      
      if (result.success && result.languages && result.languages.length > 0) {
        // For each language, create a simplified Monarch grammar
        const languagesWithGrammar = await Promise.all(
          result.languages.map(async (lang) => {
            // Create a Monarch grammar based on the extension's language
            const monarchGrammar = lang.id === 'lyric' ? {
              defaultToken: '',
              
              keywords: [
                'def', 'class', 'var', 'god', 'bin', 'int', 'flt', 'str', 'rex', 'pyobject', 'None', 'return',
                'if', 'else', 'elif', 'given', 'for', 'done', 'try', 'catch', 'finally', 'raise', 'importpy',
                'break', 'continue', 'and', 'or', 'not', 'in', 'as', 'true', 'false', 'True', 'False', 'end',
                'self', 'print', 'input', 'float', 'len', 'range', 'type', 'isinstance', 'open', 'regex', 
                'append', 'keys', 'values'
              ],
              
              operators: ['=', '>', '<', '!', '+', '-', '*', '/', '%', '&', '|', '^', '~'],
              
              tokenizer: {
                root: [
                  // Special symbols - must come before operators
                  [/\+\+\+/, 'keyword'],
                  
                  // Comments
                  [/#.*$/, 'comment'],
                  [/\/\/.*$/, 'comment'],
                  
                  // Strings
                  [/"([^"\\]|\\.)*$/, 'string.invalid'],
                  [/"/, 'string', '@string'],
                  [/'([^'\\]|\\.)*$/, 'string.invalid'],
                  [/'/, 'string', '@singleQuoteString'],
                  
                  // Keywords - using @keywords reference
                  [/[a-zA-Z_]\w*/, {
                    cases: {
                      '@keywords': 'keyword',
                      '@default': 'identifier'
                    }
                  }],
                  
                  // Numbers
                  [/\d+\.\d+/, 'number.float'],
                  [/\d+/, 'number'],
                  
                  // Operators
                  [/[=><&|!+\-*\/%^~]/, 'operator'],
                ],
                
                string: [
                  [/[^\\"]+/, 'string'],
                  [/\\./, 'string.escape'],
                  [/"/, 'string', '@pop'],
                ],
                
                singleQuoteString: [
                  [/[^\\']+/, 'string'],
                  [/\\./, 'string.escape'],
                  [/'/, 'string', '@pop'],
                ],
              },
            } : {
              // Generic grammar for other languages
              defaultToken: '',
              
              keywords: [
                'def', 'class', 'var', 'function', 'return', 'if', 'else', 
                'for', 'while', 'break', 'continue', 'import', 'from', 'as',
                'try', 'catch', 'finally', 'throw', 'new', 'this', 'super',
                'const', 'let', 'async', 'await', 'yield', 'export', 'default'
              ],
              
              operators: ['=', '>', '<', '!', '+', '-', '*', '/', '%', '&', '|', '^', '~'],
              
              tokenizer: {
                root: [
                  // Comments
                  [/#.*$/, 'comment'],
                  [/\/\/.*$/, 'comment'],
                  
                  // Strings
                  [/"([^"\\]|\\.)*$/, 'string.invalid'],
                  [/"/, 'string', '@string'],
                  [/'([^'\\]|\\.)*$/, 'string.invalid'],
                  [/'/, 'string', '@singleQuoteString'],
                  
                  // Keywords - using @keywords reference
                  [/[a-zA-Z_]\w*/, {
                    cases: {
                      '@keywords': 'keyword',
                      '@default': 'identifier'
                    }
                  }],
                  
                  // Numbers
                  [/\d+\.\d+/, 'number.float'],
                  [/\d+/, 'number'],
                  
                  // Operators
                  [/[=><&|!+\-*\/%^~]/, 'operator'],
                ],
                
                string: [
                  [/[^\\"]+/, 'string'],
                  [/\\./, 'string.escape'],
                  [/"/, 'string', '@pop'],
                ],
                
                singleQuoteString: [
                  [/[^\\']+/, 'string'],
                  [/\\./, 'string.escape'],
                  [/'/, 'string', '@pop'],
                ],
              },
            };
            
            return {
              languageId: lang.id,
              extensions: lang.extensions,
              aliases: lang.aliases,
              grammar: monarchGrammar,
            };
          })
        );
        
        return {
          success: true,
          loaded: result.loaded,
          discarded: result.discarded,
          languages: languagesWithGrammar,
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        loaded: 0,
        discarded: 0,
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

      const result = await Promise.all(
        entries.map(async (entry) => {
          if (isDriveRoot && WINDOWS_SYSTEM_NAMES.has(entry.name)) return null;
          const fullPath = join(dirPath, entry.name);
          try {
            const stats = await stat(fullPath);
            return {
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              isDirectory: entry.isDirectory(),
              size: stats.size,
            };
          } catch {
            return null;
          }
        })
      );

      const filtered = result.filter((r): r is NonNullable<typeof r> => r != null);
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

  ipcMain.handle('git-manual-refresh', async (_e, cwd: string) => {
    try {
      // Removed noisy console log - this happens frequently via event-driven updates
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

  // Forward git change events to renderer
  gitWatcher.on('change', (event) => {
    mainWindowRef?.webContents.send('git-change', event);
  });

  gitWatcher.on('batch-change', (files) => {
    // Only log if there are many files (more than 10)
    if (files.length > 10) {
      console.log('[Git] Batch change event, files:', files.length);
    }
    mainWindowRef?.webContents.send('git-batch-change', files);
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
      ensureNoviStubDir(app.getPath('userData')); // stub on disk for optional manual PATH; we never modify user PATH
      const terminalId = terminalService.createSession(cwd, cols, rows, customId);
      const session = terminalService.getSession(terminalId);
      
      if (!session || !mainWindowRef) {
        throw new Error('Failed to create terminal session');
      }

      // Send initial CWD so file tree can show it before first PWD from shell
      if (!mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('terminal-initial-cwd', terminalId, cwdPath);
      }

      // Forward PTY output to renderer
      // OSC 7 CWD notification: ESC ] 7 ; file://hostname/path BEL-or-ST
      const OSC7_RE = /\x1b\]7;file:\/\/[^/]*(\/[^\x07\x1b]*)(?:\x07|\x1b\\)/;
      session.pty.onData((data: string) => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          // Parse OSC 7 to extract CWD (invisible to xterm.js — no stripping needed)
          const osc7Match = OSC7_RE.exec(data);
          if (osc7Match) {
            const rawPath = decodeURIComponent(osc7Match[1]);
            const resolvedPath = process.platform === 'win32' ? msysToWindows(rawPath) : rawPath;
            mainWindowRef.webContents.send('terminal-pwd', terminalId, resolvedPath);
          }
          // Pass ALL data to renderer unchanged — OSC 7 is silently consumed by xterm.js
          mainWindowRef.webContents.send('terminal-data', terminalId, data);
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
