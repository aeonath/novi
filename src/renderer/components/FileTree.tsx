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

export interface FileTreeProps {
  onFileOpen?: (filePath: string) => void;
  onToggleGit?: () => void;
  showGitToggle?: boolean;
  onDirectoryOpen?: (dirPath: string) => void;
  onNewTerminal?: () => void;
  onNovaPrompt?: () => void;
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
  handleContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

export const FileTree: React.FC<FileTreeProps> = ({ onFileOpen, onToggleGit, showGitToggle = true, onDirectoryOpen, onNewTerminal, onNovaPrompt }) => {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [newFileInput, setNewFileInput] = useState<{ parentPath: string; parentNode: FileNode | null } | null>(null);
  const { gitStatus } = useAppContext();

  const openDirectory = useCallback(async () => {
    if (!window.api?.selectDirectory) return;

    try {
      const dirPath = await window.api.selectDirectory();
      if (!dirPath) return;

      setRootPath(dirPath);
      await loadDirectory(dirPath);
      
      // Notify parent of directory change
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
    window.dispatchEvent(new CustomEvent('nova-close-context-menus', { detail: { source: 'FileTree' } }));
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const createNewFile = useCallback((parentNode: FileNode | null) => {
    closeContextMenu();

    const parentPath = parentNode ? parentNode.path : rootPath;
    if (!parentPath) {
      alert('Please open a directory first (📂 Open Folder)');
      return;
    }

    // Show inline input
    setNewFileInput({ parentPath, parentNode });
    
    // Expand parent if it's a directory
    if (parentNode && !expandedDirs.has(parentPath)) {
      setExpandedDirs((prev) => new Set(prev).add(parentPath));
    }
  }, [rootPath, expandedDirs, closeContextMenu]);
  
  const handleNewFileSubmit = useCallback(async (fileName: string) => {
    if (!newFileInput || !window.api?.createFile) return;
    
    if (!fileName.trim()) {
      setNewFileInput(null);
      return;
    }

    try {
      const filePath = `${newFileInput.parentPath}${newFileInput.parentPath.endsWith('/') || newFileInput.parentPath.endsWith('\\') ? '' : '/'}${fileName}`;
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
  }, [newFileInput, onFileOpen]);

  const createNewFolder = useCallback(async (parentNode: FileNode | null) => {
    if (!window.api?.createDirectory) return;
    closeContextMenu();

    const parentPath = parentNode ? parentNode.path : rootPath;
    if (!parentPath) {
      alert('Please open a directory first (📂 Open Folder)');
      return;
    }

    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      const folderPath = `${parentPath}${parentPath.endsWith('/') ? '' : '/'}${folderName}`;
      await window.api.createDirectory(folderPath);
      
      // Reload parent directory
      await loadDirectory(parentPath, parentNode ? parentPath : undefined);
      
      // Expand parent if it's a directory
      if (parentNode && !expandedDirs.has(parentPath)) {
        setExpandedDirs((prev) => new Set(prev).add(parentPath));
      }
    } catch (error) {
      console.error('[FileTree] Failed to create folder:', error);
      alert(`Failed to create folder: ${(error as Error).message}`);
    }
  }, [rootPath, expandedDirs, closeContextMenu]);

  const renameNode = useCallback(async (node: FileNode) => {
    if (!window.api?.renameFile) return;
    closeContextMenu();

    const newName = prompt('Enter new name:', node.name);
    if (!newName || newName === node.name) return;

    try {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`;
      
      await window.api.renameFile(node.path, newPath);
      
      // Reload parent directory
      await loadDirectory(parentPath, rootPath === parentPath ? undefined : parentPath);
    } catch (error) {
      console.error('[FileTree] Failed to rename:', error);
      alert(`Failed to rename: ${(error as Error).message}`);
    }
  }, [rootPath, closeContextMenu]);

  const deleteNode = useCallback(async (node: FileNode) => {
    if (!window.api?.deleteFile) return;
    closeContextMenu();

    const confirmMsg = node.isDirectory
      ? `Delete folder "${node.name}" and all its contents?`
      : `Delete file "${node.name}"?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      await window.api.deleteFile(node.path, node.isDirectory);
      
      // Reload parent directory
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      await loadDirectory(parentPath, rootPath === parentPath ? undefined : parentPath);
    } catch (error) {
      console.error('[FileTree] Failed to delete:', error);
      alert(`Failed to delete: ${(error as Error).message}`);
    }
  }, [rootPath, closeContextMenu]);

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
    window.addEventListener('nova-close-context-menus', handleCloseContextMenus as EventListener);
    return () => window.removeEventListener('nova-close-context-menus', handleCloseContextMenus as EventListener);
  }, []);

  // Expose methods for compatibility
  useEffect(() => {
    (window as any).__fileTreeAPI = {
      openDirectory,
      refresh: () => rootPath && loadDirectory(rootPath),
    };
    return () => {
      delete (window as any).__fileTreeAPI;
    };
  }, [openDirectory, rootPath]);

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
        <div style={styles.header}>
          <span style={styles.title}>{getDirectoryName(rootPath)}</span>
          <div style={styles.headerButtons}>
            {showGitToggle && rootPath && onToggleGit && (
              <button style={styles.button} onClick={onToggleGit} title="Toggle Git View">
                ⎇
              </button>
            )}
            {rootPath && (
              <button style={styles.button} onClick={openDirectory} title="Open Folder">
                📂
              </button>
            )}
          </div>
        </div>

        {tree.length === 0 ? (
          <div className="file-tree-scroll" style={styles.emptyState}>
            <p>No folder open</p>
            <button style={styles.openButton} onClick={openDirectory}>
              Open Folder
            </button>
          </div>
        ) : (
          <div className="file-tree-scroll" style={styles.tree}>
            {tree.map((node) => (
              <FileTreeNode key={node.path} node={node} level={0} newFileInput={newFileInput} onNewFileSubmit={handleNewFileSubmit} onNewFileCancel={() => setNewFileInput(null)} />
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
            onNovaPrompt={() => {
              closeContextMenu();
              onNovaPrompt?.();
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
}

const NewFileInput: React.FC<NewFileInputProps> = ({ level, onSubmit, onCancel }) => {
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
      <span style={styles.icon}>📄</span>
      <input
        ref={inputRef}
        type="text"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => fileName.trim() ? onSubmit(fileName) : onCancel()}
        placeholder="filename.txt"
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
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, level, newFileInput, onNewFileSubmit, onNewFileCancel }) => {
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
          
          {/* Render children */}
          {node.children && node.children.length > 0 && node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} newFileInput={newFileInput} onNewFileSubmit={onNewFileSubmit} onNewFileCancel={onNewFileCancel} />
          ))}
        </div>
      )}
      
      {/* Show inline input at root level if no parent node */}
      {!node.isDirectory && newFileInput && !newFileInput.parentNode && newFileInput.parentPath === node.path.substring(0, node.path.lastIndexOf('/')) && (
        <NewFileInput 
          level={level}
          onSubmit={onNewFileSubmit}
          onCancel={onNewFileCancel}
        />
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
  onNovaPrompt: () => void;
  onRename: () => void;
  onDelete: () => void;
  onQuit: () => void;
  onClose: () => void;
}

const ContextMenuComponent: React.FC<ContextMenuProps> = ({ x, y, node, onNewFile, onNewFolder, onNewTerminal, onNovaPrompt, onRename, onDelete, onQuit, onClose }) => {
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
      <div style={styles.menuItem} onClick={onNovaPrompt}>
        ▶️ Nova Prompt
      </div>
      {node && (
        <>
          <div style={styles.menuDivider} />
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
