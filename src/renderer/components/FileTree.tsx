/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * FileTree - Interactive File System Browser (React)
 * Supports create, rename, delete, and context menus
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAppContext } from '../contexts/AppContext.js';
import { markReady } from '../utils/ready-events.js';

export interface FileTreeProps {
  onFileOpen?: (filePath: string) => void;
  onToggleGit?: () => void;
  showGitToggle?: boolean;
  onDirectoryOpen?: (dirPath: string) => void;
  onNewTerminal?: () => void;
  onNoviPrompt?: () => void;
  initialPath?: string; // Auto-load this directory on mount
  /** When set, file tree root is controlled by parent (e.g. per-terminal CWD). Updates when this prop changes. */
  displayRoot?: string | null;
  /** When true, style the root directory name in the header as terminal-tied (green). */
  isTerminalTree?: boolean;
  /** Called whenever the file tree root path changes (so status bar can show it). */
  onRootChange?: (path: string | null) => void;
  hideHeader?: boolean; // Hide the header (for use in split view)
  /** If true (default), this tree drives the global file watcher. Set false for split-view trees to avoid flicker. */
  driveFileWatcher?: boolean;
  /** Whether to show the Open Folder button. Defaults to true. */
  showOpenFolder?: boolean;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isLoaded?: boolean;
}

interface ContextMenu {
  x: number;
  y: number;
  node: FileNode | null;
}

interface FileTreeContextValue {
  expandedDirs: Set<string>;
  toggleDirectory: (node: FileNode) => Promise<void>;
  handleFileClick: (node: FileNode) => void;
  handleContextMenu: (e: React.MouseEvent, node: FileNode | null) => void;
}

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

export const FileTree: React.FC<FileTreeProps> = ({ onFileOpen, onToggleGit, showGitToggle = true, onDirectoryOpen, onNewTerminal, onNoviPrompt, initialPath, displayRoot, isTerminalTree = false, onRootChange, hideHeader = false, driveFileWatcher = true, showOpenFolder = true }) => {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const onRootChangeRef = React.useRef(onRootChange);
  onRootChangeRef.current = onRootChange;
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [newFileInput, setNewFileInput] = useState<{ parentPath: string; parentNode: FileNode | null } | null>(null);
  const [newFolderInput, setNewFolderInput] = useState<{ parentPath: string; parentNode: FileNode | null } | null>(null);
  const { gitStatus } = useAppContext();
  
  // Use a ref to track expandedDirs so the file watcher event handler always has the current value
  const expandedDirsRef = React.useRef<Set<string>>(expandedDirs);
  React.useEffect(() => {
    expandedDirsRef.current = expandedDirs;
  }, [expandedDirs]);

  // Notify parent whenever root path changes (for status bar)
  useEffect(() => {
    onRootChangeRef.current?.(rootPath);
  }, [rootPath]);

  // When parent controls root via displayRoot (e.g. per-terminal CWD), sync and load
  useEffect(() => {
    if (displayRoot && displayRoot !== rootPath) {
      console.log('[FileTree] Display root changed to:', displayRoot);
      setRootPath(displayRoot);
      loadDirectory(displayRoot);
    }
  }, [displayRoot]);

  // Auto-load initial path if provided (only when displayRoot is not controlling)
  useEffect(() => {
    if (initialPath && !rootPath && (displayRoot === undefined || displayRoot === null)) {
      console.log('[FileTree] Auto-loading initial path:', initialPath);
      setRootPath(initialPath);
      loadDirectory(initialPath);
      
      // Notify parent
      if (onDirectoryOpen) {
        onDirectoryOpen(initialPath);
      }
    }
  }, [initialPath]); // Only run when initialPath changes

  const openDirectory = useCallback(async () => {
    if (!window.api?.selectDirectory) return;

    try {
      const dirPath = await window.api.selectDirectory();
      if (!dirPath) return;

      setRootPath(dirPath);
      await loadDirectory(dirPath);

      if (onDirectoryOpen) {
        onDirectoryOpen(dirPath);
      }
    } catch (error) {
      console.error('[FileTree] Failed to open directory:', error);
    }
  }, [onDirectoryOpen]);

  const loadDirectory = async (path: string, parentPath?: string) => {
    if (!window.api?.readDirectory) return;

    try {
      const result = await window.api.readDirectory(path);
      const nodes: FileNode[] = result.map((entry) => ({
        name: entry.name,
        path: entry.path,
        isDirectory: entry.isDirectory,
        children: entry.isDirectory ? [] : undefined,
        isLoaded: false,
      }));

      if (parentPath) {
        // Update specific directory's children
        setTree((prev) => updateNodeChildren(prev, parentPath, nodes));
      } else {
        // Update root
        setTree(nodes);
      }
    } catch (error) {
      console.error('[FileTree] Failed to load directory:', error);
    }
  };

  const updateNodeChildren = (nodes: FileNode[], targetPath: string, children: FileNode[]): FileNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, children, isLoaded: true };
      }
      if (node.children) {
        return { ...node, children: updateNodeChildren(node.children, targetPath, children) };
      }
      return node;
    });
  };

  const toggleDirectory = useCallback(async (node: FileNode) => {
    const isExpanded = expandedDirs.has(node.path);

    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(node.path);
      } else {
        next.add(node.path);
      }
      return next;
    });

    // Load children if not loaded yet
    if (!isExpanded && !node.isLoaded) {
      await loadDirectory(node.path, node.path);
    }
  }, [expandedDirs]);

  const handleFileClick = useCallback((node: FileNode) => {
    if (node.isDirectory) {
      void toggleDirectory(node);
    } else {
      onFileOpen?.(node.path);
    }
  }, [toggleDirectory, onFileOpen]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    // Notify other components to close their context menus
    window.dispatchEvent(new CustomEvent('novi-close-context-menus', { detail: { source: 'FileTree' } }));
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const createNewFile = useCallback((parentNode: FileNode | null) => {
    closeContextMenu();

    let parentPath: string | null;
    let effectiveParentNode: FileNode | null = null;
    
    if (!parentNode) {
      // Right-clicked on empty space - use root
      parentPath = rootPath;
    } else if (parentNode.isDirectory) {
      // Right-clicked on a folder - use it as parent
      parentPath = parentNode.path;
      effectiveParentNode = parentNode;
    } else {
      // Right-clicked on a file - use its parent directory
      const lastSlash = Math.max(parentNode.path.lastIndexOf('/'), parentNode.path.lastIndexOf('\\'));
      parentPath = parentNode.path.substring(0, lastSlash);
      // effectiveParentNode stays null since we don't have a node for the parent
    }
    
    console.log('[FileTree] createNewFile called, parentPath:', parentPath, 'effectiveParentNode:', effectiveParentNode);
    
    if (!parentPath) {
      alert('Please open a directory first (📂 Open Folder)');
      return;
    }

    // Show inline input
    console.log('[FileTree] Setting newFileInput state');
    setNewFileInput({ parentPath, parentNode: effectiveParentNode });
    
    // ALWAYS expand parent if it's a directory node (whether already expanded or not)
    // This ensures the NewFileInput is visible
    if (effectiveParentNode && effectiveParentNode.isDirectory) {
      console.log('[FileTree] Expanding parent directory:', parentPath);
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        next.add(parentPath);
        return next;
      });
    }
  }, [rootPath, closeContextMenu]);
  
  const handleNewFileSubmit = useCallback(async (fileName: string) => {
    if (!newFileInput || !window.api?.createFile) return;
    
    if (!fileName.trim()) {
      setNewFileInput(null);
      return;
    }

    try {
      // Use path separator that matches the parent path
      const separator = newFileInput.parentPath.includes('\\') ? '\\' : '/';
      const filePath = `${newFileInput.parentPath}${newFileInput.parentPath.endsWith('/') || newFileInput.parentPath.endsWith('\\') ? '' : separator}${fileName}`;
      await window.api.createFile(filePath);
      
      // Reload parent directory
      await loadDirectory(newFileInput.parentPath, newFileInput.parentNode ? newFileInput.parentPath : undefined);
      
      console.log('[FileTree] File created:', filePath);
      
      // Open the newly created file
      if (onFileOpen) {
        onFileOpen(filePath);
      }
      
      setNewFileInput(null);
    } catch (error) {
      console.error('[FileTree] Failed to create file:', error);
      alert(`Failed to create file: ${(error as Error).message}`);
      setNewFileInput(null);
    }
  }, [newFileInput, onFileOpen, loadDirectory]);

  const createNewFolder = useCallback((parentNode: FileNode | null) => {
    closeContextMenu();

    let parentPath: string | null;
    let effectiveParentNode: FileNode | null = null;

    if (!parentNode) {
      parentPath = rootPath;
    } else if (parentNode.isDirectory) {
      parentPath = parentNode.path;
      effectiveParentNode = parentNode;
    } else {
      const lastSlash = Math.max(parentNode.path.lastIndexOf('/'), parentNode.path.lastIndexOf('\\'));
      parentPath = parentNode.path.substring(0, lastSlash);
    }

    if (!parentPath) {
      alert('Please open a directory first (📂 Open Folder)');
      return;
    }

    setNewFolderInput({ parentPath, parentNode: effectiveParentNode });

    if (effectiveParentNode && effectiveParentNode.isDirectory) {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        next.add(parentPath);
        return next;
      });
    }
  }, [rootPath, closeContextMenu]);

  const handleNewFolderSubmit = useCallback(async (folderName: string) => {
    if (!newFolderInput || !window.api?.createDirectory) return;

    if (!folderName.trim()) {
      setNewFolderInput(null);
      return;
    }

    try {
      const separator = newFolderInput.parentPath.includes('\\') ? '\\' : '/';
      const folderPath = `${newFolderInput.parentPath}${newFolderInput.parentPath.endsWith('/') || newFolderInput.parentPath.endsWith('\\') ? '' : separator}${folderName}`;
      await window.api.createDirectory(folderPath);

      await loadDirectory(newFolderInput.parentPath, newFolderInput.parentNode ? newFolderInput.parentPath : undefined);

      if (!expandedDirs.has(newFolderInput.parentPath)) {
        setExpandedDirs((prev) => new Set(prev).add(newFolderInput.parentPath));
      }

      setNewFolderInput(null);
    } catch (error) {
      console.error('[FileTree] Failed to create folder:', error);
      alert(`Failed to create folder: ${(error as Error).message}`);
      setNewFolderInput(null);
    }
  }, [newFolderInput, expandedDirs, loadDirectory]);

  const renameNode = useCallback(async (node: FileNode) => {
    if (!window.api?.renameFile) return;
    closeContextMenu();

    const newName = prompt('Enter new name:', node.name);
    if (!newName || newName === node.name) return;

    try {
      // Handle both Windows and Unix paths
      const lastSlash = Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\'));
      const parentPath = node.path.substring(0, lastSlash);
      const separator = node.path.includes('\\') ? '\\' : '/';
      const newPath = `${parentPath}${separator}${newName}`;
      
      await window.api.renameFile(node.path, newPath);
      
      // Reload parent directory
      if (parentPath === rootPath || !parentPath) {
        if (rootPath) {
          await loadDirectory(rootPath, undefined);
        }
      } else {
        await loadDirectory(parentPath, parentPath);
      }
    } catch (error) {
      console.error('[FileTree] Failed to rename:', error);
      alert(`Failed to rename: ${(error as Error).message}`);
    }
  }, [rootPath, closeContextMenu, loadDirectory]);

  const deleteNode = useCallback(async (node: FileNode) => {
    if (!window.api?.deleteFile) return;
    closeContextMenu();

    const confirmMsg = node.isDirectory
      ? `Delete folder "${node.name}" and all its contents?`
      : `Delete file "${node.name}"?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      await window.api.deleteFile(node.path, node.isDirectory);
      
      // Reload parent directory - handle both Windows and Unix paths
      const lastSlash = Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\'));
      const parentPath = node.path.substring(0, lastSlash);
      
      // If the deleted node was at root level, reload the entire tree
      if (parentPath === rootPath || !parentPath) {
        if (rootPath) {
          await loadDirectory(rootPath, undefined);
        }
      } else {
        await loadDirectory(parentPath, parentPath);
      }
    } catch (error) {
      console.error('[FileTree] Failed to delete:', error);
      alert(`Failed to delete: ${(error as Error).message}`);
    }
  }, [rootPath, closeContextMenu, loadDirectory]);

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  // Close context menu when another component opens its menu
  useEffect(() => {
    const handleCloseContextMenus = (e: CustomEvent) => {
      if (e.detail.source !== 'FileTree') {
        setContextMenu(null);
      }
    };
    window.addEventListener('novi-close-context-menus', handleCloseContextMenus as EventListener);
    return () => window.removeEventListener('novi-close-context-menus', handleCloseContextMenus as EventListener);
  }, []);

  // Method to programmatically load a directory (for workspace restore)
  const loadDirectoryProgrammatically = useCallback(async (dirPath: string) => {
    try {
      setRootPath(dirPath);
      await loadDirectory(dirPath);
      
      // Notify parent of directory change
      if (onDirectoryOpen) {
        onDirectoryOpen(dirPath);
      }
    } catch (error) {
      console.error('[FileTree] Failed to load directory programmatically:', dirPath, error);
      // Don't crash, just log the error
    }
  }, [onDirectoryOpen]);

  // Reset the file tree to initial state
  const resetFileTree = useCallback(() => {
    setRootPath(null);
    setTree([]);
    setExpandedDirs(new Set());
    setContextMenu(null);
    setNewFileInput(null);
    setNewFolderInput(null);
    onRootChangeRef.current?.(null);
  }, []);

  // Watch for file system changes — refreshes tree when files are added/removed
  useEffect(() => {
    if (!driveFileWatcher || !rootPath || !window.api?.fileTreeStartWatching) return;
    // Don't watch drive root (C:\, D:\) - causes EPERM on system dirs and is not useful
    const normalized = rootPath.replace(/\\/g, '/');
    if (/^[A-Za-z]:\/?$/.test(normalized)) return;

    // Start watching only root + expanded dirs (depth 1 — no recursion into collapsed folders)
    const expandedList = Array.from(expandedDirs);
    window.api.fileTreeStartWatching(rootPath, expandedList);
    console.log('[FileTree] Started watching:', rootPath, expandedList.length, 'expanded');

    // Listen for file tree changes
    const handleFileTreeChange = async (event: { type: string; path: string }) => {
      console.log('[FileTree] File system change detected:', event.type, event.path);
      
      // Normalize paths for comparison (convert backslashes to forward slashes)
      const normalizedEventPath = event.path.replace(/\\/g, '/');
      const normalizedRootPath = rootPath.replace(/\\/g, '/');
      
      // Get the directory that needs to be refreshed
      const pathParts = normalizedEventPath.split('/');
      pathParts.pop(); // Remove file name to get directory
      const dirPath = pathParts.join('/');
      
      console.log('[FileTree] Normalized paths - event:', normalizedEventPath, 'root:', normalizedRootPath, 'dir:', dirPath);
      
      // If the change is in the root directory, refresh root
      if (dirPath === normalizedRootPath || normalizedEventPath.startsWith(normalizedRootPath)) {
        // Refresh the affected directory
        if (event.type === 'add' || event.type === 'unlink' || event.type === 'addDir' || event.type === 'unlinkDir') {
          // Check if this directory is expanded (if it's not root)
          const isRootChange = dirPath === normalizedRootPath;
          
          // For expanded directory checks, we need to normalize the paths in the Set too
          const normalizedExpandedDirs = new Set(
            Array.from(expandedDirsRef.current).map(p => p.replace(/\\/g, '/'))
          );
          const isExpanded = isRootChange || normalizedExpandedDirs.has(dirPath);
          
          if (isRootChange) {
            // Refresh root
            console.log('[FileTree] Refreshing root directory:', rootPath);
            await loadDirectory(rootPath);
          } else if (isExpanded) {
            // Refresh the parent directory
            console.log('[FileTree] Refreshing expanded directory:', dirPath);
            await loadDirectory(dirPath, dirPath);
          } else {
            console.log('[FileTree] Directory not expanded, skipping refresh:', dirPath);
          }
        }
      } else {
        console.log('[FileTree] Change outside root directory, ignoring');
      }
    };

    if (window.api.fileTreeOnChange) {
      window.api.fileTreeOnChange(handleFileTreeChange);
    }

    // Cleanup
    return () => {
      if (driveFileWatcher && window.api?.fileTreeStopWatching) {
        window.api.fileTreeStopWatching();
        console.log('[FileTree] Stopped watching');
      }
      if (window.api?.fileTreeRemoveChangeListener) {
        window.api.fileTreeRemoveChangeListener();
      }
    };
  }, [rootPath, driveFileWatcher, expandedDirs]); // Re-watch when expanded set changes

  // Expose methods for compatibility (only primary tree registers so restore/loadDirectory always target main tree)
  useEffect(() => {
    if (!driveFileWatcher) return;
    (window as any).__fileTreeAPI = {
      openDirectory,
      loadDirectory: loadDirectoryProgrammatically,
      refresh: () => rootPath && loadDirectory(rootPath),
      reset: resetFileTree,
    };
    
    // Signal that FileTree is ready for use (only once, from primary tree)
    markReady('filetree-ready');
    
    return () => {
      delete (window as any).__fileTreeAPI;
    };
  }, [driveFileWatcher, openDirectory, loadDirectoryProgrammatically, rootPath, resetFileTree]);

  const contextValue: FileTreeContextValue = {
    expandedDirs,
    toggleDirectory,
    handleFileClick,
    handleContextMenu,
  };

  // Extract directory name from rootPath
  const getDirectoryName = (path: string | null): string => {
    if (!path) return 'FILES';
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'FILES';
  };

  return (
    <FileTreeContext.Provider value={contextValue}>
      <div style={styles.container} onContextMenu={(e) => handleContextMenu(e, null)}>
        {!hideHeader && (
          <div style={styles.header}>
            <span style={{ ...styles.title, ...(isTerminalTree ? { color: '#4ec9b0' } : {}) }}>{getDirectoryName(rootPath)}</span>
            <div style={styles.headerButtons}>
              {showGitToggle && rootPath && onToggleGit && tree.some(n => n.name === '.git' && n.isDirectory) && (
                <button style={styles.button} onClick={onToggleGit} title="Toggle Git View">
                  ✚
                </button>
              )}
              {showOpenFolder && rootPath && (
                <button style={styles.button} onClick={() => openDirectory()} title="Open Folder">
                  📂
                </button>
              )}
            </div>
          </div>
        )}

        {tree.length === 0 && !rootPath ? (
          <div className="file-tree-scroll" style={styles.emptyState}>
            <p>No folder open</p>
            {showOpenFolder && (
              <button style={styles.openButton} onClick={() => openDirectory()}>
                Open Folder
              </button>
            )}
          </div>
        ) : tree.length === 0 && rootPath ? (
          <div className="file-tree-scroll" style={styles.emptyState}>
            <p>Directory is empty</p>
          </div>
        ) : (
          <div className="file-tree-scroll" style={styles.tree}>
            {/* ".." parent directory entry removed — no longer supported */}
            
            {/* Show inline input at root level if creating new file at root */}
            {newFileInput && newFileInput.parentPath === rootPath && !newFileInput.parentNode && (
              <NewFileInput
                level={0}
                onSubmit={handleNewFileSubmit}
                onCancel={() => setNewFileInput(null)}
              />
            )}
            {newFolderInput && newFolderInput.parentPath === rootPath && !newFolderInput.parentNode && (
              <NewFileInput
                level={0}
                onSubmit={handleNewFolderSubmit}
                onCancel={() => setNewFolderInput(null)}
                icon="📁"
                placeholder="folder-name"
              />
            )}
            
            {tree.map((node) => (
              <FileTreeNode key={node.path} node={node} level={0} newFileInput={newFileInput} onNewFileSubmit={handleNewFileSubmit} onNewFileCancel={() => setNewFileInput(null)} newFolderInput={newFolderInput} onNewFolderSubmit={handleNewFolderSubmit} onNewFolderCancel={() => setNewFolderInput(null)} />
            ))}
          </div>
        )}

        {contextMenu && (
          <ContextMenuComponent
            x={contextMenu.x}
            y={contextMenu.y}
            node={contextMenu.node}
            onNewFile={() => createNewFile(contextMenu.node)}
            onNewFolder={() => createNewFolder(contextMenu.node)}
            onNewTerminal={() => {
              closeContextMenu();
              onNewTerminal?.();
            }}
            onNoviPrompt={() => {
              closeContextMenu();
              onNoviPrompt?.();
            }}
            onEditImage={() => {
              closeContextMenu();
              if (contextMenu.node) {
                onFileOpen?.(contextMenu.node.path);
              }
            }}
            onRename={() => contextMenu.node && renameNode(contextMenu.node)}
            onDelete={() => contextMenu.node && deleteNode(contextMenu.node)}
            onQuit={() => {
              closeContextMenu();
              if (window.api?.quit) {
                window.api.quit();
              }
            }}
            onClose={closeContextMenu}
          />
        )}

        {gitStatus && gitStatus.isRepo && (
          <div style={styles.footer}>
            <span style={styles.gitIcon}>⎇</span>
            <span style={styles.branchName}>{gitStatus.branch || 'detached'}</span>
            {gitStatus.ahead > 0 && <span style={styles.badge}>↑{gitStatus.ahead}</span>}
            {gitStatus.behind > 0 && <span style={styles.badge}>↓{gitStatus.behind}</span>}
          </div>
        )}
      </div>
    </FileTreeContext.Provider>
  );
};

interface NewFileInputProps {
  level: number;
  onSubmit: (fileName: string) => void;
  onCancel: () => void;
  icon?: string;
  placeholder?: string;
}

const NewFileInput: React.FC<NewFileInputProps> = ({ level, onSubmit, onCancel, icon = '📄', placeholder = 'filename.txt' }) => {
  const [fileName, setFileName] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input when it appears
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(fileName);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      style={{
        ...styles.node,
        paddingLeft: `${level * 16 + 8}px`,
        backgroundColor: '#2a2d2e',
      }}
    >
      <span style={styles.icon}>{icon}</span>
      <input
        ref={inputRef}
        type="text"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => fileName.trim() ? onSubmit(fileName) : onCancel()}
        placeholder={placeholder}
        style={{
          ...styles.name,
          backgroundColor: '#1e1e1e',
          border: '1px solid #007acc',
          outline: 'none',
          padding: '2px 4px',
          borderRadius: '2px',
          color: '#cccccc',
          fontFamily: 'inherit',
          fontSize: 'inherit',
        }}
      />
    </div>
  );
};

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  newFileInput: { parentPath: string; parentNode: FileNode | null } | null;
  onNewFileSubmit: (fileName: string) => void;
  onNewFileCancel: () => void;
  newFolderInput: { parentPath: string; parentNode: FileNode | null } | null;
  onNewFolderSubmit: (folderName: string) => void;
  onNewFolderCancel: () => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, level, newFileInput, onNewFileSubmit, onNewFileCancel, newFolderInput, onNewFolderSubmit, onNewFolderCancel }) => {
  const [isHovered, setIsHovered] = useState(false);
  const context = useContext(FileTreeContext);
  
  if (!context) return null;

  const { expandedDirs, handleFileClick, handleContextMenu } = context;
  const isExpanded = expandedDirs.has(node.path);

  return (
    <div>
      <div
        style={{
          ...styles.node,
          paddingLeft: `${level * 16 + 8}px`,
          backgroundColor: isHovered ? '#2a2d2e' : 'transparent',
        }}
        onClick={() => handleFileClick(node)}
        onContextMenu={(e) => handleContextMenu(e, node)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {node.isDirectory && (
          <span style={styles.arrow}>{isExpanded ? '▼' : '▶'}</span>
        )}
        <span style={styles.icon}>
          {node.isDirectory ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
        </span>
        <span style={styles.name}>{node.name}</span>
      </div>

      {node.isDirectory && isExpanded && (
        <div>
          {/* Show inline input for new file if this is the parent */}
          {newFileInput && newFileInput.parentPath === node.path && (
            <NewFileInput
              level={level + 1}
              onSubmit={onNewFileSubmit}
              onCancel={onNewFileCancel}
            />
          )}
          {newFolderInput && newFolderInput.parentPath === node.path && (
            <NewFileInput
              level={level + 1}
              onSubmit={onNewFolderSubmit}
              onCancel={onNewFolderCancel}
              icon="📁"
              placeholder="folder-name"
            />
          )}

          {/* Render children */}
          {node.children && node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} newFileInput={newFileInput} onNewFileSubmit={onNewFileSubmit} onNewFileCancel={onNewFileCancel} newFolderInput={newFolderInput} onNewFolderSubmit={onNewFolderSubmit} onNewFolderCancel={onNewFolderCancel} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode | null;
  onNewFile: () => void;
  onNewFolder: () => void;
  onNewTerminal: () => void;
  onNoviPrompt: () => void;
  onEditImage: () => void;
  onRename: () => void;
  onDelete: () => void;
  onQuit: () => void;
  onClose: () => void;
}

const ContextMenuComponent: React.FC<ContextMenuProps> = ({ x, y, node, onNewFile, onNewFolder, onNewTerminal, onNoviPrompt, onEditImage, onRename, onDelete, onQuit, onClose }) => {
  // Check if the selected node is an image file
  const isImage = node && !node.isDirectory && (
    node.name.endsWith('.png') ||
    node.name.endsWith('.jpg') ||
    node.name.endsWith('.jpeg') ||
    node.name.endsWith('.gif') ||
    node.name.endsWith('.webp') ||
    node.name.endsWith('.avif')
  );
  
  return (
    <div style={{ ...styles.contextMenu, left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <div style={styles.menuItem} onClick={onNewFile}>
        📄 New File
      </div>
      <div style={styles.menuItem} onClick={onNewFolder}>
        📁 New Folder
      </div>
      <div style={styles.menuItem} onClick={onNewTerminal}>
        💻 New Terminal
      </div>
      <div style={styles.menuItem} onClick={onNoviPrompt}>
        ▶️ Novi Shell
      </div>
      {node && (
        <>
          <div style={styles.menuDivider} />
          {isImage && (
            <div style={styles.menuItem} onClick={onEditImage}>
              🖼️ Edit Image
            </div>
          )}
          <div style={styles.menuItem} onClick={onRename}>
            ✏️ Rename
          </div>
          <div style={styles.menuItem} onClick={onDelete}>
            🗑️ Delete
          </div>
        </>
      )}
      <div style={styles.menuDivider} />
      <div style={styles.menuItem} onClick={onQuit}>
        🚪 Quit
      </div>
    </div>
  );
};

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return '📜';
    case 'json':
      return '📋';
    case 'md':
      return '📝';
    case 'html':
    case 'htm':
      return '🌐';
    case 'css':
    case 'scss':
    case 'less':
      return '🎨';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return '🖼️';
    default:
      return '📄';
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#252526',
    color: '#cccccc',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '35px',
    padding: '0 12px',
    borderBottom: '1px solid #3e3e42',
    backgroundColor: '#252526',
  },
  title: {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px',
    color: '#cccccc',
  },
  headerButtons: {
    display: 'flex',
    gap: '4px',
  },
  button: {
    background: 'transparent',
    border: 'none',
    color: '#cccccc',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '2px 4px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    textAlign: 'center' as const,
    color: '#858585',
    fontSize: '13px',
  },
  openButton: {
    marginTop: '16px',
    padding: '8px 16px',
    backgroundColor: '#0e639c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  tree: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  node: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '13px',
    userSelect: 'none' as const,
  },
  arrow: {
    marginRight: '4px',
    fontSize: '10px',
    width: '12px',
  },
  icon: {
    marginRight: '6px',
    fontSize: '14px',
  },
  name: {
    flex: 1,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  contextMenu: {
    position: 'fixed' as const,
    backgroundColor: '#2d2d30',
    border: '1px solid #3e3e42',
    borderRadius: '4px',
    padding: '4px 0',
    minWidth: '150px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
  },
  menuItem: {
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#cccccc',
  },
  menuDivider: {
    height: '1px',
    backgroundColor: '#3e3e42',
    margin: '4px 0',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderTop: '1px solid #3e3e42',
    backgroundColor: '#252526',
    fontSize: '12px',
    color: '#cccccc',
  },
  gitIcon: {
    fontSize: '14px',
    opacity: 0.9,
  },
  branchName: {
    fontSize: '12px',
    color: '#cccccc',
  },
  badge: {
    fontSize: '11px',
    padding: '2px 4px',
    backgroundColor: '#007acc',
    color: '#ffffff',
    borderRadius: '3px',
  },
};
