/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * App - Root React component
 * Main layout structure for Novi Editor
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { AppProvider, useAppContext } from '../contexts/AppContext.js';
import { TitleBar } from './TitleBar.js';
import { StatusBar } from './StatusBar.js';
import { TabBar } from './TabBar.js';
import { MonacoEditor } from './MonacoEditor.js';
import { ImageEditor } from './ImageEditor.js';
import { FileTree } from './FileTree.js';
import { GitPanel } from './GitPanel.js';
import { Terminal } from './Terminal.js';
import { NoviShell } from './NoviShell.js';
import { ActionHUD } from './ActionHUD.js';
import { SettingsPanel } from './SettingsPanel.js';
import { DiagnosticsPanel } from './DiagnosticsPanel.js';
import { RecoveryDialog } from './RecoveryDialog.js';
import { SavePrompt } from './SavePrompt.js';
import { createDefaultActions, ActionContext } from './actions.js';
import { ensureReady, waitForMultipleReady } from '../utils/ready-events.js';
import { isImageFile, getMimeType } from '../../core/image/image-utils.js';
import { parseNoviCommand } from '../utils/novi-command.js';

/** Convert Git Bash (MSYS) path to Windows path so Node/Electron can open the file (/c/Work/... -> C:\Work\...) */
function toWindowsPathIfNeeded(p: string): string {
  const m = p.match(/^\/([a-zA-Z])\/(.*)$/);
  if (m) return m[1].toUpperCase() + ':\\' + m[2].replace(/\//g, '\\');
  return p;
}


const AppInner: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [monacoReady, setMonacoReady] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<{ id: string; type: 'file' | 'image' | 'terminal' | 'novi-prompt'; filePath?: string } | null>(null);
  const [terminalTabs, setTerminalTabs] = useState<Array<{ id: string; fileName: string; workspaceRoot?: string | null }>>([]);
  const [noviPromptTabs, setNoviPromptTabs] = useState<Array<{ id: string; fileName: string }>>([]);
  const { setGitStatus } = useAppContext();
  
  // Context menu state for welcome screen
  const [welcomeContextMenu, setWelcomeContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  // Untitled file counter for new buffers
  const [untitledCounter, setUntitledCounter] = useState(1);
  
  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  
  // Help menu popups
  const [showAbout, setShowAbout] = useState(false);
  const [showCheckUpdates, setShowCheckUpdates] = useState(false);
  
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

  // Separate file tree per terminal/file tab (Task 7). When singleFileTree is true, use one tree like before.
  const [singleFileTree, setSingleFileTree] = useState<boolean>(true); // default true = current behavior until loaded
  const [terminalFileTreeRoots, setTerminalFileTreeRoots] = useState<Record<string, { cwd: string; overriddenRoot?: string }>>({});
  const [fileTabToTreeRoot, setFileTabToTreeRoot] = useState<Record<string, string>>({});
  const [fileTreeReportedRoot, setFileTreeReportedRoot] = useState<string | null>(null);

  // Refs for novi command handling (Task 8) — inspect command from PTY output after Enter, don't buffer input
  const terminalFileTreeRootsRef = useRef(terminalFileTreeRoots);
  const noviPromptTabsRef = useRef(noviPromptTabs);
  const onNoviPromptRef = useRef<(() => Promise<void>) | null>(null);
  // Track current line from PTY output; when we see a newline that line is the command we inspect for "novi ..."
  const commandLineBufferRef = useRef<Record<string, string>>({});
  useEffect(() => {
    terminalFileTreeRootsRef.current = terminalFileTreeRoots;
    noviPromptTabsRef.current = noviPromptTabs;
  }, [terminalFileTreeRoots, noviPromptTabs]);

  // Set up global terminal data listener (PTY output -> display; inspect first line after Enter for novi)
  useEffect(() => {
    if (!window.api?.terminalOnData || !window.api?.terminalRemoveDataListener) {
      console.warn('[App] Terminal API not available');
      return;
    }

    window.api.terminalRemoveDataListener();

    window.api.terminalOnData((terminalId: string, data: string) => {
      const buf = commandLineBufferRef.current;
      if (!buf[terminalId]) buf[terminalId] = '';
      buf[terminalId] += data;
      while (/\r|\n/.test(buf[terminalId])) {
        const firstNewline = buf[terminalId].search(/\r|\n/);
        const newlineLen = buf[terminalId].slice(firstNewline).match(/^\r\n|\r|\n/)?.[0]?.length ?? 1;
        let line = buf[terminalId].slice(0, firstNewline).trim().replace(/\r$/, '');
        buf[terminalId] = buf[terminalId].slice(firstNewline + newlineLen);
        // Line may include shell prompt (e.g. "user@host path novi README.md"); extract the novi command
        const noviIdx = line.indexOf('novi');
        if (noviIdx >= 0) {
          const fromNovi = line.slice(noviIdx).trim();
          if (fromNovi === 'novi' || fromNovi.startsWith('novi ')) line = fromNovi;
        }
        const novi = parseNoviCommand(line);
          if (novi.handled) {
            if (novi.kind === 'settings') {
              (async () => {
                try {
                  const vimode = await window.api?.getSetting<boolean>('vimode', true);
                  const compat = await window.api?.getSetting<boolean>('compat', false);
                  const singlefiletree = await window.api?.getSetting<boolean>('singlefiletree', false);
                  const lines = ['\r\n\x1b[36mCurrent settings:\x1b[0m', `  vimode         ${vimode ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`, `  compat         ${compat ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`, `  singlefiletree ${singlefiletree ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`, ''];
                  const terminalAPI = (window as any).__terminalAPI?.[terminalId];
                  if (terminalAPI?.write) lines.forEach((l) => terminalAPI.write(l + '\r\n'));
                } catch (_e) {
                  const terminalAPI = (window as any).__terminalAPI?.[terminalId];
                  if (terminalAPI?.write) terminalAPI.write('\r\n\x1b[31mFailed to read settings\x1b[0m\r\n');
                }
              })();
            } else if (novi.kind === 'shell') {
              const prompts = noviPromptTabsRef.current;
              if (prompts.length > 0) {
                setActiveTab({ id: prompts[0].id, type: 'novi-prompt', filePath: prompts[0].id });
                const tabBarAPI = (window as any).__tabBarAPI;
                if (tabBarAPI) tabBarAPI.setActiveTab(prompts[0].id);
                setShowWelcome(false);
              } else {
                void onNoviPromptRef.current?.();
              }
            } else if (novi.kind === 'open' && novi.path) {
              const cwd = terminalFileTreeRootsRef.current[terminalId]?.cwd || '';
              const sep = /\\/.test(cwd) ? '\\' : '/';
              const normalizedCwd = cwd.replace(/[/\\]+$/, '');
              let fullPath = /^[/\\]|^[A-Za-z]:/.test(novi.path) ? novi.path : (normalizedCwd ? normalizedCwd + sep + novi.path.replace(/^[/\\]+/, '') : novi.path);
              fullPath = toWindowsPathIfNeeded(fullPath);
              if (window.api?.readFile) {
                (async () => {
                  try {
                    setShowWelcome(false);
                    if (isImageFile(fullPath)) {
                      const tabBarAPI = (window as any).__tabBarAPI;
                      if (tabBarAPI) {
                        const tabId = `tab-${Date.now()}`;
                        tabBarAPI.addTab({ id: tabId, type: 'image', filePath: fullPath, fileName: fullPath.split(/[\\/]/).pop() || 'untitled', isDirty: false, content: '' });
                        setActiveTab({ id: tabId, type: 'image' });
                      }
                    } else {
                      const fileData = await window.api.readFile(fullPath);
                      if ((window as any).__monacoEditorAPI) (window as any).__monacoEditorAPI.loadFile(fullPath, fileData.content);
                      const tabBarAPI = (window as any).__tabBarAPI;
                      if (tabBarAPI) {
                        const tabId = `tab-${Date.now()}`;
                        tabBarAPI.addTab({ id: tabId, type: 'file', filePath: fullPath, fileName: fullPath.split(/[\\/]/).pop() || 'untitled', isDirty: false, content: fileData.content });
                        setActiveTab({ id: tabId, type: 'file' });
                      }
                    }
                    if ((window as any).__statusBarAPI) (window as any).__statusBarAPI.setStatus(`Editing: ${fullPath.split(/[\\/]/).pop()}`);
                  } catch (err) {
                    const terminalAPI = (window as any).__terminalAPI?.[terminalId];
                    if (terminalAPI?.write) terminalAPI.write(`\r\n\x1b[31mnovi: ${err instanceof Error ? err.message : String(err)}\x1b[0m\r\n`);
                  }
                })();
              }
            }
          }
      }
      const terminalAPI = (window as any).__terminalAPI?.[terminalId];
      if (terminalAPI?.write) terminalAPI.write(data);
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

  // Set up global terminal PWD listener to update tab titles
  useEffect(() => {
    if (!window.api?.terminalOnPwd || !window.api?.terminalRemovePwdListener) {
      console.warn('[App] Terminal PWD API not available');
      return;
    }

    console.log('[App] Setting up terminal PWD listener');
    
    // Remove any existing listeners first to prevent duplicates
    window.api.terminalRemovePwdListener();
    
    window.api.terminalOnPwd((terminalId: string, pwd: string) => {
      console.log('[App] Terminal', terminalId, 'PWD changed to:', pwd);
      setTerminalFileTreeRoots(prev => ({
        ...prev,
        [terminalId]: { ...prev[terminalId], cwd: pwd },
      }));
      const segments = pwd.replace(/\\/g, '/').split('/').filter(Boolean);
      const dirName = segments[segments.length - 1] || pwd;
      const tabBarAPI = (window as any).__tabBarAPI;
      if (tabBarAPI) {
        tabBarAPI.updateTabFileName(terminalId, `💻 ${dirName}/`);
      }
    });

    return () => {
      if (window.api?.terminalRemovePwdListener) {
        console.log('[App] Cleaning up terminal PWD listener');
        window.api.terminalRemovePwdListener();
      }
    };
  }, []);

  // Set up terminal initial CWD listener (so file tree shows CWD when switching to tab before first PWD)
  useEffect(() => {
    if (!window.api?.terminalOnInitialCwd || !window.api?.terminalRemoveInitialCwdListener) {
      return;
    }
    window.api.terminalRemoveInitialCwdListener();
    window.api.terminalOnInitialCwd((terminalId: string, cwd: string) => {
      console.log('[App] Terminal', terminalId, 'initial CWD:', cwd);
      setTerminalFileTreeRoots(prev => ({
        ...prev,
        [terminalId]: { ...prev[terminalId], cwd },
      }));
    });
    return () => {
      window.api?.terminalRemoveInitialCwdListener();
    };
  }, []);

  // Load singlefiletree setting (default false = separate file tree per terminal/tab)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!window.api?.getSetting) return;
      try {
        const value = await window.api.getSetting<boolean>('singlefiletree', false);
        if (!cancelled) setSingleFileTree(!!value);
      } catch {
        if (!cancelled) setSingleFileTree(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const handler = () => {
      window.api?.getSetting<boolean>('singlefiletree', false).then(setSingleFileTree);
    };
    window.addEventListener('novi-singlefiletree-changed', handler);
    return () => window.removeEventListener('novi-singlefiletree-changed', handler);
  }, []);

  // Load workspace on startup
  useEffect(() => {
    const loadWorkspace = async () => {
      if (!window.api?.workspaceLoad || !window.api?.getCommandLineArgs) {
        console.warn('[App] Workspace API not available');
        return;
      }

      // Check for --clean flag to skip workspace restoration
      const args = await window.api.getCommandLineArgs();
      if (args.includes('--clean')) {
        console.log('[App] --clean flag detected, skipping workspace restoration');
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
          
          // Wait for FileTree to be ready, then load the directory
          ensureReady('filetree-ready').then(() => {
            try {
              const fileTreeAPI = (window as any).__fileTreeAPI;
              if (fileTreeAPI && fileTreeAPI.loadDirectory) {
                fileTreeAPI.loadDirectory(workspace.workspaceRoot);
                console.log('[App] Restored FileTree directory:', workspace.workspaceRoot);
              }
            } catch (error) {
              console.error('[App] Failed to restore FileTree directory:', error);
            }
          }).catch(error => {
            console.error('[App] Timeout waiting for FileTree:', error);
          });
        }

        // Restore layout
        if (workspace.layout) {
          setShowGitPanel(workspace.layout.showGitPanel);
        }

        // Restore open files
        if (workspace.openFiles && workspace.openFiles.length > 0) {
          // Wait for Monaco and TabBar to be ready
          waitForMultipleReady(['monaco-ready', 'tabbar-ready']).then(async () => {
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
                  // Read file content from disk - readFile returns {path, content, size, modified}
                  const fileData = await window.api.readFile(file.filePath);
                  const fileName = file.filePath.split(/[\\/]/).pop() || 'untitled';
                  
                  // Add tab (but don't make it active - user will click to activate)
                  tabBarAPI.addTab({
                    id: `tab-${Date.now()}-${i}`,
                    type: 'file',
                    filePath: file.filePath,
                    fileName: fileName,
                    isDirty: false, // Always start clean on restore
                    content: fileData.content, // FIX: Use .content property from the returned object
                    language: 'typescript',
                  });
                  
                  // NOTE: Don't load into Monaco or set as active - show home screen instead
                  // User will click the tab to activate it
                  
                  successfullyLoadedCount++;
                } catch (error) {
                  console.error('[App] Failed to restore file tab:', file.filePath, error);
                  // Continue with other files even if one fails
                }
              }
              
              // If we have a saved active file tab, show it and load its content into Monaco
              const activeFileIndex = typeof workspace.activeFileIndex === 'number' ? workspace.activeFileIndex : -1;
              if (activeFileIndex >= 0 && activeFileIndex < successfullyLoadedCount) {
                const allTabs = tabBarAPI.getTabs();
                const restoredFileTabs = allTabs.filter((t: any) => t.type === 'file');
                const activeTabInfo = restoredFileTabs[activeFileIndex];
                if (activeTabInfo) {
                  setShowWelcome(false);
                  setActiveTab({ id: activeTabInfo.id, type: 'file' });
                  tabBarAPI.setActiveTab(activeTabInfo.id);
                  monacoAPI.loadFile(activeTabInfo.filePath, activeTabInfo.content);
                  if ((window as any).__statusBarAPI) {
                    (window as any).__statusBarAPI.setStatus(`Editing: ${activeTabInfo.fileName}`);
                  }
                  console.log('[App] Restored active file tab:', activeTabInfo.fileName);
                }
              } else {
                setShowWelcome(true);
                setActiveTab(null);
              }
              console.log('[App] Restored', successfullyLoadedCount, 'file tabs');
            } catch (error) {
              console.error('[App] Critical error during workspace file restoration:', error);
              // Don't crash the app, just log the error
            }
          }).catch(error => {
            console.error('[App] Timeout waiting for Monaco/TabBar:', error);
          });
        }

        // Restore image tabs
        if (workspace.openImages && workspace.openImages.length > 0) {
          // Wait for TabBar to be ready
          ensureReady('tabbar-ready').then(() => {
            try {
              const tabBarAPI = (window as any).__tabBarAPI;
              if (!tabBarAPI) {
                console.error('[App] TabBar API not ready for image restore');
                return;
              }
              
              for (let i = 0; i < workspace.openImages.length; i++) {
                const imageInfo = workspace.openImages[i];
                const imageId = `tab-${Date.now()}-image-${i}`;
                
                // Add image tab
                tabBarAPI.addTab({
                  id: imageId,
                  type: 'image',
                  filePath: imageInfo.filePath,
                  fileName: imageInfo.fileName,
                  isDirty: false,
                  content: '',
                  language: '',
                });
                
                console.log('[App] Restored image tab:', imageId, imageInfo.filePath);
              }
              
              console.log('[App] Restored', workspace.openImages.length, 'image tabs');
            } catch (error) {
              console.error('[App] Failed to restore images:', error);
            }
          }).catch(error => {
            console.error('[App] Timeout waiting for TabBar (images):', error);
          });
        }

        // Restore terminals
        if (workspace.openTerminals && workspace.openTerminals.length > 0) {
          // Wait for TabBar to be ready
          ensureReady('tabbar-ready').then(() => {
            try {
              const tabBarAPI = (window as any).__tabBarAPI;
              if (!tabBarAPI) {
                console.error('[App] TabBar API not ready for terminal restore');
                return;
              }
              
              for (const terminalInfo of workspace.openTerminals) {
                const terminalId = `terminal-${Date.now()}-${Math.random()}`;
                
                // Add terminal tab
                tabBarAPI.addTab({
                  id: terminalId,
                  type: 'terminal',
                  filePath: terminalId,
                  fileName: terminalInfo.name || 'bash',
                  isDirty: false,
                  content: '',
                  language: 'terminal',
                });
                
                // Add to terminal tabs state and initial file tree root (CWD will update on first PWD)
                setTerminalTabs(prev => [...prev, { id: terminalId, fileName: terminalInfo.name || 'bash', workspaceRoot }]);
                setTerminalFileTreeRoots(prev => ({ ...prev, [terminalId]: { cwd: workspace.workspaceRoot || '', overriddenRoot: undefined } }));
                console.log('[App] Restored terminal tab:', terminalId);
              }
              
              console.log('[App] Restored', workspace.openTerminals.length, 'terminal tabs');
            } catch (error) {
              console.error('[App] Failed to restore terminals:', error);
            }
          }).catch(error => {
            console.error('[App] Timeout waiting for TabBar (terminals):', error);
          });
        }

        // Restore novi prompts
        if (workspace.openNoviPrompts && workspace.openNoviPrompts.length > 0) {
          // Wait for TabBar to be ready
          ensureReady('tabbar-ready').then(() => {
            try {
              const tabBarAPI = (window as any).__tabBarAPI;
              if (!tabBarAPI) {
                console.error('[App] TabBar API not ready for novi prompt restore');
                return;
              }
              
              for (const promptInfo of workspace.openNoviPrompts) {
                const promptId = `novi-prompt-${Date.now()}-${Math.random()}`;
                
                // Add novi prompt tab
                tabBarAPI.addTab({
                  id: promptId,
                  type: 'novi-prompt',
                  filePath: promptId,
                  fileName: promptInfo.name || '⚙ novi>',
                  isDirty: false,
                  content: '',
                  language: 'plaintext',
                });
                
                // Add to novi prompt tabs state
                setNoviPromptTabs(prev => [...prev, { id: promptId, fileName: promptInfo.name || '⚙ novi>' }]);
                console.log('[App] Restored novi prompt tab:', promptId);
              }
              
              console.log('[App] Restored', workspace.openNoviPrompts.length, 'novi prompt tabs');
            } catch (error) {
              console.error('[App] Failed to restore novi prompts:', error);
            }
          }).catch(error => {
            console.error('[App] Timeout waiting for TabBar (novi prompts):', error);
          });
        }

        // Restore active tab for non-file types (file tab is restored in the file-restore callback)
        if (workspace.activeTabId && workspace.activeTabType !== 'file') {
          const hasAnyTabs = 
            (workspace.openTerminals && workspace.openTerminals.length > 0) ||
            (workspace.openNoviPrompts && workspace.openNoviPrompts.length > 0) ||
            (workspace.openImages && workspace.openImages.length > 0);
          if (hasAnyTabs) {
            setActiveTab({
              id: workspace.activeTabId,
              type: workspace.activeTabType || 'file',
            });
            console.log('[App] Restored active tab:', workspace.activeTabId, 'type:', workspace.activeTabType);
          }
        }

        console.log('[App] Workspace restored successfully');
        
        // Focus the active tab after restoration completes
        // Wait a bit to ensure all APIs are ready and tabs are rendered
        setTimeout(() => {
          const tabBarAPI = (window as any).__tabBarAPI;
          const monacoAPI = (window as any).__monacoEditorAPI;
          const terminalAPI = (window as any).__terminalAPI;
          
          if (tabBarAPI) {
            const activeTab = tabBarAPI.getActiveTab();
            if (activeTab) {
              console.log('[App] Setting focus to restored active tab:', activeTab.id, 'type:', activeTab.type);
              
              // Focus based on tab type
              if (activeTab.type === 'terminal' && terminalAPI && terminalAPI[activeTab.id]) {
                requestAnimationFrame(() => {
                  if (terminalAPI[activeTab.id]) {
                    terminalAPI[activeTab.id].focus();
                    console.log('[App] Focused terminal:', activeTab.id);
                  }
                });
              } else if (activeTab.type === 'file' && monacoAPI && monacoAPI.focus) {
                requestAnimationFrame(() => {
                  if (monacoAPI && monacoAPI.focus) {
                    monacoAPI.focus();
                    console.log('[App] Focused Monaco editor');
                  }
                });
              } else if ((activeTab.type === 'image' || activeTab.type === 'novi-prompt') && monacoAPI && monacoAPI.focus) {
                // For image/novi-prompt tabs, try Monaco as fallback
                requestAnimationFrame(() => {
                  if (monacoAPI && monacoAPI.focus) {
                    monacoAPI.focus();
                    console.log('[App] Focused Monaco (fallback for', activeTab.type, ')');
                  }
                });
              }
            } else {
              console.log('[App] No active tab to focus after restoration');
            }
          }
        }, 300); // 300ms delay to ensure all tabs are rendered
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
        
        const fileTabs = tabs.filter((t: any) => t.type === 'file');
        const openFiles = fileTabs.map((t: any) => ({
          filePath: t.filePath,
          content: t.content,
          isDirty: t.isDirty,
        }));
        const activeFileIndex = activeTab?.type === 'file' ? fileTabs.findIndex((t: any) => t.id === activeTab.id) : -1;

        const openImages = tabs
          .filter((t: any) => t.type === 'image')
          .map((t: any) => ({
            filePath: t.filePath,
            fileName: t.fileName,
          }));

        const openTerminals = terminalTabs.map(t => ({
          id: t.id,
          name: t.fileName,
        }));

        const openNoviPrompts = noviPromptTabs.map(t => ({
          id: t.id,
          name: t.fileName,
        }));

        const workspace = {
          workspaceRoot,
          openFiles,
          openImages,
          openTerminals,
          openNoviPrompts,
          activeTabId: activeTab?.id || null,
          activeTabType: activeTab?.type || null,
          activeFileIndex,
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
  }, [workspaceRoot, showGitPanel, activeTab, terminalTabs, noviPromptTabs]);

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

        // Hide welcome screen
        setShowWelcome(false);

        // Check if this is an image file
        if (isImageFile(filePath)) {
          const mimeType = getMimeType(filePath);
          console.log('[App] Image file detected:', filePath);
          console.log('[App] MIME type:', mimeType);

          // Add image tab
          if ((window as any).__tabBarAPI) {
            const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
            const tabId = `tab-${Date.now()}`;
            (window as any).__tabBarAPI.addTab({
              id: tabId,
              type: 'image',
              filePath: filePath,
              fileName: fileName,
              isDirty: false,
              content: '',
            });

            // Set as active tab with filePath
            setActiveTab({
              id: tabId,
              type: 'image',
              filePath: filePath,
            });
          }

          // Update status bar
          if ((window as any).__statusBarAPI) {
            (window as any).__statusBarAPI.setStatus(`Viewing: ${filePath.split(/[\\/]/).pop()}`);
          }

          console.log('[App] Image file opened successfully');
          return;
        }

        // For text files, read content and load into Monaco
        const fileData = await window.api.readFile(filePath);
        console.log('[App] File loaded, size:', fileData.content.length, 'bytes');

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
        
        // Update tab dirty state (use tab id, not file path)
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          const tab = tabBarAPI.getActiveTab();
          if (tab && tab.type === 'file' && tab.filePath === filePath) {
            tabBarAPI.updateTabDirty(tab.id, false);
          }
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
            
            // Explicitly update dirty state to false
            tabBarAPI.updateTabDirty(currentTab.id, false);
            
            console.log('[App] Updated untitled tab to:', fileName);
          } else {
            // Create new tab for Save As on existing file
            const newTabId = `tab-${Date.now()}`;
            tabBarAPI.addTab({
              id: newTabId,
              type: 'file',
              filePath: result.path,
              fileName: fileName,
              isDirty: false,
              content: content,
              language: result.path.endsWith('.ts') || result.path.endsWith('.tsx') ? 'typescript' : 
                        result.path.endsWith('.js') || result.path.endsWith('.jsx') ? 'javascript' : 'plaintext',
            });
            
            // Explicitly update dirty state to false
            tabBarAPI.updateTabDirty(newTabId, false);
            
            console.log('[App] Created new tab for Save As:', fileName);
          }
        }

        // Refresh FileTree to show the newly saved file
        const fileTreeAPI = (window as any).__fileTreeAPI;
        if (fileTreeAPI && fileTreeAPI.refresh) {
          console.log('[App] Refreshing FileTree after save');
          fileTreeAPI.refresh();
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
    onCloseFile: async () => {
      const tabBarAPI = (window as any).__tabBarAPI;
      if (!tabBarAPI) return;
      const tab = tabBarAPI.getActiveTab();
      if (!tab || tab.type !== 'file') return;
      await tabBarAPI.removeTab(tab.id);
    },
    onNoviPrompt: async () => {
      console.log('[App] Novi Shell action triggered');
      
      try {
        const tabBarAPI = (window as any).__tabBarAPI;
        if (!tabBarAPI) {
          console.error('[App] TabBar API not available');
          return;
        }

        // Check if a Novi Shell tab already exists
        const existingTab = tabBarAPI.getTabs?.().find((t: any) => t.type === 'novi-prompt');
        
        if (existingTab) {
          // Focus the existing Novi Shell tab instead of creating a new one
          console.log('[App] Novi Shell tab already exists, focusing:', existingTab.id);
          tabBarAPI.switchTab(existingTab.id);
          setActiveTab({ id: existingTab.id, type: 'novi-prompt' });
          setShowWelcome(false);
          return;
        }

        // Generate prompt ID for new tab
        const promptId = `novi-prompt-${Date.now()}`;
        console.log('[App] Creating Novi Shell tab:', promptId);

        // Hide welcome screen
        setShowWelcome(false);

        // Add novi prompt tab
        tabBarAPI.addTab({
          id: promptId,
          type: 'novi-prompt',
          filePath: promptId,
          fileName: '⚙ novi>',
          isDirty: false,
          content: '',
          language: 'plaintext',
        });

        // Add to noviPromptTabs state
        setNoviPromptTabs((prev) => [...prev, { id: promptId, fileName: '⚙ novi>' }]);
        console.log('[App] Added Novi Shell to state:', promptId);

        // Switch to the new prompt tab
        setActiveTab({ id: promptId, type: 'novi-prompt' });

        // Update status bar
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Novi Shell ready');
        }

        console.log('[App] Novi Shell tab created successfully:', promptId);
      } catch (error) {
        console.error('[App] Failed to create Novi Shell:', error);
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Failed to create Novi Shell');
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
            fileName: '💻 bash',
            isDirty: false,
            content: '',
            language: 'terminal',
          });
          
          // Add to terminal tabs state and initial file tree root (CWD will update on first PWD)
          setTerminalTabs(prev => [...prev, { id: terminalId, fileName: '💻 bash', workspaceRoot }]);
          setTerminalFileTreeRoots(prev => ({ ...prev, [terminalId]: { cwd: workspaceRoot || '', overriddenRoot: undefined } }));
          console.log('[App] Added terminal to state:', terminalId);
          
          // Switch to terminal tab
          setActiveTab({ id: terminalId, type: 'terminal' });
          console.log('[App] Switched to terminal tab:', terminalId);
          
          // Terminal will focus itself when it becomes active via its ResizeObserver
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
    onGitRefresh: async () => {
      console.log('[App] Git Refresh action triggered (Ctrl+Shift+G)');
      if (!workspaceRoot || !window.api?.gitManualRefresh) {
        console.error('[App] Git refresh not available');
        return;
      }
      
      try {
        console.log('[App] Refreshing git status for:', workspaceRoot);
        const status = await window.api.gitManualRefresh(workspaceRoot);
        setGitStatus(status);
        
        // Update status bar
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Git status refreshed');
          setTimeout(() => {
            if ((window as any).__statusBarAPI) {
              (window as any).__statusBarAPI.setStatus('Ready');
            }
          }, 2000);
        }
        
        console.log('[App] Git status refreshed successfully');
      } catch (error) {
        console.error('[App] Failed to refresh git status:', error);
        if ((window as any).__statusBarAPI) {
          (window as any).__statusBarAPI.setStatus('Git refresh failed');
        }
      }
    },
  }), [workspaceRoot]);

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
                    (window as any).__tabBarAPI.updateTabDirty(matchingTab.id, false);
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
      
      // Ctrl+Shift+G: Refresh Git Status
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        console.log('[App] Ctrl+Shift+G pressed, triggering git refresh');
        void actionContext.onGitRefresh?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [actionContext.onOpenFile, actionContext.onSaveFile, actionContext.onGitRefresh]);

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
          
          // Hide welcome screen
          setShowWelcome(false);
          
          // Add tab to TabBar
          if ((window as any).__tabBarAPI) {
            (window as any).__tabBarAPI.addTab({
              id: tabId,
              type: 'file',
              filePath: '', // Empty path indicates untitled file
              fileName: fileName,
              isDirty: true, // Mark as dirty since it's a new unsaved file
              content: '',
              language: 'plaintext',
            });
            
            // Set as active tab
            setActiveTab({
              id: tabId,
              type: 'file',
              filePath: '',
              fileName: fileName,
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
      case 'close-terminal':
        // Close the active terminal tab
        if (activeTab && activeTab.type === 'terminal') {
          const tabBarAPI = (window as any).__tabBarAPI;
          if (tabBarAPI) {
            tabBarAPI.closeTab(activeTab.id);
          }
        }
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
      case 'novi-prompt':
        await actionContext.onNoviPrompt?.();
        break;
      case 'command-palette':
        // TODO: Implement Command Palette
        console.log('[App] Command Palette not yet implemented');
        break;
      case 'reset-workspace':
        {
          console.log('[App] Resetting workspace');
          
          // Get all tabs
          const tabBarAPI = (window as any).__tabBarAPI;
          if (!tabBarAPI) {
            console.warn('[App] TabBar API not available');
            break;
          }
          
          const allTabs = tabBarAPI.getTabs();
          
          // Check for any dirty tabs
          const dirtyTabs = allTabs.filter((tab: any) => tab.type === 'file' && tab.isDirty);
          
          if (dirtyTabs.length > 0) {
            // Prompt user to save each dirty file
            for (const tab of dirtyTabs) {
              const shouldSave = await new Promise<boolean>((resolve) => {
                setSavePrompt({
                  show: true,
                  fileName: tab.fileName,
                  tabId: tab.id,
                  resolve,
                });
              });
              
              if (shouldSave) {
                // Save the file
                const monacoEditorAPI = (window as any).__monacoEditorAPI;
                if (monacoEditorAPI) {
                  const content = monacoEditorAPI.getValue();
                  if (tab.filePath) {
                    await window.api?.writeFile(tab.filePath, content);
                    console.log('[App] Saved file:', tab.filePath);
                  }
                }
              }
            }
          }
          
          // Stop Git watching if active
          if (window.api?.gitStopWatching) {
            await window.api.gitStopWatching();
          }
          
          // Hide Git panel and close file tree
          setShowGitPanel(false);
          setWorkspaceRoot(null);
          
          // Reset FileTree internal state
          const fileTreeAPI = (window as any).__fileTreeAPI;
          if (fileTreeAPI?.reset) {
            fileTreeAPI.reset();
            console.log('[App] FileTree reset');
          }
          
          // Close all tabs
          for (const tab of allTabs) {
            tabBarAPI.removeTab(tab.id);
          }
          
          // Clear terminal and novi prompt tabs state
          setTerminalTabs([]);
          setNoviPromptTabs([]);
          setActiveTab(null);
          
          // Clear Git status
          setGitStatus(null);
          
          // Show welcome screen and clear status bar path
          setShowWelcome(true);
          setFileTreeReportedRoot(null);
          
          if ((window as any).__statusBarAPI) {
            (window as any).__statusBarAPI.setStatus('Ready');
          }
          
          console.log('[App] Workspace reset complete');
        }
        break;
      case 'find':
      case 'replace':
        // Monaco handles find/replace internally via Ctrl+F and Ctrl+H
        console.log('[App] Find/Replace handled by Monaco');
        break;
      case 'toggle-fullscreen':
        window.api?.toggleFullScreen?.();
        break;
      case 'zoom-in':
        window.api?.zoomIn?.();
        break;
      case 'zoom-out':
        window.api?.zoomOut?.();
        break;
      case 'zoom-reset':
        window.api?.zoomReset?.();
        break;
      case 'toggle-devtools':
        window.api?.toggleDevTools?.();
        break;
      case 'debug':
        // TODO: Implement debug panel
        console.log('[App] Debug panel not yet implemented');
        break;
      case 'report-issue':
        // Open GitHub issues URL
        window.open('https://github.com/miranova-studios/nova/issues', '_blank');
        break;
      case 'about':
        setShowAbout(true);
        break;
      case 'documentation':
        // Open documentation URL
        window.open('https://lyric-lang.org/novi.html', '_blank');
        break;
      case 'check-updates':
        setShowCheckUpdates(true);
        break;
      default:
        console.warn('[App] Unknown menu command:', command);
    }
  }, [actionContext, untitledCounter, setTerminalTabs, setNoviPromptTabs, setActiveTab, setWorkspaceRoot, setShowWelcome, setSavePrompt, setShowGitPanel, setGitStatus]);

  // Expose action API globally for components that can't access context
  useEffect(() => {
    (window as any).__actionAPI = {
      onNewTerminal: actionContext.onNewTerminal,
    };
    onNoviPromptRef.current = actionContext.onNoviPrompt ?? null;
    return () => {
      delete (window as any).__actionAPI;
    };
  }, [actionContext]);

  // File tree root to display. When a terminal tab is active, always show that terminal's CWD so file tree stays in sync.
  const currentFileTreeDisplayRoot = useMemo(() => {
    if (activeTab?.type === 'terminal') {
      const t = terminalFileTreeRoots[activeTab.id];
      const cwd = (t?.overriddenRoot ?? t?.cwd) ?? workspaceRoot ?? '';
      return cwd || workspaceRoot;
    }
    if (singleFileTree || !workspaceRoot) return workspaceRoot;
    if (activeTab?.type === 'file' || activeTab?.type === 'image') {
      return fileTabToTreeRoot[activeTab.id] || workspaceRoot;
    }
    return workspaceRoot;
  }, [singleFileTree, workspaceRoot, activeTab, terminalFileTreeRoots, fileTabToTreeRoot]);

  // Ctrl+Tab keybinding to cycle through tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab to cycle forward, Ctrl+Shift+Tab to cycle backward
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        
        const tabBarAPI = (window as any).__tabBarAPI;
        if (!tabBarAPI) return;
        
        const tabs = tabBarAPI.getTabs();
        if (tabs.length <= 1) return; // Need at least 2 tabs to cycle
        
        const currentIndex = tabs.findIndex((t: any) => t.id === activeTab?.id);
        let nextIndex: number;
        
        if (e.shiftKey) {
          // Cycle backward
          nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
        } else {
          // Cycle forward
          nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1;
        }
        
        const nextTab = tabs[nextIndex];
        if (nextTab) {
          console.log('[App] Ctrl+Tab: Switching to tab:', nextTab.fileName, 'type:', nextTab.type);
          setActiveTab({ 
            id: nextTab.id, 
            type: nextTab.type,
            filePath: (nextTab.type === 'image' || nextTab.type === 'novi-prompt') ? nextTab.filePath : undefined
          });
          tabBarAPI.setActiveTab(nextTab.id);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

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

  // Handle sidebar resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(150, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Memoize terminal callbacks to prevent unnecessary re-renders and periodic redraws
  // CRITICAL: These callbacks were being recreated inline on every render,
  // causing Terminal component's useEffect dependencies to change,
  // triggering refits and redraws every 5-10 seconds
  // Task 8: Forward all input to the PTY (Ctrl+C, Tab, etc. work). After Enter we inspect PTY output for "novi ...".
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

  // Handle sidebar resize mouse events
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(150, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
      <div className="novi-layout" style={styles.layout}>
        <TitleBar onCommand={handleMenuCommand} />
        
        <div style={styles.mainContent}>
          <aside style={{ ...styles.sidebar, width: `${sidebarWidth}px`, flexShrink: 0 }}>
            {/* Always render both components, but hide with CSS to preserve state */}
            <div style={{ display: showGitPanel ? 'none' : 'flex', flexDirection: 'column', height: '100%' }}>
              <FileTree
                onToggleGit={() => setShowGitPanel(!showGitPanel)}
                onNewTerminal={actionContext.onNewTerminal}
                onNoviPrompt={actionContext.onNoviPrompt}
                displayRoot={currentFileTreeDisplayRoot}
                isTerminalTree={!singleFileTree && activeTab?.type === 'terminal'}
                onRootChange={setFileTreeReportedRoot}
                onDirectoryOpen={async (dirPath: string) => {
                  console.log('[App] Directory opened:', dirPath);
                  if (singleFileTree) {
                    setWorkspaceRoot(dirPath);
                  } else if (activeTab?.type === 'terminal') {
                    setTerminalFileTreeRoots(prev => ({
                      ...prev,
                      [activeTab.id]: { ...prev[activeTab.id], cwd: prev[activeTab.id]?.cwd ?? '', overriddenRoot: dirPath },
                    }));
                  } else if (activeTab?.type === 'file' || activeTab?.type === 'image') {
                    setFileTabToTreeRoot(prev => ({ ...prev, [activeTab.id]: dirPath }));
                  } else {
                    setWorkspaceRoot(dirPath);
                  }
                  if (singleFileTree || !activeTab || activeTab.type === 'novi-prompt') {
                    if (window.api?.gitGetStatus) {
                      try {
                        const status = await window.api.gitGetStatus(dirPath);
                        if (status.isRepo) setGitStatus(status);
                        else setGitStatus(null);
                      } catch (error) {
                        console.error('[App] Failed to get git status:', error);
                        setGitStatus(null);
                      }
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
                    // Hide welcome screen
                    setShowWelcome(false);

                    // Check if this is an image file
                    if (isImageFile(filePath)) {
                      const mimeType = getMimeType(filePath);
                      console.log('[App] Image file detected from tree:', filePath);
                      console.log('[App] MIME type:', mimeType);

                      // Add image tab and associate current file tree root with this tab
                      if ((window as any).__tabBarAPI) {
                        const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
                        const tabId = `tab-${Date.now()}`;
                        (window as any).__tabBarAPI.addTab({
                          id: tabId,
                          type: 'image',
                          filePath: filePath,
                          fileName: fileName,
                          isDirty: false,
                          content: '',
                        });
                        if (currentFileTreeDisplayRoot) {
                          setFileTabToTreeRoot(prev => ({ ...prev, [tabId]: currentFileTreeDisplayRoot }));
                        }
                        setActiveTab({
                          id: tabId,
                          type: 'image',
                        });
                      }

                      // Update status bar
                      if ((window as any).__statusBarAPI) {
                        (window as any).__statusBarAPI.setStatus(`Viewing: ${filePath.split(/[\\/]/).pop()}`);
                      }

                      console.log('[App] Image file opened from tree successfully');
                      return;
                    }

                    // For text files, read content and load into Monaco
                    const fileData = await window.api.readFile(filePath);
                    console.log('[App] File loaded from tree, size:', fileData.content.length, 'bytes');

                    // Load into Monaco editor
                    if ((window as any).__monacoEditorAPI) {
                      (window as any).__monacoEditorAPI.loadFile(filePath, fileData.content);
                    }

                    // Add tab and associate current file tree root with this tab
                    if ((window as any).__tabBarAPI) {
                      const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
                      const tabId = `tab-${Date.now()}`;
                      (window as any).__tabBarAPI.addTab({
                        id: tabId,
                        type: 'file',
                        filePath: filePath,
                        fileName: fileName,
                        isDirty: false,
                        content: fileData.content,
                        language: 'typescript', // Will be auto-detected by Monaco
                      });
                      if (currentFileTreeDisplayRoot) {
                        setFileTabToTreeRoot(prev => ({ ...prev, [tabId]: currentFileTreeDisplayRoot }));
                      }
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
          
          {/* Resizable divider */}
          <div
            style={{
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: isResizing ? '#007acc' : 'transparent',
              transition: isResizing ? 'none' : 'background-color 0.2s',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            onMouseEnter={(e) => {
              if (!isResizing) e.currentTarget.style.backgroundColor = '#3e3e42';
            }}
            onMouseLeave={(e) => {
              if (!isResizing) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          />
          
          <main style={styles.editorArea}>
            <TabBar 
              onAllTabsClosed={() => {
                setShowWelcome(true);
                setActiveTab(null);
              }}
              onTabSwitch={(tab) => {
                console.log('[App] Tab switched to:', tab.fileName, 'type:', tab.type);
                setActiveTab({ 
                  id: tab.id, 
                  type: tab.type,
                  filePath: (tab.type === 'image' || tab.type === 'novi-prompt') ? tab.filePath : undefined
                });
                
                // Hide welcome screen when a tab is clicked
                setShowWelcome(false);
                
                if (tab.type === 'file') {
                  // Load the tab's content into Monaco
                  if ((window as any).__monacoEditorAPI) {
                    (window as any).__monacoEditorAPI.loadFile(tab.filePath, tab.content);
                  }
                  
                  // Update status bar
                  if ((window as any).__statusBarAPI) {
                    (window as any).__statusBarAPI.setStatus(`Editing: ${tab.fileName}`);
                  }
                } else if (tab.type === 'image') {
                  // Update status bar for image
                  if ((window as any).__statusBarAPI) {
                    (window as any).__statusBarAPI.setStatus(`Viewing: ${tab.fileName}`);
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
                    setTerminalTabs(prev => prev.filter(t => t.id !== tabId));
                    setTerminalFileTreeRoots(prev => { const next = { ...prev }; delete next[tabId]; return next; });
                    console.log('[App] Removed terminal from state:', tabId);
                  }
                  
                  if (tab && tab.type === 'novi-prompt') {
                    setNoviPromptTabs(prev => prev.filter(t => t.id !== tabId));
                    console.log('[App] Removed novi prompt from state:', tabId);
                  }
                  
                  if (tab && (tab.type === 'file' || tab.type === 'image')) {
                    setFileTabToTreeRoot(prev => { const next = { ...prev }; delete next[tabId]; return next; });
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
                  <h1>Novi</h1>
                  <p>Loading editor...</p>
                </div>
              ) : showWelcome ? (
                <div style={styles.welcome} onContextMenu={handleWelcomeContextMenu}>
                  <h1>Novi</h1>
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
                      onNewTerminal={actionContext.onNewTerminal}
                    />
                  </div>
                );
              })}
              
              {/* Render all novi prompts (hidden when not active) to preserve state */}
              {noviPromptTabs.map((tab) => {
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
                    <NoviShell 
                      promptId={tab.id}
                      isActive={activeTab?.id === tab.id}
                      onClose={() => {
                        const tabBarAPI = (window as any).__tabBarAPI;
                        if (tabBarAPI) tabBarAPI.closeTab(tab.id);
                      }}
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

              {/* Image Editor */}
              <div style={{ 
                flex: 1, 
                display: activeTab?.type === 'image' && !showWelcome ? 'flex' : 'none',
                overflow: 'hidden',
              }}>
                {activeTab?.type === 'image' && (() => {
                  // If activeTab has filePath (from newly opened image), use it directly
                  if (activeTab.filePath) {
                    console.log('[App] Rendering ImageEditor with filePath from activeTab:', activeTab.filePath);
                    return <ImageEditor filePath={activeTab.filePath} />;
                  }
                  
                  // Otherwise, look up the tab in TabBar (for restored images)
                  const tabBarAPI = (window as any).__tabBarAPI;
                  if (!tabBarAPI) {
                    console.warn('[App] TabBar API not available for ImageEditor');
                    return null;
                  }
                  
                  const tabs = tabBarAPI.getTabs() || [];
                  const currentTab = tabs.find((t: any) => t.id === activeTab.id);
                  
                  console.log('[App] Looking up image tab in TabBar:');
                  console.log('  - activeTab.id:', activeTab.id);
                  console.log('  - tabs count:', tabs.length);
                  console.log('  - tabs IDs:', tabs.map((t: any) => ({ id: t.id, type: t.type, path: t.filePath })));
                  console.log('  - currentTab:', currentTab);
                  
                  if (!currentTab) {
                    console.error('[App] Cannot find image tab with ID:', activeTab.id);
                    return null;
                  }
                  
                  if (!currentTab.filePath) {
                    console.error('[App] Image tab has no filePath:', currentTab);
                    return null;
                  }
                  
                  return <ImageEditor filePath={currentTab.filePath} />;
                })()}
              </div>
            </div>
          </main>
        </div>
        
        <StatusBar fileTreePath={fileTreeReportedRoot} />
        
        {/* Modal components */}
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
        
        {/* About Novi popup */}
        {showAbout && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
            }}
            onClick={() => setShowAbout(false)}
          >
            <div
              style={{
                backgroundColor: '#252526',
                border: '1px solid #3e3e42',
                borderRadius: '8px',
                padding: '32px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                minWidth: '400px',
                textAlign: 'center' as const,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 16px 0', color: '#cccccc', fontSize: '24px' }}>Novi Editor</h2>
              <p style={{ margin: '8px 0', color: '#cccccc', fontSize: '14px' }}>Version 0.6.6-dev</p>
              <p style={{ margin: '16px 0 24px 0', color: '#999', fontSize: '12px' }}>© 2026 MiraNova Studios</p>
              <button
                style={{
                  backgroundColor: '#007acc',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 24px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: "'Segoe UI', sans-serif",
                }}
                onClick={() => setShowAbout(false)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007acc'}
              >
                OK
              </button>
            </div>
          </div>
        )}
        
        {/* Check for Updates popup */}
        {showCheckUpdates && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
            }}
            onClick={() => setShowCheckUpdates(false)}
          >
            <div
              style={{
                backgroundColor: '#252526',
                border: '1px solid #3e3e42',
                borderRadius: '8px',
                padding: '32px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                minWidth: '400px',
                textAlign: 'center' as const,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 16px 0', color: '#cccccc', fontSize: '20px' }}>Check for Updates</h2>
              <p style={{ margin: '16px 0 24px 0', color: '#cccccc', fontSize: '14px' }}>This feature is not yet implemented.</p>
              <button
                style={{
                  backgroundColor: '#007acc',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 24px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: "'Segoe UI', sans-serif",
                }}
                onClick={() => setShowCheckUpdates(false)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007acc'}
              >
                OK
              </button>
            </div>
          </div>
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
                actionContext.onNoviPrompt?.();
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
              ▶️ Novi Shell
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

