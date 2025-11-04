/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * StatusBar - Bottom status bar (React)
 */

import React, { useState, useCallback } from 'react';

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  priority?: number;
}

type StatusBarSection = 'left' | 'center' | 'right';

export const StatusBar: React.FC = () => {
  const [items, setItems] = useState<Map<string, { item: StatusBarItem; section: StatusBarSection }>>(
    new Map([['main-status', { item: { id: 'main-status', text: 'Ready', priority: 100 }, section: 'left' }]])
  );

  // Public API exposed via ref (if needed by parent components)
  const setStatus = useCallback((text: string, tooltip?: string) => {
    setItems((prev) => {
      const newItems = new Map(prev);
      newItems.set('main-status', {
        item: { id: 'main-status', text, tooltip, priority: 100 },
        section: 'left',
      });
      return newItems;
    });
  }, []);

  const addItem = useCallback((item: StatusBarItem, section: StatusBarSection = 'right') => {
    setItems((prev) => {
      const newItems = new Map(prev);
      newItems.set(item.id, { item, section });
      return newItems;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const newItems = new Map(prev);
      newItems.delete(id);
      return newItems;
    });
  }, []);

  // Expose methods to parent (via React.useImperativeHandle if needed in the future)
  React.useEffect(() => {
    // Store methods on window for backward compatibility during migration
    (window as any).__statusBarAPI = { setStatus, addItem, removeItem };
    return () => {
      delete (window as any).__statusBarAPI;
    };
  }, [setStatus, addItem, removeItem]);

  // Organize items by section
  const itemsBySection = {
    left: [] as StatusBarItem[],
    center: [] as StatusBarItem[],
    right: [] as StatusBarItem[],
  };

  items.forEach(({ item, section }) => {
    itemsBySection[section].push(item);
  });

  // Sort by priority (higher first)
  Object.keys(itemsBySection).forEach((section) => {
    itemsBySection[section as StatusBarSection].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
  });

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        {itemsBySection.left.map((item) => (
          <StatusBarItemComponent key={item.id} item={item} />
        ))}
      </div>

      <div style={{ ...styles.section, justifyContent: 'center' }}>
        {itemsBySection.center.map((item) => (
          <StatusBarItemComponent key={item.id} item={item} />
        ))}
      </div>

      <div style={{ ...styles.section, justifyContent: 'flex-end' }}>
        {itemsBySection.right.map((item) => (
          <StatusBarItemComponent key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

const StatusBarItemComponent: React.FC<{ item: StatusBarItem }> = ({ item }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.item,
        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
      }}
      title={item.tooltip}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {item.text}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '24px',
    backgroundColor: '#007acc',
    color: '#ffffff',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    fontSize: '12px',
    userSelect: 'none' as const,
    borderTop: '1px solid #005a9e',
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  item: {
    padding: '2px 6px',
    cursor: 'default',
    whiteSpace: 'nowrap' as const,
    transition: 'background-color 0.15s ease',
  },
};

