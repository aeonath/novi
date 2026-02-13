/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * WorkspaceSplit - Split pane layout with FileTree and Editor
 * Allows working with multiple projects/directories in separate tabs
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileTree } from './FileTree.js';
import { MonacoEditor } from './MonacoEditor.js';

export interface WorkspaceSplitProps {
  workspaceId: string;
  workspacePath: string;
  isActive: boolean;
}

export const WorkspaceSplit: React.FC<WorkspaceSplitProps> = ({ workspaceId, workspacePath, isActive }) => {
  const [leftWidth, setLeftWidth] = useState(30); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [workspaceRoot, setWorkspaceRoot] = useState<string>(workspacePath);

  // Handle drag resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Constrain between 20% and 50%
    const constrainedWidth = Math.min(Math.max(newWidth, 20), 50);
    setLeftWidth(constrainedWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up global mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle file opening from FileTree
  const handleFileOpen = useCallback(async (filePath: string) => {
    console.log('[WorkspaceSplit] Opening file in split view:', filePath);
    console.log('[WorkspaceSplit] Current openFile state:', openFile);
    console.log('[WorkspaceSplit] WorkspaceId:', workspaceId);
    
    // Check if it's an image file
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];
    const isImage = imageExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
    
    if (isImage) {
      console.log('[WorkspaceSplit] Image files not supported in split view yet');
      return;
    }
    
    // Set the open file first
    console.log('[WorkspaceSplit] Setting openFile state to:', filePath);
    setOpenFile(filePath);
    
    // Load the file content
    if (window.api?.readFile) {
      try {
        console.log('[WorkspaceSplit] Reading file from disk...');
        const content = await window.api.readFile(filePath);
        console.log('[WorkspaceSplit] File read successfully, length:', content.length);
        
        // Update Monaco editor via global API
        const monacoAPI = (window as any).__monacoAPI;
        console.log('[WorkspaceSplit] Monaco API available:', !!monacoAPI);
        console.log('[WorkspaceSplit] Monaco openFile method:', !!monacoAPI?.openFile);
        
        if (monacoAPI && monacoAPI.openFile) {
          console.log('[WorkspaceSplit] Calling Monaco openFile...');
          await monacoAPI.openFile(filePath, content);
          console.log('[WorkspaceSplit] File opened in Monaco:', filePath);
          
          // Update the tab title to show the opened file
          const tabBarAPI = (window as any).__tabBarAPI;
          const fileName = filePath.replace(/\\/g, '/').split('/').pop() || 'file';
          const dirName = getDirectoryName(workspaceRoot);
          
          console.log('[WorkspaceSplit] Updating tab title:', `📂 ${dirName} - ${fileName}`);
          
          if (tabBarAPI && tabBarAPI.updateTabFileName) {
            tabBarAPI.updateTabFileName(workspaceId, `📂 ${dirName} - ${fileName}`);
            console.log('[WorkspaceSplit] Tab title updated successfully');
          } else {
            console.error('[WorkspaceSplit] TabBar API or updateTabFileName not available');
          }
        } else {
          console.error('[WorkspaceSplit] Monaco API or openFile method not available');
        }
      } catch (error) {
        console.error('[WorkspaceSplit] Failed to open file:', error);
      }
    } else {
      console.error('[WorkspaceSplit] window.api.readFile not available');
    }
  }, [workspaceId, workspaceRoot, openFile]);

  // Handle directory change in the split's FileTree
  const handleDirectoryOpen = useCallback((dirPath: string) => {
    console.log('[WorkspaceSplit] Directory changed in split view:', dirPath);
    setWorkspaceRoot(dirPath);
  }, []);

  // Extract directory name from path
  const getDirectoryName = (path: string): string => {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'Workspace';
  };

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Left Pane - FileTree */}
      <div style={{ ...styles.leftPane, width: `${leftWidth}%` }}>
        <div style={styles.simplifiedHeader}>
          <span style={styles.headerTitle}>{getDirectoryName(workspaceRoot)}</span>
        </div>
        <div style={styles.fileTreeContainer}>
          <FileTree
            initialPath={workspaceRoot}
            onFileOpen={handleFileOpen}
            onDirectoryOpen={handleDirectoryOpen}
            showGitToggle={false}
            hideHeader={true}
            driveFileWatcher={false}
          />
        </div>
      </div>

      {/* Resizer */}
      <div
        style={{
          ...styles.resizer,
          ...(isDragging ? styles.resizerActive : {}),
        }}
        onMouseDown={handleMouseDown}
      />

      {/* Right Pane - Editor */}
      <div style={{ ...styles.rightPane, width: `${100 - leftWidth}%` }}>
        {openFile ? (
          <MonacoEditor
            onDirtyChange={(isDirty) => {
              console.log('[WorkspaceSplit] File dirty state changed:', isDirty);
            }}
          />
        ) : (
          <div style={styles.emptyEditor}>
            <div style={styles.emptyEditorContent}>
              <p style={styles.emptyEditorText}>Select a file from the file tree to edit</p>
              <p style={styles.emptyEditorSubtext}>
                This is a separate workspace: <strong>{getDirectoryName(workspaceRoot)}</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row' as const,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
  },
  leftPane: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#252526',
    borderRight: '1px solid #3e3e42',
  },
  simplifiedHeader: {
    display: 'flex',
    alignItems: 'center',
    height: '35px',
    padding: '0 12px',
    borderBottom: '1px solid #3e3e42',
    backgroundColor: '#252526',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#cccccc',
    letterSpacing: '0.5px',
  },
  fileTreeContainer: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  resizer: {
    width: '4px',
    cursor: 'col-resize',
    backgroundColor: '#3e3e42',
    transition: 'background-color 0.2s',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: '#007acc',
    },
  } as React.CSSProperties,
  resizerActive: {
    backgroundColor: '#007acc',
  },
  rightPane: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
  },
  emptyEditor: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    backgroundColor: '#1e1e1e',
  },
  emptyEditorContent: {
    textAlign: 'center' as const,
    padding: '40px',
  },
  emptyEditorText: {
    fontSize: '16px',
    color: '#cccccc',
    marginBottom: '12px',
  },
  emptyEditorSubtext: {
    fontSize: '14px',
    color: '#888888',
    margin: 0,
  },
};

