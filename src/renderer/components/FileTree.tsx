/**
 * FileTree - File system browser (React)
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface FileTreeProps {
  onFileOpen?: (filePath: string) => void;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export const FileTree: React.FC<FileTreeProps> = ({ onFileOpen }) => {
  const [rootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const openDirectory = useCallback(async () => {
    if (!window.api) return;

    try {
      // Use Electron's dialog to open a directory
      // For now, this is a placeholder - we'll implement full directory browsing later
      console.log('[FileTree] Directory picker not yet implemented');
    } catch (error) {
      console.error('[FileTree] Failed to open directory:', error);
    }
  }, []);

  const loadDirectory = async (path: string) => {
    if (!window.api?.readDirectory) return;

    try {
      const result = await window.api.readDirectory(path);
      const nodes: FileNode[] = result.map((entry) => ({
        name: entry.name,
        path: entry.path,
        isDirectory: entry.isDirectory,
        children: entry.isDirectory ? [] : undefined,
      }));

      setTree(nodes);
    } catch (error) {
      console.error('[FileTree] Failed to load directory:', error);
    }
  };

  const toggleDirectory = useCallback(async (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleFileClick = useCallback(async (node: FileNode) => {
    if (node.isDirectory) {
      await toggleDirectory(node.path);
    } else {
      onFileOpen?.(node.path);
    }
  }, [toggleDirectory, onFileOpen]);

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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>FILES</span>
        <button style={styles.button} onClick={openDirectory} title="Open Folder">
          📁
        </button>
      </div>

      {tree.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No folder open</p>
          <button style={styles.openButton} onClick={openDirectory}>
            Open Folder
          </button>
        </div>
      ) : (
        <div style={styles.tree}>
          {tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              level={0}
              isExpanded={expandedDirs.has(node.path)}
              onClick={() => handleFileClick(node)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  isExpanded: boolean;
  onClick: () => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, level, isExpanded, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div>
      <div
        style={{
          ...styles.node,
          paddingLeft: `${level * 16 + 8}px`,
          backgroundColor: isHovered ? '#2a2d2e' : 'transparent',
        }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {node.isDirectory && (
          <span style={styles.arrow}>{isExpanded ? '▼' : '▶'}</span>
        )}
        <span style={styles.icon}>
          {node.isDirectory ? '📁' : '📄'}
        </span>
        <span style={styles.name}>{node.name}</span>
      </div>

      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              isExpanded={false}
              onClick={() => {/* handled by parent */}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
    padding: '8px 12px',
    borderBottom: '1px solid #3e3e42',
  },
  title: {
    fontSize: '11px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px',
    color: '#858585',
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
};

