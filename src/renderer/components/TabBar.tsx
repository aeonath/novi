/**
 * TabBar - Tab management for multiple open files (React)
 */

import React, { useState, useCallback } from 'react';

export interface Tab {
  id: string;
  filePath: string;
  fileName: string;
  isDirty: boolean;
  content: string;
  language: string;
}

export interface TabBarProps {
  onTabSwitch?: (tab: Tab) => void;
  onTabClose?: (tabId: string) => Promise<boolean>;
}

export const TabBar: React.FC<TabBarProps> = ({ onTabSwitch, onTabClose }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const addTab = useCallback((tab: Tab) => {
    setTabs((prevTabs) => {
      // Check if tab already exists
      const existingTab = prevTabs.find((t) => t.filePath === tab.filePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        onTabSwitch?.(existingTab);
        return prevTabs;
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
        }
      }

      return newTabs;
    });

    return true;
  }, [activeTabId, onTabClose, onTabSwitch]);

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
        {tab.isDirty && <span style={styles.dirtyIndicator}> ●</span>}
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
    backgroundColor: '#1e1e1e',
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
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },
  closeButtonVisible: {
    opacity: 1,
  },
};

