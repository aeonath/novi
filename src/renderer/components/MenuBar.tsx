/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * MenuBar - Application menu bar component
 * Renders in-window menu bar like VS Code
 */

import React, { useState, useEffect, useRef } from 'react';

interface MenuItem {
  label: string;
  command?: string;
  shortcut?: string;
  submenu?: MenuItem[];
  separator?: boolean;
}

interface MenuBarProps {
  onCommand?: (command: string) => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ onCommand }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: 'New File', command: 'new-file', shortcut: 'Ctrl+N' },
      { label: 'Open File…', command: 'open-file', shortcut: 'Ctrl+O' },
      { separator: true },
      { label: 'Save', command: 'save', shortcut: 'Ctrl+S' },
      { label: 'Save As…', command: 'save-as', shortcut: 'Ctrl+Shift+S' },
      { separator: true },
      { label: 'Close File', command: 'close-file', shortcut: 'Ctrl+W' },
      { separator: true },
      { label: 'Exit', command: 'exit', shortcut: 'Alt+F4' },
    ],
    Edit: [
      { label: 'Undo', command: 'undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', command: 'redo', shortcut: 'Ctrl+Y' },
      { separator: true },
      { label: 'Cut', command: 'cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', command: 'copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', command: 'paste', shortcut: 'Ctrl+V' },
      { separator: true },
      { label: 'Select All', command: 'select-all', shortcut: 'Ctrl+A' },
    ],
    View: [
      { label: 'Toggle Word Wrap', command: 'toggle-word-wrap' },
      { label: 'Toggle Line Numbers', command: 'toggle-line-numbers' },
      { separator: true },
      { label: 'Increase Font Size', command: 'increase-font-size', shortcut: 'Ctrl+Plus' },
      { label: 'Decrease Font Size', command: 'decrease-font-size', shortcut: 'Ctrl+-' },
      { label: 'Reset Font Size', command: 'reset-font-size', shortcut: 'Ctrl+0' },
      { separator: true },
      {
        label: 'Theme',
        submenu: [
          { label: 'Light', command: 'theme-light' },
          { label: 'Dark', command: 'theme-dark' },
          { label: 'System', command: 'theme-system' },
        ],
      },
      { separator: true },
      { label: 'Action HUD', command: 'action-hud', shortcut: 'Ctrl+K' },
    ],
    Nova: [
      { label: 'New Terminal', command: 'new-terminal', shortcut: 'Ctrl+T' },
      { label: 'Nova Prompt', command: 'nova-prompt', shortcut: 'Ctrl+Shift+N' },
      { label: 'Nova Agile', command: 'nova-agile', shortcut: 'Ctrl+Shift+A' },
      { separator: true },
      { label: 'Command Palette', command: 'command-palette', shortcut: 'Ctrl+P' },
    ],
    Help: [
      { label: 'About Nova', command: 'about' },
      { label: 'Documentation', command: 'documentation' },
      { separator: true },
      { label: 'Check for Updates', command: 'check-updates' },
    ],
  };

  const handleMenuClick = (menuName: string, event: React.MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (openMenu === menuName) {
      setOpenMenu(null);
      setMenuPosition(null);
    } else {
      setOpenMenu(menuName);
      setMenuPosition({
        top: rect.bottom,
        left: rect.left,
      });
    }
  };

  const handleItemClick = (command?: string) => {
    if (command && onCommand) {
      onCommand(command);
    }
    setOpenMenu(null);
    setMenuPosition(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
        setMenuPosition(null);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenu]);

  // Close menu on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMenuPosition(null);
      }
    };

    if (openMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [openMenu]);

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.separator) {
      return <div key={`sep-${index}`} style={styles.separator} />;
    }

    if (item.submenu) {
      return (
        <div
          key={index}
          style={styles.menuItem}
          onMouseEnter={(e) => {
            const target = e.currentTarget;
            target.style.backgroundColor = '#094771';
          }}
          onMouseLeave={(e) => {
            const target = e.currentTarget;
            target.style.backgroundColor = 'transparent';
          }}
        >
          <span>{item.label}</span>
          <span style={styles.submenuArrow}>▶</span>
        </div>
      );
    }

    return (
      <div
        key={index}
        style={styles.menuItem}
        onClick={() => handleItemClick(item.command)}
        onMouseEnter={(e) => {
          const target = e.currentTarget;
          target.style.backgroundColor = '#094771';
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget;
          target.style.backgroundColor = 'transparent';
        }}
      >
        <span>{item.label}</span>
        {item.shortcut && <span style={styles.shortcut}>{item.shortcut}</span>}
      </div>
    );
  };

  return (
    <div ref={menuBarRef} style={styles.container}>
      {Object.keys(menus).map((menuName) => (
        <div
          key={menuName}
          style={{
            ...styles.menuButton,
            ...(openMenu === menuName ? styles.menuButtonActive : {}),
          }}
          onClick={(e) => handleMenuClick(menuName, e)}
          onMouseEnter={(e) => {
            if (openMenu && openMenu !== menuName) {
              handleMenuClick(menuName, e);
            }
          }}
        >
          {menuName}
        </div>
      ))}

      {openMenu && menuPosition && (
        <div
          style={{
            ...styles.dropdown,
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          {menus[openMenu].map((item, index) => renderMenuItem(item, index))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    height: '30px',
    backgroundColor: '#2d2d30',
    borderBottom: '1px solid #1e1e1e',
    paddingLeft: '8px',
    fontSize: '13px',
    color: '#cccccc',
    userSelect: 'none',
    position: 'relative',
    zIndex: 1000,
  },
  menuButton: {
    padding: '0 12px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  menuButtonActive: {
    backgroundColor: '#094771',
  },
  dropdown: {
    position: 'fixed',
    backgroundColor: '#252526',
    border: '1px solid #454545',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    minWidth: '220px',
    padding: '4px 0',
    zIndex: 10000,
  },
  menuItem: {
    padding: '6px 20px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.1s',
  },
  separator: {
    height: '1px',
    backgroundColor: '#454545',
    margin: '4px 0',
  },
  shortcut: {
    marginLeft: '40px',
    fontSize: '12px',
    color: '#858585',
  },
  submenuArrow: {
    marginLeft: '20px',
    fontSize: '10px',
    color: '#858585',
  },
};

