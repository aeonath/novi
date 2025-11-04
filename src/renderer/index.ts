// Renderer process entry point
import { ActionHUD } from './components/action-hud.js';
import { createDefaultActions, ActionContext } from './components/actions.js';
import { FileTree } from './components/file-tree.js';
import { SettingsPanel } from './components/settings-panel.js';
import { TitleBar } from './components/title-bar.js';
import { StatusBar } from './components/status-bar.js';
import { FileViewer } from './components/file-viewer.js';
import { DiagnosticsPanel } from './components/diagnostics-panel.js';
import { initializeThemeManager, themes } from './theme.js';
import { MonacoEditorView, detectLanguage } from './editor/index.js';
import { TabBar, Tab } from './components/tab-bar.js';
import { AutoSaveService } from './services/auto-save.js';
import { RecoveryDialog } from './components/recovery-dialog.js';

// Wait for Monaco to be loaded before initializing
function waitForMonaco(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof monaco !== 'undefined') {
      console.log('[Nova] Monaco already loaded');
      resolve(true);
      return;
    }
    
    console.log('[Nova] Waiting for Monaco to load...');
    let attempts = 0;
    const maxAttempts = 200; // 10 seconds max wait (increased for AMD loading)
    
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof monaco !== 'undefined') {
        clearInterval(checkInterval);
        console.log('[Nova] Monaco loaded successfully after', attempts * 50, 'ms');
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('[Nova] Monaco failed to load after 10 seconds, proceeding without editor');
        resolve(false);
      }
    }, 50);
  });
}

document.addEventListener('DOMContentLoaded', (): void => {
  void (async (): Promise<void> => {
    // Wait for Monaco Editor to load
    const monacoLoaded = await waitForMonaco();
    
    // Initialize Theme System
    const themeManager = initializeThemeManager();
    await themeManager.loadThemeFromStorage();

    // Initialize Title Bar
    const titleBar = new TitleBar({ title: 'Nova IDE' });
    const titleBarContainer = document.getElementById('title-bar-container');
    if (titleBarContainer) {
      titleBarContainer.appendChild(titleBar.getElement());
    }

    // Initialize Status Bar
    const statusBar = new StatusBar();
    const statusBarContainer = document.getElementById('status-bar-container');
    if (statusBarContainer) {
      statusBarContainer.appendChild(statusBar.getElement());
    }

    // Add version info to status bar
    if (window.api) {
      try {
        const version = await window.api.getVersion();
        statusBar.addItem({ id: 'version', text: `v${version}`, tooltip: `Nova IDE version ${version}` }, 'right');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to get version:', error);
      }
    }

    const versionElement = document.getElementById('version');

    if (versionElement && window.api) {
      try {
        const version = await window.api.getVersion();
        versionElement.textContent = `Version: ${version}`;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to get version:', error);
        versionElement.textContent = 'Version: Unknown';
      }
    }
    if (window.api) {
      const pong = await window.api.ping();
      // eslint-disable-next-line no-console
      console.log('ping ->', pong);
    }

    // Initialize Settings Panel
    const settingsPanel = new SettingsPanel();

    // Get current theme
    const currentTheme = themeManager.getCurrentTheme();

    // Add default settings
    settingsPanel.addSetting({
      id: 'theme',
      label: 'Theme',
      type: 'dropdown',
      value: currentTheme.id,
      options: Object.values(themes).map((theme) => ({
        label: theme.name,
        value: theme.id,
      })),
    });

    settingsPanel.addSetting({
      id: 'fontSize',
      label: 'Font Size',
      type: 'slider',
      value: 14,
      min: 10,
      max: 24,
      step: 1,
    });

    settingsPanel.addSetting({
      id: 'autoSave',
      label: 'Auto Save',
      type: 'toggle',
      value: true,
    });

    settingsPanel.addSetting({
      id: 'editorTabSize',
      label: 'Tab Size',
      type: 'slider',
      value: 2,
      min: 2,
      max: 8,
      step: 1,
    });

    settingsPanel.addSetting({
      id: 'wordWrap',
      label: 'Word Wrap',
      type: 'toggle',
      value: true,
    });

    // Load settings from storage
    await settingsPanel.loadFromStorage();

    // Handle setting changes (editor will be initialized later)
    let editorInstance: MonacoEditorView | null = null;
    let autoSaveService: AutoSaveService | null = null;
    
    settingsPanel.onChange(async (id, value) => {
      // Save to storage
      await settingsPanel.saveToStorage(id, value);

      // Apply in real time
      switch (id) {
        case 'theme':
          // Apply theme via ThemeManager
          themeManager.applyThemeById(String(value));
          // Update Monaco theme to match Nova theme
          if (editorInstance) {
            const currentTheme = themeManager.getCurrentTheme();
            editorInstance.applyNovaTheme(currentTheme);
          }
          break;
        case 'fontSize':
          document.documentElement.style.setProperty('--font-size', `${value}px`);
          // Update Monaco font size
          if (editorInstance) {
            editorInstance.updateOptions({ fontSize: Number(value) });
          }
          break;
        case 'autoSave':
          // Update auto-save service
          if (autoSaveService) {
            autoSaveService.updateOptions({ enabled: Boolean(value) });
            console.log(`[AutoSave] ${value ? 'enabled' : 'disabled'}`);
          }
          break;
        case 'editorTabSize':
          // eslint-disable-next-line no-console
          console.log(`Tab size set to ${value}`);
          break;
        case 'wordWrap':
          // Update Monaco word wrap
          if (editorInstance) {
            editorInstance.updateOptions({ wordWrap: value ? 'on' : 'off' });
          }
          break;
      }
    });

    // Initialize File Viewer
    const fileViewerContainer = document.querySelector('.main-content') as HTMLElement;
    const fileViewer = new FileViewer({ 
      container: fileViewerContainer,
      onClose: () => {
        statusBar.setStatus('Ready');
      },
    });

    // Initialize Diagnostics Panel
    const diagnosticsPanel = new DiagnosticsPanel();

    // Initialize Tab Bar
    const tabBarContainer = document.getElementById('tab-bar-container') as HTMLElement;
    const tabBar = new TabBar(tabBarContainer);

    // Initialize Monaco Editor (only if Monaco loaded successfully)
    const editorContainer = document.getElementById('monaco-editor-container') as HTMLElement;
    const welcomeScreen = document.getElementById('welcome-screen') as HTMLElement;
    
    if (monacoLoaded && editorContainer) {
      try {
        // Get saved settings for editor initialization
        const savedFontSize = await window.api?.getSetting<number>('fontSize', 14) || 14;
        const savedWordWrap = await window.api?.getSetting<boolean>('wordWrap', true);
        
        // Show editor by default with welcome content
        editorInstance = new MonacoEditorView(editorContainer, {
          theme: currentTheme.id === 'light' ? 'light' : 'dark',
          fontSize: savedFontSize,
          wordWrap: savedWordWrap ? 'on' : 'off',
          lineNumbers: 'on',
        });
        
        // Show the editor and tab bar
        editorContainer.style.display = 'block';
        if (tabBarContainer) {
          tabBarContainer.style.display = 'flex';
        }
        if (welcomeScreen) {
          welcomeScreen.style.display = 'none';
        }
        
        statusBar.setStatus('Ready - Editor loaded');
      } catch (error) {
        console.error('[Nova] Failed to initialize Monaco editor:', error);
        statusBar.setStatus('Ready - Editor unavailable');
        // Show welcome screen as fallback
        if (welcomeScreen) {
          welcomeScreen.style.display = 'flex';
        }
      }
    } else if (!monacoLoaded) {
      console.warn('[Nova] Monaco not loaded, falling back to welcome screen');
      statusBar.setStatus('Ready - Editor unavailable');
      // Show welcome screen as fallback
      if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
      }
    }

    // Setup dirty state tracking
    if (editorInstance) {
      editorInstance.onDirtyChange((isDirty) => {
        // Update active tab's dirty state
        const activeTab = tabBar.getActiveTab();
        if (activeTab) {
          tabBar.updateTabDirty(activeTab.id, isDirty);
          
          const fileName = activeTab.fileName;
          const dirtyMarker = isDirty ? ' *' : '';
          statusBar.setStatus(`Editing: ${fileName}${dirtyMarker}`);
        }
      });
    }

    // Setup tab switching
    tabBar.onTabSwitch((tab) => {
      if (editorInstance) {
        // Load tab content into Monaco
        editorInstance.loadFile(tab.filePath, tab.content);
        
        // Update status bar
        const dirtyMarker = tab.isDirty ? ' *' : '';
        statusBar.setStatus(`Editing: ${tab.fileName}${dirtyMarker}`);
      }
    });

    // Setup tab close callback
    tabBar.onTabClose((tabId) => {
      const tabs = tabBar.getTabs();
      const tab = tabs.find(t => t.id === tabId);
      
      if (tab && tab.isDirty) {
        const proceed = confirm(
          `You have unsaved changes in "${tab.fileName}". Do you want to close it anyway?`
        );
        return proceed;
      }
      
      return true;
    });

    // Initialize Auto-Save Service
    if (editorInstance && window.api) {
      const autoSaveEnabled = await window.api.getSetting<boolean>('autoSave', true);
      const autoSaveInterval = await window.api.getSetting<number>('autoSaveInterval', 30000);
      
      autoSaveService = new AutoSaveService({
        enabled: autoSaveEnabled,
        intervalMs: autoSaveInterval,
      });
      
      // Provide callback to get dirty tabs
      autoSaveService.onGetDirtyTabs(() => {
        return tabBar.getTabs().filter(tab => tab.isDirty);
      });
      
      // Notify when auto-save occurs
      autoSaveService.onAutoSave((tabs) => {
        console.log(`[AutoSave] Saved ${tabs.length} tab(s) to recovery`);
        statusBar.setStatus('Auto-saved', 'Auto-save completed', 2000);
      });
      
      // Start auto-save service
      autoSaveService.start();
      console.log('[AutoSave] Service started');
    }

    // Initialize Recovery Dialog
    const recoveryDialog = new RecoveryDialog();
    
    // Check for recovery files on startup
    if (window.api) {
      try {
        const recoveryFiles = await window.api.getRecoveryFiles();
        if (recoveryFiles && recoveryFiles.length > 0) {
          console.log(`[Recovery] Found ${recoveryFiles.length} recovery file(s) on startup`);
          
          // Handle restore action
          recoveryDialog.onRestore(async (recoveryFile) => {
            if (editorInstance) {
              const fileName = recoveryFile.originalPath.split(/[\\/]/).pop() || 'Recovered File';
              const language = detectLanguage(fileName);
              
              // Create tab for recovered file
              const tab: Tab = {
                id: recoveryFile.id,
                filePath: recoveryFile.originalPath,
                fileName: `${fileName} (Recovered)`,
                isDirty: true, // Recovered files are dirty
                content: recoveryFile.content,
                language: language,
              };
              
              tabBar.addTab(tab);
              
              // Delete the recovery file
              await window.api?.deleteRecoveryFile(recoveryFile.id);
              
              console.log(`[Recovery] Restored: ${fileName}`);
              statusBar.setStatus(`Restored: ${fileName}`);
              
              // Hide dialog after restore
              recoveryDialog.hide();
            }
          });
          
          // Handle discard action
          recoveryDialog.onDiscard(async (id) => {
            await window.api?.deleteRecoveryFile(id);
            console.log(`[Recovery] Discarded recovery file: ${id}`);
          });
          
          // Handle discard all action
          recoveryDialog.onDiscardAll(async () => {
            await window.api?.clearRecoveryFiles();
            console.log('[Recovery] Discarded all recovery files');
          });
          
          // Show recovery dialog
          void recoveryDialog.show();
        }
      } catch (error) {
        console.error('[Recovery] Failed to check for recovery files:', error);
      }
    }

    // Initialize Action HUD
    const actionContext: ActionContext = {
      onOpenFile: async () => {
        if (!window.api || !editorInstance) {
          return;
        }

        try {
          const filePath = await window.api.openFile();
          if (filePath) {
            // Load file data
            const fileData = await window.api.readFile(filePath);
            const fileName = filePath.split(/[\\/]/).pop() || filePath;
            const language = detectLanguage(fileName);
            
            // Create or activate tab
            const tab: Tab = {
              id: filePath, // Use file path as unique ID
              filePath: filePath,
              fileName: fileName,
              isDirty: false,
              content: fileData.content,
              language: language,
            };
            
            tabBar.addTab(tab);
            
            // eslint-disable-next-line no-console
            console.log(`[Monaco] Opened file: ${filePath}`);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to open file:', error);
          statusBar.setStatus('Error opening file', 'Failed to open file');
        }
      },
      onSaveFile: async () => {
        if (!window.api || !editorInstance) {
          return;
        }
        try {
          const filePath = editorInstance.getFilePath();
          if (!filePath) {
            // No file loaded, use Save As instead
            await actionContext.onSaveFileAs?.();
            return;
          }

          const content = editorInstance.getValue();
          await window.api.saveFile(filePath, content);
          editorInstance.markAsSaved();
          
          // Update tab content and clear dirty state
          const activeTab = tabBar.getActiveTab();
          if (activeTab) {
            tabBar.updateTabContent(activeTab.id, content);
            tabBar.updateTabDirty(activeTab.id, false);
          }
          
          const fileName = filePath.split(/[\\/]/).pop() || filePath;
          statusBar.setStatus(`Saved: ${fileName}`);
          
          // eslint-disable-next-line no-console
          console.log(`[Monaco] Saved file: ${filePath}`);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to save file:', error);
          statusBar.setStatus('Error saving file', 'Failed to save file');
        }
      },
      onSaveFileAs: async () => {
        if (!window.api || !editorInstance) {
          return;
        }
        try {
          const content = editorInstance.getValue();
          const result = await window.api.saveFileAs(content);
          
          if (result) {
            const oldPath = editorInstance.getFilePath();
            editorInstance.setFilePath(result.path);
            editorInstance.markAsSaved();
            
            const fileName = result.path.split(/[\\/]/).pop() || result.path;
            statusBar.setStatus(`Saved: ${fileName}`);
            
            // Update language based on new file extension
            const language = detectLanguage(result.path);
            editorInstance.setLanguage(language);
            
            // Update or create tab for new file
            const activeTab = tabBar.getActiveTab();
            if (activeTab && activeTab.filePath === oldPath) {
              // Remove old tab and create new one
              tabBar.removeTab(activeTab.id);
            }
            
            const newTab: Tab = {
              id: result.path,
              filePath: result.path,
              fileName: fileName,
              isDirty: false,
              content: content,
              language: language,
            };
            tabBar.addTab(newTab);
            
            // eslint-disable-next-line no-console
            console.log(`[Monaco] Saved file as: ${result.path}`);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to save file as:', error);
          statusBar.setStatus('Error saving file', 'Failed to save file');
        }
      },
      onReloadFile: async () => {
        const currentFile = fileViewer.getCurrentFile();
        if (currentFile) {
          await fileViewer.reload();
          statusBar.setStatus(`Reloaded: ${currentFile.path.split(/[\\/]/).pop()}`);
        } else {
          // eslint-disable-next-line no-console
          console.warn('No file to reload');
        }
      },
      onCloseFile: () => {
        const currentFile = fileViewer.getCurrentFile();
        if (currentFile) {
          fileViewer.close();
          statusBar.setStatus('Ready');
        }
      },
      onToggleTheme: () => {
        // Toggle theme between light and dark
        const currentThemeId = themeManager.getCurrentTheme().id;
        const newThemeId = currentThemeId === 'dark' ? 'light' : 'dark';
        settingsPanel.setSetting('theme', newThemeId);
        themeManager.applyThemeById(newThemeId);
        void settingsPanel.saveToStorage('theme', newThemeId);
      },
      onOpenSettings: () => {
        settingsPanel.show();
      },
      onOpenDiagnostics: () => {
        void diagnosticsPanel.show();
      },
    };

    const actions = createDefaultActions(actionContext);
    // Initialize Action HUD (stored for potential future programmatic access)
    new ActionHUD(actions);

    // Initialize File Tree
    // Stored for potential future programmatic access (e.g., via Action HUD)
    new FileTree('file-tree-container');
    // File tree starts empty - user can select directory via Action HUD later
    // This will be enhanced in future tasks

    // Copy Diagnostics button
    const copyDiagnosticsBtn = document.getElementById('copy-diagnostics');
    if (copyDiagnosticsBtn && window.api) {
      copyDiagnosticsBtn.style.display = 'block';
      copyDiagnosticsBtn.addEventListener('click', () => {
        void (async (): Promise<void> => {
          try {
            await window.api.copyDiagnostics();
            // Show feedback
            const originalText = copyDiagnosticsBtn.textContent;
            copyDiagnosticsBtn.textContent = 'Copied!';
            copyDiagnosticsBtn.style.background = '#00cc00';
            setTimeout(() => {
              copyDiagnosticsBtn.textContent = originalText;
              copyDiagnosticsBtn.style.background = '#00d4ff';
            }, 2000);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to copy diagnostics:', error);
          }
        })();
      });
    }
  })();
});

// Renderer error handling: log to main and notify user
window.addEventListener('error', (ev) => {
  // Ignore Monaco loader errors - they're handled internally
  if (ev.message?.includes('monaco') || ev.filename?.includes('vs/')) {
    console.warn('[Nova] Monaco loader error (handled):', ev.message);
    return;
  }
  
  console.error('[Nova] Renderer error:', ev.message, ev.error);
  if (window.api) {
    const stack = ev.error instanceof Error ? ev.error.stack : undefined;
    window.api.reportError(ev.message ?? 'Unknown renderer error', stack);
  }
  alert('A renderer error occurred. Please check logs for details.');
});

window.addEventListener('unhandledrejection', (ev) => {
  // Ignore Monaco-related promise rejections
  const reason = ev.reason instanceof Error ? ev.reason.message : String(ev.reason);
  if (reason?.includes('monaco') || reason?.includes('vs/')) {
    console.warn('[Nova] Monaco promise rejection (handled):', reason);
    return;
  }
  
  console.error('[Nova] Unhandled rejection:', reason, ev.reason);
  if (window.api) {
    const fullReason =
      ev.reason instanceof Error ? `${ev.reason.message}\n${ev.reason.stack}` : String(ev.reason);
    window.api.reportError('Unhandled rejection', fullReason);
  }
  alert('An unexpected error occurred. Please check logs for details.');
});

// Intentionally no exports so this compiles to a plain browser script (no CommonJS wrapper)
