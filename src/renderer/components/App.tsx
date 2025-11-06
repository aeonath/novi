/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * App - Root React component
 * Main layout structure for Nova IDE
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AppProvider, useAppContext } from '../contexts/AppContext.js';
import { TitleBar } from './TitleBar.js';
import { StatusBar } from './StatusBar.js';
import { TabBar } from './TabBar.js';
import { MonacoEditor } from './MonacoEditor.js';
import { FileTree } from './FileTree.js';
import { GitPanel } from './GitPanel.js';
import { Terminal } from './Terminal.js';
import { NovaPrompt } from './NovaPrompt.js';
import { ActionHUD } from './ActionHUD.js';
import { SettingsPanel } from './SettingsPanel.js';
import { DiagnosticsPanel } from './DiagnosticsPanel.js';
import { RecoveryDialog } from './RecoveryDialog.js';
import { SavePrompt } from './SavePrompt.js';
import { createDefaultActions, ActionContext } from './actions.js';


const AppInner: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [monacoReady, setMonacoReady] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<{ id: string; type: 'file' | 'terminal' | 'nova-prompt' } | null>(null);
  const [terminalTabs, setTerminalTabs] = useState<Array<{ id: string; fileName: string; workspaceRoot?: string | null }>>([]);
  const [novaPromptTabs, setNovaPromptTabs] = useState<Array<{ id: string; fileName: string }>>([]);
  const { setGitStatus } = useAppContext();
  
  // Context menu state for welcome screen
  const [welcomeContextMenu, setWelcomeContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  // Untitled file counter for new buffers
  const [untitledCounter, setUntitledCounter] = useState(1);
  
  // Save prompt state
  const [savePrompt, setSavePrompt] = useState<{
    show: boolean;
    fileName: string;
    tabId: string;
    resolve: ((value: boolean) => void) | null;
  }>({
    show: false,
    fileName: '',
    tabId: '',
    resolve: null,
  });

  // Set up global terminal data listener
  useEffect(() => {
    if (!window.api?.terminalOnData || !window.api?.terminalRemoveDataListener) {
      console.warn('[App] Terminal API not available');
      return;
    }

    console.log('[App] Setting up terminal data listener');
    
    // Remove any existing listeners first to prevent duplicates
    window.api.terminalRemoveDataListener();
    
    window.api.terminalOnData((terminalId: string, data: string) => {
      console.log('[App] Received terminal data for:', terminalId, 'length:', data.length);
      const terminalAPI = (window as any).__terminalAPI?.[terminalId];
      if (terminalAPI && terminalAPI.write) {
        console.log('[App] Writing data to terminal:', terminalId);
        terminalAPI.write(data);
      } else {
        console.warn('[App] No terminal API found for:', terminalId, 'Available:', Object.keys((window as any).__terminalAPI || {}));
      }
    });

    return () => {
      if (window.api?.terminalRemoveDataListener) {
        console.log('[App] Cleaning up terminal data listener');
        window.api.terminalRemoveDataListener();
      }
    };
  }, []);

  // Set up global terminal exit listener to auto-close tabs when shell exits
  useEffect(() => {
    if (!window.api?.terminalOnExit || !window.api?.terminalRemoveExitListener) {
      console.warn('[App] Terminal exit API not available');
      return;
    }

    console.log('[App] Setting up terminal exit listener');
    
    // Remove any existing listeners first to prevent duplicates
    window.api.terminalRemoveExitListener();
    
    window.api.terminalOnExit((terminalId: string, exitCode: number) => {
      console.log('[App] Terminal', terminalId, 'exited with code', exitCode, '- closing tab');
      
      // Find and close the terminal tab
      const tabBarAPI = (window as any).__tabBarAPI;
      if (tabBarAPI) {
        // Close the tab - this will trigger the normal cleanup
        tabBarAPI.closeTab(terminalId);
        
        // Also remove from terminalTabs state
        setTerminalTabs((prev) => prev.filter((tab) => tab.id !== terminalId));
        
        // If this was the active tab, activate another tab
        const tabs = tabBarAPI.getTabs();
        if (tabs.length > 0 && activeTab?.id === terminalId) {
          setActiveTab(tabs[0]);
          tabBarAPI.setActiveTab(tabs[0].id);
        } else if (tabs.length === 0) {
          // No more tabs, show welcome screen
          setShowWelcome(true);
          setActiveTab(null);
        }
      }
    });

    return () => {
      if (window.api?.terminalRemoveExitListener) {
        console.log('[App] Cleaning up terminal exit listener');
        window.api.terminalRemoveExitListener();
      }
    };
  }, [activeTab]);

  // Load workspace on startup
  useEffect(() => {
    const loadWorkspace = async () => {
      if (!window.api?.workspaceLoad) {
        console.warn('[App] Workspace API not available');
        return;
      }

      try {
        console.log('[App] Loading workspace...');
        const workspace = await window.api.workspaceLoad();
        
        if (!workspace) {
          console.log('[App] No saved workspace found');
          return;
        }

        console.log('[App] Restoring workspace:', workspace);

        // Restore workspace root and FileTree directory
        if (workspace.workspaceRoot) {
          setWorkspaceRoot(workspace.workspaceRoot);
          
          // Tell FileTree to load the directory
          setTimeout(() => {
            try {
              const fileTreeAPI = (window as any).__fileTreeAPI;
              if (fileTreeAPI && fileTreeAPI.loadDirectory) {
                fileTreeAPI.loadDirectory(workspace.workspaceRoot);
                console.log('[App] Restored FileTree directory:', workspace.workspaceRoot);
              }
            } catch (error) {
              console.error('[App] Failed to restore FileTree directory:', error);
            }
          }, 100);
        }

        // Restore layout
        if (workspace.layout) {
          setShowGitPanel(workspace.layout.showGitPanel);
        }

        // Restore open files
        if (workspace.openFiles && workspace.openFiles.length > 0) {
          // Wait for Monaco and FileTree to be ready before hiding welcome
          setTimeout(async () => {
            try {
              const monacoAPI = (window as any).__monacoEditorAPI;
              const tabBarAPI = (window as any).__tabBarAPI;
              
              if (!monacoAPI || !tabBarAPI || !window.api?.readFile) {
                console.error('[App] APIs not ready for workspace restore');
                return;
              }
              
              let successfullyLoadedCount = 0;
              
              for (let i = 0; i < workspace.openFiles.length; i++) {
                const file = workspace.openFiles[i];
                if (!file || !file.filePath) {
                  console.warn('[App] Skipping invalid file in workspace:', file);
                  continue;
                }
                
                try {
                  // Read file content from disk
                  const content = await window.api.readFile(file.filePath);
                  const fileName = file.filePath.split(/[\\/]/).pop() || 'untitled';
                  
                  // Add tab
                  tabBarAPI.addTab({
                    id: `tab-${Date.now()}-${i}`,
                    type: 'file',
                    filePath: file.filePath,
                    fileName: fileName,
                    isDirty: false, // Always start clean on restore
                    content: content,
                    language: 'typescript',
                  });
                  
                  // Load into Monaco if this is the first file (will be active)
                  if (i === 0) {
                    monacoAPI.loadFile(file.filePath, content);
                    console.log('[App] Loaded first file into Monaco:', fileName);
                  }
                  
                  successfullyLoadedCount++;
                } catch (error) {
                  console.error('[App] Failed to restore file tab:', file.filePath, error);
                  // Continue with other files even if one fails
                }
              }
              
              // Only hide welcome screen if we successfully loaded at least one file
              if (successfullyLoadedCount > 0) {
                setShowWelcome(false);
                console.log('[App] Restored', successfullyLoadedCount, 'file tabs');
              } else {
                console.warn('[App] No files could be restored, keeping welcome screen');
              }
            } catch (error) {
              console.error('[App] Critical error during workspace file restoration:', error);
              // Don't crash the app, just log the error
            }
          }, 500);
        }

        // Restore terminals (don't recreate, just log)
        if (workspace.openTerminals && workspace.openTerminals.length > 0) {
          console.log('[App] Workspace had', workspace.openTerminals.length, 'terminals (not restored)');
        }

        // Restore nova prompts (don't recreate, just log)
        if (workspace.openNovaPrompts && workspace.openNovaPrompts.length > 0) {
          console.log('[App] Workspace had', workspace.openNovaPrompts.length, 'nova prompts (not restored)');
        }

        // Restore active tab
        if (workspace.activeTabId && workspace.openFiles.length > 0) {
          setActiveTab({
            id: workspace.activeTabId,
            type: workspace.activeTabType || 'file',
          });
        }

        console.log('[App] Workspace restored successfully');
      } catch (error) {
        console.error('[App] Failed to load workspace:', error);
      }
    };

    loadWorkspace();
  }, []); // Only run on mount

  // Menu command listener
  useEffect(() => {
    if (!window.api?.onMenuCommand) {
      console.warn('[App] Menu command API not available');
      return;
    }

    console.log('[App] Setting up menu command listener');

    window.api.onMenuCommand((command: string) => {
      console.log('[App] Menu command received:', command);
      handleMenuCommand(command);
    });

    return () => {
      if (window.api?.removeMenuCommandListener) {
        window.api.removeMenuCommandListener();
      }
    };
  }, []); // Only run on mount

  // Save workspace when state changes (debounced)
  useEffect(() => {
    const saveWorkspace = async () => {
      if (!window.api?.workspaceSave) {
        return;
      }

      try {
        const tabBarAPI = (window as any).__tabBarAPI;
        const tabs = tabBarAPI?.getTabs() || [];
        
        const openFiles = tabs
          .filter((t: any) => t.type === 'file')
          .map((t: any) => ({
            filePath: t.filePath,
            content: t.content,
            isDirty: t.isDirty,
          }));

        const openTerminals = terminalTabs.map(t => ({
          id: t.id,
          name: t.fileName,
        }));

        const openNovaPrompts = novaPromptTabs.map(t => ({
          id: t.id,
          name: t.fileName,
        }));

        const workspace = {
          workspaceRoot,
          openFiles,
          openTerminals,
          openNovaPrompts,
          activeTabId: activeTab?.id || null,
          activeTabType: activeTab?.type || null,
          layout: {
            showGitPanel,
          },
          lastSaved: new Date().toISOString(),
        };

        await window.api.workspaceSave(workspace);
        console.log('[App] Workspace saved');
      } catch (error) {
        console.error('[App] Failed to save workspace:', error);
      }
    };

    // Debounce workspace saving
    const timeoutId = setTimeout(() => {
      saveWorkspace();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [workspaceRoot, showGitPanel, activeTab, terminalTabs, novaPromptTabs]);

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
            type: 'file',
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
      if (!window.api?.saveFile) {
        console.error('[App] Save API not available');
        return;
      }

      try {
        // Get current file path and content from Monaco
        const monacoAPI = (window as any).__monacoEditorAPI;
        if (!monacoAPI) {
          console.error('[App] Monaco editor API not available');
          return;
        }

        const filePath = monacoAPI.getFilePath();
        if (!filePath) {
          console.log('[App] No file open, falling back to Save As');
          // Fall back to Save As if no file is open
          await actionContext.onSaveFileAs?.();
          return;
        }

        const content = monacoAPI.getValue();
        console.log('[App] Saving file:', filePath, 'size:', content.length, 'bytes');

        // Save file
        await window.api.saveFile(filePath, content);
        
        // Mark as saved
        monacoAPI.markAsSaved();
        
        // Update tab dirty state
        if ((window as any).__tabBarAPI) {
          const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
          (window as any).__tabBarAPI.updateTabDirty(filePath, false);
        }

        // Update status bar
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus(`Saved: ${filePath.split(/[\\/]/).pop()}`);
          
          // Clear status after 2 seconds
          setTimeout(() => {
            if ((window as any).__statusBarAPI) {
              (window as any).__statusBarAPI.setStatus('Ready');
            }
          }, 2000);
        }

        console.log('[App] File saved successfully');
      } catch (error) {
        console.error('[App] Failed to save file:', error);
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Save failed');
        }
      }
    },
    onSaveFileAs: async () => {
      console.log('[App] Save File As action triggered');
      if (!window.api?.saveFileAs) {
        console.error('[App] Save As API not available');
        return;
      }

      try {
        // Get current content from Monaco
        const monacoAPI = (window as any).__monacoEditorAPI;
        if (!monacoAPI) {
          console.error('[App] Monaco editor API not available');
          return;
        }

        const content = monacoAPI.getValue();
        console.log('[App] Save As with content size:', content.length, 'bytes');

        // Show save dialog and save
        const result = await window.api.saveFileAs(content);
        if (!result) {
          console.log('[App] Save As canceled');
          return;
        }

        console.log('[App] File saved as:', result.path);

        // Load the new file path in Monaco
        monacoAPI.loadFile(result.path, content);
        
        // Mark as saved
        monacoAPI.markAsSaved();
        
        // Update or create tab
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          const fileName = result.path.split(/[\\/]/).pop() || 'untitled';
          const currentTab = tabBarAPI.getActiveTab();
          
          // Check if current tab is an untitled buffer
          const isUntitled = currentTab && currentTab.filePath === '';
          
          if (isUntitled) {
            // Update the existing untitled tab
            const tabs = tabBarAPI.getTabs();
            const updatedTabs = tabs.map((tab: any) => 
              tab.id === currentTab.id 
                ? { ...tab, filePath: result.path, fileName: fileName, isDirty: false }
                : tab
            );
            
            // Force update by removing and re-adding
            tabBarAPI.removeTab(currentTab.id);
            tabBarAPI.addTab({
              id: currentTab.id,
              type: 'file',
              filePath: result.path,
              fileName: fileName,
              isDirty: false,
              content: content,
              language: result.path.endsWith('.ts') || result.path.endsWith('.tsx') ? 'typescript' : 
                        result.path.endsWith('.js') || result.path.endsWith('.jsx') ? 'javascript' : 'plaintext',
            });
            
            console.log('[App] Updated untitled tab to:', fileName);
          } else {
            // Create new tab for Save As on existing file
            tabBarAPI.addTab({
              id: `tab-${Date.now()}`,
              type: 'file',
              filePath: result.path,
              fileName: fileName,
              isDirty: false,
              content: content,
              language: result.path.endsWith('.ts') || result.path.endsWith('.tsx') ? 'typescript' : 
                        result.path.endsWith('.js') || result.path.endsWith('.jsx') ? 'javascript' : 'plaintext',
            });
            
            console.log('[App] Created new tab for Save As:', fileName);
          }
        }

        // Update status bar
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus(`Saved as: ${result.path.split(/[\\/]/).pop()}`);
        }

        console.log('[App] File saved as successfully');
      } catch (error) {
        console.error('[App] Failed to save file as:', error);
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Save failed');
        }
      }
    },
    onNovaPrompt: async () => {
      console.log('[App] Nova Prompt action triggered');
      
      try {
        // Generate prompt ID
        const promptId = `nova-prompt-${Date.now()}`;
        console.log('[App] Creating Nova Prompt tab:', promptId);

        // Hide welcome screen
        setShowWelcome(false);

        // Add nova prompt tab
        if ((window as any).__tabBarAPI) {
          (window as any).__tabBarAPI.addTab({
            id: promptId,
            type: 'nova-prompt',
            filePath: promptId,
            fileName: 'nova>',
            isDirty: false,
            content: '',
            language: 'plaintext',
          });
        }

        // Add to novaPromptTabs state
        setNovaPromptTabs((prev) => [...prev, { id: promptId, fileName: 'nova>' }]);
        console.log('[App] Added Nova Prompt to state:', promptId);

        // Switch to the new prompt tab
        setActiveTab({ id: promptId, type: 'nova-prompt' });

        // Update status bar
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Nova Prompt ready');
        }

        console.log('[App] Nova Prompt tab created successfully:', promptId);
      } catch (error) {
        console.error('[App] Failed to create Nova Prompt:', error);
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Failed to create Nova Prompt');
        }
      }
    },
    onNewTerminal: async () => {
      console.log('[App] New Terminal action triggered');
      
      if (!window.api?.terminalCreate) {
        console.error('[App] Terminal API not available');
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Terminal API not available');
        }
        return;
      }

      try {
        // Generate terminal ID (PTY will be created by Terminal component after measuring)
        const terminalId = `terminal-${Date.now()}`;
        console.log('[App] Preparing terminal tab:', terminalId);

        // Hide welcome screen
        setShowWelcome(false);

        // Add terminal tab - Terminal component will create PTY with correct dimensions
        if ((window as any).__tabBarAPI) {
          (window as any).__tabBarAPI.addTab({
            id: terminalId,
            type: 'terminal',
            filePath: terminalId,
            fileName: 'bash',
            isDirty: false,
            content: '',
            language: 'terminal',
          });
          
          // Add to terminal tabs state to trigger re-render
          setTerminalTabs(prev => [...prev, { id: terminalId, fileName: 'bash', workspaceRoot }]);
          console.log('[App] Added terminal to state:', terminalId);
          
          // Switch to terminal tab
          setActiveTab({ id: terminalId, type: 'terminal' });
          console.log('[App] Switched to terminal tab:', terminalId);
          
          // Focus the terminal after a short delay to ensure it's rendered
          setTimeout(() => {
            if ((window as any).__terminalAPI && (window as any).__terminalAPI[terminalId]) {
              console.log('[App] Focusing terminal:', terminalId);
              (window as any).__terminalAPI[terminalId].focus();
            }
          }, 100);
        }

        // Update status bar
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Terminal: bash');
        }

        console.log('[App] Terminal created successfully:', terminalId);
      } catch (error) {
        console.error('[App] Failed to create terminal:', error);
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus(`Terminal error: ${(error as Error).message}`);
        }
      }
    },
    onOpenSettings: () => {
      console.log('[App] Open Settings action triggered');
      if ((window as any).__settingsPanelAPI) {
        (window as any).__settingsPanelAPI.show();
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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+O: Open file
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        console.log('[App] Ctrl+O pressed, triggering open file');
        void actionContext.onOpenFile?.();
      }
      
      // Ctrl+S: Save file
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        console.log('[App] Ctrl+S pressed, triggering save');
        void actionContext.onSaveFile?.();
      }
      
      // Ctrl+D: Close file
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        console.log('[App] Ctrl+D pressed, triggering close file');
        
        // Close the active tab
        if ((window as any).__tabBarAPI) {
          const activeTab = (window as any).__tabBarAPI.getActiveTab();
          if (activeTab) {
            void (window as any).__tabBarAPI.removeTab(activeTab.id);
          }
        }
      }
      
      // Ctrl+R: Reload file from disk
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        console.log('[App] Ctrl+R pressed, triggering reload file');
        
        // Get current file path from Monaco
        const monacoAPI = (window as any).__monacoEditorAPI;
        if (monacoAPI && window.api?.readFile) {
          const filePath = monacoAPI.getFilePath();
          if (filePath) {
            window.api.readFile(filePath)
              .then((fileData) => {
                console.log('[App] File reloaded from disk:', filePath);
                monacoAPI.loadFile(filePath, fileData.content);
                monacoAPI.markAsSaved();
                
                // Update tab content - find the tab by filePath first
                if ((window as any).__tabBarAPI) {
                  const tabs = (window as any).__tabBarAPI.getTabs();
                  const matchingTab = tabs.find((t: any) => t.filePath === filePath);
                  if (matchingTab) {
                    (window as any).__tabBarAPI.updateTabContent(matchingTab.id, fileData.content);
                    (window as any).__tabBarAPI.updateTabDirty(filePath, false);
                  }
                }
                
                // Update status bar
                if ((window as any).__statusBarAPI) {
                  (window as any).__statusBarAPI.setStatus('File reloaded');
                  setTimeout(() => {
                    if ((window as any).__statusBarAPI) {
                      (window as any).__statusBarAPI.setStatus(`Editing: ${filePath.split(/[\\/]/).pop()}`);
                    }
                  }, 2000);
                }
              })
              .catch((error: Error) => {
                console.error('[App] Failed to reload file:', error);
                if ((window as any).__statusBarAPI) {
                  (window as any).__statusBarAPI.setStatus('Reload failed');
                }
              });
          } else {
            console.log('[App] No file open to reload');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [actionContext.onOpenFile, actionContext.onSaveFile]);

  // Handle menu commands
  const handleMenuCommand = useCallback(async (command: string) => {
    console.log('[App] Handling menu command:', command);
    
    // Map menu commands to action handlers
    switch (command) {
      case 'new-file':
        // Create a new untitled buffer
        {
          const fileName = `Untitled-${untitledCounter}`;
          const tabId = `untitled-${untitledCounter}-${Date.now()}`;
          
          // Add tab to TabBar
          if ((window as any).__tabBarAPI) {
            (window as any).__tabBarAPI.addTab({
              id: tabId,
              type: 'file',
              filePath: '', // Empty path indicates untitled file
              fileName: fileName,
              isDirty: false,
              content: '',
              language: 'plaintext',
            });
          }
          
          // Increment counter for next untitled file
          setUntitledCounter(prev => prev + 1);
          
          console.log('[App] Created new untitled buffer:', fileName);
        }
        break;
      case 'open-file':
        await actionContext.onOpenFile?.();
        break;
      case 'save':
        await actionContext.onSaveFile?.();
        break;
      case 'save-as':
        await actionContext.onSaveFileAs?.();
        break;
      case 'close-file':
        await actionContext.onCloseFile?.();
        break;
      case 'exit':
        window.api?.quit();
        break;
      case 'undo':
      case 'redo':
      case 'cut':
      case 'copy':
      case 'paste':
      case 'select-all':
        // These are handled by Monaco/Terminal directly
        console.log('[App] Editor command:', command);
        break;
      case 'toggle-word-wrap':
        // TODO: Implement word wrap toggle
        console.log('[App] Word wrap toggle not yet implemented');
        break;
      case 'toggle-line-numbers':
        // TODO: Implement line numbers toggle
        console.log('[App] Line numbers toggle not yet implemented');
        break;
      case 'increase-font-size':
      case 'decrease-font-size':
      case 'reset-font-size':
        // TODO: Implement font size controls
        console.log('[App] Font size control not yet implemented');
        break;
      case 'theme-light':
      case 'theme-dark':
      case 'theme-system':
        // TODO: Implement theme switching
        console.log('[App] Theme switching not yet implemented');
        break;
      case 'action-hud':
        (window as any).__actionHUDAPI?.toggle();
        break;
      case 'new-terminal':
        await actionContext.onNewTerminal?.();
        break;
      case 'nova-prompt':
        await actionContext.onNovaPrompt?.();
        break;
      case 'nova-agile':
        // TODO: Implement Nova Agile
        console.log('[App] Nova Agile not yet implemented');
        break;
      case 'command-palette':
        // TODO: Implement Command Palette
        console.log('[App] Command Palette not yet implemented');
        break;
      case 'about':
        // TODO: Implement About dialog
        console.log('[App] About dialog not yet implemented');
        break;
      case 'documentation':
        // Open documentation URL
        window.open('https://github.com/miranova-studios/nova', '_blank');
        break;
      case 'check-updates':
        // TODO: Implement update checker
        console.log('[App] Update checker not yet implemented');
        break;
      default:
        console.warn('[App] Unknown menu command:', command);
    }
  }, [actionContext, untitledCounter]);

  // Terminal data listener is set up globally at the top of this component (line 40)
  // Removed duplicate listener that was causing periodic redraws

  // Focus logic disabled - ActionHUD (Ctrl+K) is currently disabled
  // useEffect(() => {
  //   if (showWelcome && welcomeRef.current) {
  //     console.log('[App] Focusing welcome screen for keyboard shortcuts');
  //     welcomeRef.current.focus();
  //   }
  // }, [showWelcome, monacoReady]);

  // Welcome screen context menu handlers
  const handleWelcomeContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setWelcomeContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleWelcomeMenuClose = useCallback(() => {
    setWelcomeContextMenu(null);
  }, []);

  const handleQuit = useCallback(() => {
    console.log('[App] Quit action triggered');
    if (window.api?.quit) {
      window.api.quit();
    }
    setWelcomeContextMenu(null);
  }, []);

  // Memoize terminal callbacks to prevent unnecessary re-renders and periodic redraws
  // CRITICAL: These callbacks were being recreated inline on every render,
  // causing Terminal component's useEffect dependencies to change,
  // triggering refits and redraws every 5-10 seconds
  const handleTerminalData = useCallback(async (terminalId: string, data: string) => {
    if (window.api?.terminalWrite) {
      await window.api.terminalWrite(terminalId, data);
    }
  }, []);

  const handleTerminalResize = useCallback(async (terminalId: string, cols: number, rows: number) => {
    console.log(`[App] Terminal ${terminalId} resize: ${cols}x${rows}`);
    if (window.api?.terminalResize) {
      await window.api.terminalResize(terminalId, cols, rows);
    }
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (welcomeContextMenu) {
      const handleClick = () => setWelcomeContextMenu(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [welcomeContextMenu]);

  // Monaco loading is handled in index.tsx, just check if it's available
  useEffect(() => {
    // Check immediately if Monaco is available
    if (typeof (window as any).monaco !== 'undefined') {
      console.log('[App] Monaco is available');
      setMonacoReady(true);
    }
  }, []);

  return (
      <div className="nova-layout" style={styles.layout}>
        <TitleBar onCommand={handleMenuCommand} />
        
        <div style={styles.mainContent}>
          <aside style={styles.sidebar}>
            {/* Always render both components, but hide with CSS to preserve state */}
            <div style={{ display: showGitPanel ? 'none' : 'flex', flexDirection: 'column', height: '100%' }}>
              <FileTree
                onToggleGit={() => setShowGitPanel(!showGitPanel)}
                onNewTerminal={actionContext.onNewTerminal}
                onNovaPrompt={actionContext.onNovaPrompt}
                onDirectoryOpen={async (dirPath: string) => {
                  console.log('[App] Directory opened:', dirPath);
                  setWorkspaceRoot(dirPath);
                  
                  // Fetch git status for workspace
                  if (window.api?.gitGetStatus) {
                    try {
                      const status = await window.api.gitGetStatus(dirPath);
                      console.log('[App] Git status fetched:', status);
                      if (status.isRepo) {
                        setGitStatus(status);
                      } else {
                        setGitStatus(null);
                      }
                    } catch (error) {
                      console.error('[App] Failed to get git status:', error);
                      setGitStatus(null);
                    }
                  }
                }}
                onFileOpen={async (filePath: string) => {
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
                        type: 'file',
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
                }}
              />
            </div>
            
            <div style={{ display: showGitPanel ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
              <GitPanel
                workspaceRoot={workspaceRoot}
                onToggleFiles={() => setShowGitPanel(false)}
                onRefreshStatus={async () => {
                  if (!workspaceRoot || !window.api?.gitGetStatus) return;
                  try {
                    const status = await window.api.gitGetStatus(workspaceRoot);
                    if (status.isRepo) {
                      setGitStatus(status);
                    }
                  } catch (error) {
                    console.error('[App] Failed to refresh git status:', error);
                  }
                }}
              />
            </div>
          </aside>
          
          <main style={styles.editorArea}>
            <TabBar 
              onAllTabsClosed={() => {
                setShowWelcome(true);
                setActiveTab(null);
              }}
              onTabSwitch={(tab) => {
                console.log('[App] Tab switched to:', tab.fileName, 'type:', tab.type);
                setActiveTab({ id: tab.id, type: tab.type });
                
                if (tab.type === 'file') {
                  // Load the tab's content into Monaco
                  if ((window as any).__monacoEditorAPI) {
                    (window as any).__monacoEditorAPI.loadFile(tab.filePath, tab.content);
                  }
                  
                  // Update status bar
                  if ((window as any).__statusBarAPI) {
                    (window as any).__statusBarAPI.setStatus(`Editing: ${tab.fileName}`);
                  }
                } else if (tab.type === 'terminal') {
                  // Terminal component will handle focus via isActive prop
                  
                  // Update status bar for terminal
                  if ((window as any).__statusBarAPI) {
                    (window as any).__statusBarAPI.setStatus(`Terminal: ${tab.fileName}`);
                  }
                }
              }}
              onTabClose={async (tabId: string) => {
                // Get the tab to check its type
                if ((window as any).__tabBarAPI) {
                  const tabs = (window as any).__tabBarAPI.getTabs();
                  const tab = tabs.find((t: any) => t.id === tabId);
                  
                  if (tab && tab.type === 'terminal') {
                    // Kill terminal session
                    if (window.api?.terminalKill) {
                      await window.api.terminalKill(tab.filePath); // filePath is terminalId for terminals
                    }
                    
                    // Remove from terminal tabs state
                    setTerminalTabs(prev => prev.filter(t => t.id !== tabId));
                    console.log('[App] Removed terminal from state:', tabId);
                  }
                  
                  if (tab && tab.type === 'nova-prompt') {
                    // Remove from nova prompt tabs state
                    setNovaPromptTabs(prev => prev.filter(t => t.id !== tabId));
                    console.log('[App] Removed nova prompt from state:', tabId);
                  }
                  
                  // For file tabs, check if they're dirty (unsaved changes)
                  if (tab && tab.type === 'file' && tab.isDirty) {
                    // Show save prompt and wait for user decision
                    return new Promise<boolean>((resolve) => {
                      setSavePrompt({
                        show: true,
                        fileName: tab.fileName,
                        tabId: tabId,
                        resolve: resolve,
                      });
                    });
                  }
                }
                
                return true;
              }}
            />
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {showWelcome && !monacoReady ? (
                <div style={styles.welcome} onContextMenu={handleWelcomeContextMenu}>
                  <h1>Nova</h1>
                  <p>Loading editor...</p>
                </div>
              ) : showWelcome ? (
                <div style={styles.welcome} onContextMenu={handleWelcomeContextMenu}>
                  <h1>Nova</h1>
                  <p>Open a file to start editing</p>
                  <p style={{ fontSize: '0.85em', opacity: 0.5, marginTop: '20px' }}>
                    Right-click for options
                  </p>
                </div>
              ) : null}
              
              {/* Render all terminals (hidden when not active) to preserve state */}
              {terminalTabs.map((tab) => {
                // Create stable callback references for this specific terminal
                // Prevents Terminal useEffect from re-running on every parent render
                const terminalOnData = (data: string) => handleTerminalData(tab.id, data);
                const terminalOnResize = (cols: number, rows: number) => handleTerminalResize(tab.id, cols, rows);
                
                return (
                  <div
                    key={tab.id}
                    style={{ 
                      flex: 1, 
                      display: activeTab?.id === tab.id ? 'flex' : 'none',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      backgroundColor: '#1e1e1e',
                    }}
                  >
                    <Terminal 
                      terminalId={tab.id}
                      workspaceRoot={tab.workspaceRoot || undefined}
                      isActive={activeTab?.id === tab.id}
                      onData={terminalOnData}
                      onResize={terminalOnResize}
                    />
                  </div>
                );
              })}
              
              {/* Render all nova prompts (hidden when not active) to preserve state */}
              {novaPromptTabs.map((tab) => {
                return (
                  <div
                    key={tab.id}
                    style={{ 
                      flex: 1, 
                      display: activeTab?.id === tab.id ? 'flex' : 'none',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      backgroundColor: '#1e1e1e',
                    }}
                  >
                    <NovaPrompt 
                      promptId={tab.id}
                      isActive={activeTab?.id === tab.id}
                    />
                  </div>
                );
              })}
              
              {/* Monaco Editor */}
              <div style={{ 
                flex: 1, 
                display: activeTab?.type === 'file' && !showWelcome ? 'flex' : 'none',
                overflow: 'hidden',
              }}>
                <MonacoEditor 
                  onDirtyChange={(isDirty) => {
                    // Update the active tab's dirty state
                    if (activeTab && activeTab.type === 'file') {
                      const tabBarAPI = (window as any).__tabBarAPI;
                      if (tabBarAPI) {
                        tabBarAPI.updateTabDirty(activeTab.id, isDirty);
                        console.log('[App] Updated tab dirty state:', activeTab.id, isDirty);
                      }
                    }
                  }}
                />
              </div>
            </div>
          </main>
        </div>
        
        <StatusBar />
        
        {/* Modal components */}
        {/* ActionHUD disabled - Ctrl+K functionality not working reliably on startup */}
        <ActionHUD actions={actions} />
        <SettingsPanel />
        <DiagnosticsPanel />
        <RecoveryDialog />
        
        {/* Save prompt for unsaved changes */}
        {savePrompt.show && (
          <SavePrompt
            fileName={savePrompt.fileName}
            onSave={async () => {
              // Save the file
              const monacoAPI = (window as any).__monacoEditorAPI;
              if (monacoAPI && window.api?.saveFile) {
                const filePath = monacoAPI.getFilePath();
                if (filePath) {
                  const content = monacoAPI.getValue();
                  await window.api.saveFile(filePath, content);
                  monacoAPI.markAsSaved();
                  
                  // Update tab dirty state
                  if ((window as any).__tabBarAPI) {
                    (window as any).__tabBarAPI.updateTabDirty(savePrompt.tabId, false);
                  }
                }
              }
              
              // Resolve the promise to allow closing
              if (savePrompt.resolve) {
                savePrompt.resolve(true);
              }
              
              // Hide the prompt
              setSavePrompt({ show: false, fileName: '', tabId: '', resolve: null });
            }}
            onDiscard={() => {
              // Discard changes and close
              if (savePrompt.resolve) {
                savePrompt.resolve(true);
              }
              
              // Hide the prompt
              setSavePrompt({ show: false, fileName: '', tabId: '', resolve: null });
            }}
            onCancel={() => {
              // Don't close the tab
              if (savePrompt.resolve) {
                savePrompt.resolve(false);
              }
              
              // Hide the prompt
              setSavePrompt({ show: false, fileName: '', tabId: '', resolve: null });
            }}
          />
        )}
        
        {/* Welcome screen context menu */}
        {welcomeContextMenu && (
          <div
            style={{
              position: 'fixed',
              left: welcomeContextMenu.x,
              top: welcomeContextMenu.y,
              backgroundColor: '#252526',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              padding: '4px 0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 10000,
              minWidth: '180px',
            }}
          >
            <div
              onClick={() => {
                actionContext.onOpenFile?.();
                handleWelcomeMenuClose();
              }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#cccccc',
                fontSize: '13px',
                fontFamily: "'Segoe UI', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2d2e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              📁 Open File
            </div>
            <div
              onClick={() => {
                actionContext.onNewTerminal?.();
                handleWelcomeMenuClose();
              }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#cccccc',
                fontSize: '13px',
                fontFamily: "'Segoe UI', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2d2e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              💻 New Terminal
            </div>
            <div
              onClick={() => {
                actionContext.onNovaPrompt?.();
                handleWelcomeMenuClose();
              }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#cccccc',
                fontSize: '13px',
                fontFamily: "'Segoe UI', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2d2e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ▶️ Nova Prompt
            </div>
            <div
              onClick={() => {
                actionContext.onOpenSettings?.();
                handleWelcomeMenuClose();
              }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#cccccc',
                fontSize: '13px',
                fontFamily: "'Segoe UI', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2d2e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ⚙️ Settings
            </div>
            <div
              style={{
                height: '1px',
                backgroundColor: '#3e3e42',
                margin: '4px 0',
              }}
            />
            <div
              onClick={handleQuit}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#cccccc',
                fontSize: '13px',
                fontFamily: "'Segoe UI', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2d2e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              🚪 Quit
            </div>
          </div>
        )}
      </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppInner />
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
    outline: 'none', // No focus ring when focused for keyboard shortcuts
  },
};

