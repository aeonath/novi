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
    const maxAttempts = 100; // 5 seconds max wait
    
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof monaco !== 'undefined') {
        clearInterval(checkInterval);
        console.log('[Nova] Monaco loaded successfully');
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('[Nova] Monaco failed to load after 5 seconds');
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

    // Load settings from storage
    await settingsPanel.loadFromStorage();

    // Handle setting changes (editor will be initialized later)
    let editorInstance: MonacoEditorView | null = null;
    
    settingsPanel.onChange(async (id, value) => {
      // Save to storage
      await settingsPanel.saveToStorage(id, value);

      // Apply in real time
      switch (id) {
        case 'theme':
          // Apply theme via ThemeManager
          themeManager.applyThemeById(String(value));
          // Update Monaco theme
          if (editorInstance) {
            editorInstance.setTheme(String(value) === 'light' ? 'light' : 'dark');
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
          // eslint-disable-next-line no-console
          console.log(`Auto save ${value ? 'enabled' : 'disabled'}`);
          break;
        case 'editorTabSize':
          // eslint-disable-next-line no-console
          console.log(`Tab size set to ${value}`);
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

    // Initialize Monaco Editor (only if Monaco loaded successfully)
    const editorContainer = document.getElementById('monaco-editor-container') as HTMLElement;
    const welcomeScreen = document.getElementById('welcome-screen') as HTMLElement;
    
    if (monacoLoaded && editorContainer) {
      try {
        // Show editor by default with welcome content
        editorInstance = new MonacoEditorView(editorContainer, {
          theme: currentTheme.id === 'light' ? 'light' : 'dark',
          fontSize: 14,
          wordWrap: 'on',
          minimap: true,
          lineNumbers: 'on',
        });
        
        // Show the editor
        editorContainer.style.display = 'block';
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
            
            // Set content in Monaco editor
            editorInstance.setValue(fileData.content);
            
            // Set language based on file extension
            const language = detectLanguage(filePath);
            editorInstance.setLanguage(language);
            
            // Update status bar
            const fileName = filePath.split(/[\\/]/).pop() || filePath;
            statusBar.setStatus(`Editing: ${fileName}`);
            
            // eslint-disable-next-line no-console
            console.log(`[Monaco] Opened file: ${filePath} (${language})`);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to open file:', error);
          statusBar.setStatus('Error opening file', 'Failed to open file');
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
  if (window.api) {
    const stack = ev.error instanceof Error ? ev.error.stack : undefined;
    window.api.reportError(ev.message ?? 'Unknown renderer error', stack);
  }
  alert('A renderer error occurred. Please check logs for details.');
});

window.addEventListener('unhandledrejection', (ev) => {
  if (window.api) {
    const reason =
      ev.reason instanceof Error ? `${ev.reason.message}\n${ev.reason.stack}` : String(ev.reason);
    window.api.reportError('Unhandled rejection', reason);
  }
  alert('An unexpected error occurred. Please check logs for details.');
});

// Intentionally no exports so this compiles to a plain browser script (no CommonJS wrapper)
