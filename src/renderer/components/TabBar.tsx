/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * TabBar - Tab management for multiple open files (React)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { markReady } from '../utils/ready-events.js';

export interface Tab {
  id: string;
  type: 'file' | 'terminal' | 'image' | 'novi-prompt';
  filePath: string; // For files: actual path, for terminals: terminal ID, for images: image path
  fileName: string;
  isDirty: boolean;
  content: string; // For files: file content, for terminals: not used
  language: string; // For files: language mode, for terminals: 'terminal'
}

export interface TabBarProps {
  onTabSwitch?: (tab: Tab) => void;
  onTabClose?: (tabId: string) => Promise<boolean>;
  onAllTabsClosed?: () => void;
}

/** File icon by extension, consistent with FileTree */
function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
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

export const TabBar: React.FC<TabBarProps> = ({ onTabSwitch, onTabClose, onAllTabsClosed }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; tab: Tab } | null>(null);

  const addTab = useCallback((tab: Tab) => {
    setTabs((prevTabs) => {
      // For file, image, and novi-prompt tabs, check if tab already exists by filePath
      // For terminal tabs, always create new (allow multiple terminals)
      if (tab.type === 'file' || tab.type === 'image' || tab.type === 'novi-prompt') {
        const existingTab = prevTabs.find((t) => 
          (t.type === 'file' || t.type === 'image' || t.type === 'novi-prompt') && 
          t.filePath === tab.filePath
        );
        if (existingTab) {
          setActiveTabId(existingTab.id);
          onTabSwitch?.(existingTab);
          return prevTabs;
        }
      }

      const newTabs = [...prevTabs, tab];
      setActiveTabId(tab.id);
      onTabSwitch?.(tab);
      return newTabs;
    });
  }, [onTabSwitch]);

  const removeTab = useCallback(async (tabId: string) => {
    // Ask if we can close (handles unsaved changes)
    if (onTabClose) {
      const canClose = await onTabClose(tabId);
      if (!canClose) return false;
    }

    setTabs((prevTabs) => {
      const tabIndex = prevTabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return prevTabs;

      const newTabs = prevTabs.filter((t) => t.id !== tabId);

      // If we closed the active tab, activate another
      if (activeTabId === tabId) {
        if (newTabs.length > 0) {
          const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
          setActiveTabId(newTabs[newActiveIndex].id);
          onTabSwitch?.(newTabs[newActiveIndex]);
        } else {
          setActiveTabId(null);
          // Notify parent that all tabs are closed
          onAllTabsClosed?.();
        }
      }

      return newTabs;
    });

    return true;
  }, [activeTabId, onTabClose, onTabSwitch, onAllTabsClosed]);

  const switchTab = useCallback((tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      onTabSwitch?.(tab);
    }
  }, [tabs, onTabSwitch]);

  const updateTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tabId ? { ...t, isDirty } : t))
    );
  }, []);
  
  const updateTabFileName = useCallback((tabId: string, fileName: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tabId ? { ...t, fileName } : t))
    );
  }, []);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tabId ? { ...t, content } : t))
    );
  }, []);

  const getActiveTab = useCallback(() => {
    return tabs.find((t) => t.id === activeTabId) ?? null;
  }, [tabs, activeTabId]);

  const getTabs = useCallback(() => tabs, [tabs]);

  // Expose methods to window for backward compatibility during migration
  React.useEffect(() => {
    (window as any).__tabBarAPI = {
      addTab,
      removeTab,
      switchTab,
      updateTabDirty,
      updateTabContent,
      updateTabFileName,
      getActiveTab,
      getTabs,
      setActiveTab: switchTab, // Alias for compatibility
      closeTab: removeTab, // Alias for compatibility
    };
    
    // Signal that TabBar is ready for use
    markReady('tabbar-ready');
    
    return () => {
      delete (window as any).__tabBarAPI;
    };
  }, [addTab, removeTab, switchTab, updateTabDirty, updateTabContent, updateTabFileName, getActiveTab, getTabs]);

  if (tabs.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>No files open</div>
      </div>
    );
  }

  // Close tab context menu on click outside or when another menu opens
  useEffect(() => {
    if (!tabContextMenu) return;
    const close = () => setTabContextMenu(null);
    document.addEventListener('click', close);
    window.addEventListener('novi-close-context-menus', close);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('novi-close-context-menus', close);
    };
  }, [tabContextMenu]);

  return (
    <div className="tab-bar-container" style={styles.container}>
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onSelect={() => switchTab(tab.id)}
          onClose={() => void removeTab(tab.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('novi-close-context-menus'));
            setTabContextMenu({ x: e.clientX, y: e.clientY, tab });
          }}
        />
      ))}
      {tabContextMenu && tabContextMenu.tab.type === 'novi-prompt' && (
        <div
          style={{
            position: 'fixed',
            left: tabContextMenu.x,
            top: tabContextMenu.y,
            backgroundColor: '#252526',
            border: '1px solid #3e3e42',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 10000,
            minWidth: '150px',
            padding: '4px 0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={styles.tabContextMenuItem}
            onClick={() => {
              (window as any).__noviShellCopy?.();
              setTabContextMenu(null);
            }}
          >
            Copy
          </div>
          <div
            style={styles.tabContextMenuItem}
            onClick={() => {
              (window as any).__noviShellPaste?.();
              setTabContextMenu(null);
            }}
          >
            Paste
          </div>
          <div style={styles.tabContextMenuSeparator} />
          <div
            style={styles.tabContextMenuItem}
            onClick={() => {
              void removeTab(tabContextMenu.tab.id);
              setTabContextMenu(null);
            }}
          >
            Close
          </div>
        </div>
      )}
    </div>
  );
};

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onSelect, onClose, onContextMenu }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.tab,
        ...(isActive ? styles.tabActive : {}),
        ...(isHovered && !isActive ? styles.tabHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <span style={{
        ...styles.tabLabel,
        ...(isActive && tab.type === 'terminal' ? { color: '#4ec9b0' } : {}),
      }}>
        {tab.type === 'file' ? `${getFileIcon(tab.fileName)} ${tab.fileName}` : tab.fileName}
        {tab.type === 'file' && tab.isDirty && <span style={styles.dirtyIndicator}> ●</span>}
      </span>
      <button
        style={{
          ...styles.closeButton,
          ...(isHovered ? styles.closeButtonVisible : {}),
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close tab"
      >
        ×
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3e3e42',
    minHeight: '35px',
    overflowX: 'auto' as const,
    overflowY: 'hidden' as const,
    userSelect: 'none' as const,
  },
  emptyState: {
    padding: '8px 16px',
    fontSize: '12px',
    color: '#858585',
    fontStyle: 'italic' as const,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#cccccc',
    backgroundColor: '#2d2d30',
    borderRight: '1px solid #3e3e42',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    minWidth: '100px',
    maxWidth: '200px',
  },
  tabActive: {
    backgroundColor: '#3e3e40',
    color: '#ffffff',
  },
  tabHover: {
    backgroundColor: '#323233',
  },
  tabLabel: {
    flex: 1,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  dirtyIndicator: {
    color: '#e0e0e0',
    fontWeight: 'bold' as const,
    fontSize: '14px',
  },
  closeButton: {
    marginLeft: '8px',
    border: 'none',
    background: 'transparent',
    color: '#cccccc',
    fontSize: '16px',
    lineHeight: '13px',
    cursor: 'pointer',
    padding: 0,
    opacity: 1,
    transition: 'opacity 0.15s ease',
    verticalAlign: 'middle',
    position: 'relative' as const,
    top: '2px'
  },
  closeButtonVisible: {
    opacity: 1,
  },
  tabContextMenuItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    color: '#cccccc',
    fontSize: '13px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  tabContextMenuSeparator: {
    height: '1px',
    backgroundColor: '#3e3e42',
    margin: '4px 0',
  },
};

