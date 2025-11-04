/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * TabBar - Tab management for multiple open files (React)
 */

import React, { useState, useCallback } from 'react';

export interface Tab {
  id: string;
  type: 'file' | 'terminal';
  filePath: string; // For files: actual path, for terminals: terminal ID
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

export const TabBar: React.FC<TabBarProps> = ({ onTabSwitch, onTabClose, onAllTabsClosed }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const addTab = useCallback((tab: Tab) => {
    setTabs((prevTabs) => {
      // For file tabs, check if tab already exists by filePath
      // For terminal tabs, always create new (allow multiple terminals)
      if (tab.type === 'file') {
        const existingTab = prevTabs.find((t) => t.type === 'file' && t.filePath === tab.filePath);
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
      getActiveTab,
      getTabs,
    };
    return () => {
      delete (window as any).__tabBarAPI;
    };
  }, [addTab, removeTab, switchTab, updateTabDirty, updateTabContent, getActiveTab, getTabs]);

  if (tabs.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>No files open</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onSelect={() => switchTab(tab.id)}
          onClose={() => void removeTab(tab.id)}
        />
      ))}
    </div>
  );
};

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onSelect, onClose }) => {
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
    >
      <span style={styles.tabLabel}>
        {tab.fileName}
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
    color: '#007acc',
    fontWeight: 'bold' as const,
  },
  closeButton: {
    marginLeft: '8px',
    width: '18px',
    height: '18px',
    border: 'none',
    background: 'transparent',
    color: '#cccccc',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    opacity: 1,
    transition: 'opacity 0.15s ease',
  },
  closeButtonVisible: {
    opacity: 1,
  },
};

