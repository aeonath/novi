/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * App - Root React component
 * Main layout structure for Nova IDE
 */

import React, { useEffect, useState, useMemo } from 'react';
import { AppProvider } from '../contexts/AppContext.js';
import { TitleBar } from './TitleBar.js';
import { StatusBar } from './StatusBar.js';
import { TabBar } from './TabBar.js';
import { MonacoEditor } from './MonacoEditor.js';
import { FileTree } from './FileTree.js';
import { ActionHUD } from './ActionHUD.js';
import { SettingsPanel } from './SettingsPanel.js';
import { DiagnosticsPanel } from './DiagnosticsPanel.js';
import { RecoveryDialog } from './RecoveryDialog.js';
import { createDefaultActions, ActionContext } from './actions.js';

export const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [monacoReady, setMonacoReady] = useState(false);

  // Create action handlers
  const actionContext: ActionContext = useMemo(() => ({
    onOpenFile: async () => {
      console.log('[App] Open File action triggered');
      if (!window.api?.openFile || !window.api?.readFile) {
        console.error('[App] File API not available');
        return;
      }

      try {
        // Open file picker
        const filePath = await window.api.openFile();
        if (!filePath) {
          console.log('[App] No file selected');
          return;
        }

        console.log('[App] File selected:', filePath);

        // Read file content
        const fileData = await window.api.readFile(filePath);
        console.log('[App] File loaded, size:', fileData.content.length, 'bytes');

        // Hide welcome screen
        setShowWelcome(false);

        // Load into Monaco editor
        if ((window as any).__monacoEditorAPI) {
          (window as any).__monacoEditorAPI.loadFile(filePath, fileData.content);
        }

        // Add tab
        if ((window as any).__tabBarAPI) {
          const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
          (window as any).__tabBarAPI.addTab({
            id: `tab-${Date.now()}`,
            filePath: filePath,
            fileName: fileName,
            isDirty: false,
            content: fileData.content,
            language: 'typescript', // Will be auto-detected by Monaco
          });
        }

        // Update status bar
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus(`Editing: ${filePath.split(/[\\/]/).pop()}`);
        }

        console.log('[App] File opened successfully');
      } catch (error) {
        console.error('[App] Failed to open file:', error);
      }
    },
    onSaveFile: async () => {
      console.log('[App] Save File action triggered');
      // TODO: Implement save functionality with Monaco
    },
    onSaveFileAs: async () => {
      console.log('[App] Save File As action triggered');
      // TODO: Implement save as functionality
    },
    onOpenSettings: () => {
      console.log('[App] Open Settings action triggered');
      if ((window as any).__settingsPanelAPI) {
        (window as any).__settingsPanelAPI.show();
      }
    },
    onOpenDiagnostics: () => {
      console.log('[App] Open Diagnostics action triggered');
      if ((window as any).__diagnosticsPanelAPI) {
        (window as any).__diagnosticsPanelAPI.show();
      }
    },
    // Editor commands
    onFormatDocument: async () => {
      console.log('[App] Format Document action triggered');
      if ((window as any).__monacoEditorAPI) {
        await (window as any).__monacoEditorAPI.formatDocument();
      }
    },
    onGoToDefinition: async () => {
      console.log('[App] Go to Definition action triggered');
      if ((window as any).__monacoEditorAPI) {
        await (window as any).__monacoEditorAPI.goToDefinition();
      }
    },
    onFindReferences: async () => {
      console.log('[App] Find References action triggered');
      if ((window as any).__monacoEditorAPI) {
        await (window as any).__monacoEditorAPI.findReferences();
      }
    },
    onRenameSymbol: async () => {
      console.log('[App] Rename Symbol action triggered');
      if ((window as any).__monacoEditorAPI) {
        await (window as any).__monacoEditorAPI.renameSymbol();
      }
    },
    onRunLinting: () => {
      console.log('[App] Run Linting action triggered');
      if ((window as any).__monacoEditorAPI) {
        (window as any).__monacoEditorAPI.runLinting();
      }
    },
  }), []);

  // Create actions
  const actions = useMemo(() => createDefaultActions(actionContext), [actionContext]);

  useEffect(() => {
    // Wait for Monaco to load
    const checkMonaco = () => {
      if (typeof (window as any).monaco !== 'undefined') {
        setMonacoReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkMonaco()) {
      return;
    }

    // Poll if not ready
    const interval = setInterval(() => {
      if (checkMonaco()) {
        clearInterval(interval);
        clearTimeout(timeout);
      }
    }, 50);
    
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.warn('[App] Monaco failed to load after 10s');
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AppProvider>
      <div className="nova-layout" style={styles.layout}>
        <TitleBar />
        
        <div style={styles.mainContent}>
          <aside style={styles.sidebar}>
            <FileTree onFileOpen={async (filePath: string) => {
              console.log('[App] FileTree file open:', filePath);
              if (!window.api?.readFile) {
                console.error('[App] File API not available');
                return;
              }

              try {
                // Read file content
                const fileData = await window.api.readFile(filePath);
                console.log('[App] File loaded from tree, size:', fileData.content.length, 'bytes');

                // Hide welcome screen
                setShowWelcome(false);

                // Load into Monaco editor
                if ((window as any).__monacoEditorAPI) {
                  (window as any).__monacoEditorAPI.loadFile(filePath, fileData.content);
                }

                // Add tab
                if ((window as any).__tabBarAPI) {
                  const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
                  (window as any).__tabBarAPI.addTab({
                    id: `tab-${Date.now()}`,
                    filePath: filePath,
                    fileName: fileName,
                    isDirty: false,
                    content: fileData.content,
                    language: 'typescript', // Will be auto-detected by Monaco
                  });
                }

                // Update status bar
                if ((window as any).__statusBarAPI) {
                  (window as any).__statusBarAPI.setStatus(`Editing: ${filePath.split(/[\\/]/).pop()}`);
                }

                console.log('[App] File opened from tree successfully');
              } catch (error) {
                console.error('[App] Failed to open file from tree:', error);
              }
            }} />
          </aside>
          
          <main style={styles.editorArea}>
            <TabBar 
              onAllTabsClosed={() => setShowWelcome(true)}
              onTabSwitch={(tab) => {
                console.log('[App] Tab switched to:', tab.fileName);
                
                // Load the tab's content into Monaco
                if ((window as any).__monacoEditorAPI) {
                  (window as any).__monacoEditorAPI.loadFile(tab.filePath, tab.content);
                }
                
                // Update status bar
                if ((window as any).__statusBarAPI) {
                  (window as any).__statusBarAPI.setStatus(`Editing: ${tab.fileName}`);
                }
              }}
            />
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {showWelcome && !monacoReady ? (
                <div style={styles.welcome}>
                  <h1>Nova</h1>
                  <p>Loading editor...</p>
                </div>
              ) : showWelcome ? (
                <div style={styles.welcome}>
                  <h1>Nova</h1>
                  <p>Open a file to start editing</p>
                  <p style={{ fontSize: '0.9em', opacity: 0.7 }}>
                    Press <kbd>Ctrl+K</kbd> or <kbd>Ctrl+Space</kbd> for commands
                  </p>
                </div>
              ) : null}
              
              {/* Always render Monaco, but hide it when showing welcome */}
              <div style={{ 
                flex: 1, 
                display: showWelcome ? 'none' : 'flex',
                overflow: 'hidden',
              }}>
                <MonacoEditor />
              </div>
            </div>
          </main>
        </div>
        
        <StatusBar />
        
        {/* Modal components */}
        <ActionHUD actions={actions} />
        <SettingsPanel />
        <DiagnosticsPanel />
        <RecoveryDialog />
      </div>
    </AppProvider>
  );
};

const styles = {
  layout: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
    color: '#cccccc',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#252526',
    borderRight: '1px solid #3e3e42',
    overflow: 'auto',
  },
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2em',
    textAlign: 'center' as const,
  },
};

