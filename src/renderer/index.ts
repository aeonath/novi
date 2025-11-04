// Renderer process entry point
import { ActionHUD } from './components/action-hud';
import { createDefaultActions, ActionContext } from './components/actions';
import { FileTree } from './components/file-tree';
import { SettingsPanel } from './components/settings-panel';
import { TitleBar } from './components/title-bar';
import { StatusBar } from './components/status-bar';
import { FileViewer } from './components/file-viewer';
import { initializeThemeManager, themes } from './theme';

document.addEventListener('DOMContentLoaded', (): void => {
  void (async (): Promise<void> => {
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

    // Handle setting changes
    settingsPanel.onChange(async (id, value) => {
      // Save to storage
      await settingsPanel.saveToStorage(id, value);

      // Apply in real time
      switch (id) {
        case 'theme':
          // Apply theme via ThemeManager
          themeManager.applyThemeById(String(value));
          break;
        case 'fontSize':
          document.documentElement.style.setProperty('--font-size', `${value}px`);
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

    // Initialize Action HUD
    const actionContext: ActionContext = {
      onOpenFile: async () => {
        if (!window.api) {
          return;
        }
        try {
          const filePath = await window.api.openFile();
          if (filePath) {
            await fileViewer.openFile(filePath);
            statusBar.setStatus(`Viewing: ${filePath.split(/[\\/]/).pop()}`);
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
