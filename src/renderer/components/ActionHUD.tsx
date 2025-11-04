/**
 * ActionHUD - Contextual action interface (React)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface Action {
  id: string;
  label: string;
  handler: () => void | Promise<void>;
}

export interface ActionHUDProps {
  actions?: Action[];
}

export const ActionHUD: React.FC<ActionHUDProps> = ({ actions: initialActions = [] }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [filteredActions, setFilteredActions] = useState<Action[]>(initialActions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Update filtered actions when filter text changes
  useEffect(() => {
    if (!filterText.trim()) {
      setFilteredActions(actions);
      setSelectedIndex(0);
      return;
    }

    const filtered = actions.filter((action) =>
      action.label.toLowerCase().includes(filterText.toLowerCase())
    );
    setFilteredActions(filtered);
    setSelectedIndex(0);
  }, [filterText, actions]);

  // Show/hide methods
  const show = useCallback(() => {
    setIsVisible(true);
    setFilterText('');
    setSelectedIndex(0);
    // Focus input after a brief delay to ensure DOM is ready
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setFilterText('');
  }, []);

  const toggle = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  // Execute selected action
  const executeAction = useCallback(async (index: number) => {
    if (index < 0 || index >= filteredActions.length) return;

    const action = filteredActions[index];
    hide();
    await action.handler();
  }, [filteredActions, hide]);

  // Global keyboard listeners (Ctrl/Cmd + K or Space)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys themselves
      if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) {
        return;
      }

      // Ctrl/Cmd + K or Ctrl/Cmd + Space to toggle
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        toggle();
      }

      // Escape to close
      if (e.key === 'Escape' && isVisible) {
        e.preventDefault();
        hide();
      }
    };

    // Use capture phase to intercept before Monaco
    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, [isVisible, toggle, hide]);

  // Local keyboard listeners (when HUD is visible)
  useEffect(() => {
    if (!isVisible) return;

    const handleLocalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredActions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void executeAction(selectedIndex);
      }
    };

    document.addEventListener('keydown', handleLocalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleLocalKeyDown);
    };
  }, [isVisible, selectedIndex, filteredActions.length, executeAction]);

  // Expose methods to window for backward compatibility
  useEffect(() => {
    (window as any).__actionHUDAPI = {
      show,
      hide,
      toggle,
      setActions: (newActions: Action[]) => {
        setActions(newActions);
        setFilteredActions(newActions);
      },
    };

    return () => {
      delete (window as any).__actionHUDAPI;
    };
  }, [show, hide, toggle]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={styles.overlay}
      onClick={hide}
    >
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type to filter actions..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={styles.input}
        />
        <ul style={styles.list}>
          {filteredActions.length === 0 ? (
            <li style={styles.emptyState}>No actions found</li>
          ) : (
            filteredActions.map((action, index) => (
              <li
                key={action.id}
                style={{
                  ...styles.item,
                  ...(index === selectedIndex ? styles.itemSelected : {}),
                }}
                onClick={() => void executeAction(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {action.label}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    display: 'flex',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '20vh',
  },
  container: {
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    minWidth: '400px',
    maxWidth: '600px',
    maxHeight: '60vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  input: {
    padding: '12px 16px',
    background: '#252526',
    border: 'none',
    borderBottom: '1px solid #333',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    overflowY: 'auto' as const,
    maxHeight: '50vh',
  },
  item: {
    padding: '12px 16px',
    cursor: 'pointer',
    color: '#cccccc',
    borderBottom: '1px solid #2d2d30',
    transition: 'background-color 0.15s ease',
  },
  itemSelected: {
    backgroundColor: '#094771',
    color: '#ffffff',
  },
  emptyState: {
    padding: '12px 16px',
    color: '#858585',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
  },
};

