/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * TitleBar - Custom title bar with window controls (React)
 */

import React, { useState, useEffect, useCallback } from 'react';

interface MenuItem {
  label: string;
  command?: string;
  shortcut?: string;
  submenu?: MenuItem[];
  separator?: boolean;
  disabled?: boolean;
}

export interface TitleBarProps {
  title?: string;
  onCommand?: (command: string) => void;
  /** When 'novi-prompt', View > Increase/Decrease/Reset Font Size are disabled (Sprint 6 Task 9.9). */
  activeTabType?: string | null;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title = 'Novi Editor', onCommand, activeTabType }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    // Get initial maximize state
    const updateMaximizeState = async () => {
      if (window.api?.windowIsMaximized) {
        try {
          const maximized = await window.api.windowIsMaximized();
          setIsMaximized(maximized);
        } catch (error) {
          console.error('[TitleBar] Failed to get maximize state:', error);
        }
      }
    };

    void updateMaximizeState();
  }, []);

  const handleMinimize = useCallback(() => {
    if (window.api?.windowMinimize) {
      window.api.windowMinimize();
    }
  }, []);

  const handleMaximize = useCallback(async () => {
    if (window.api?.windowMaximize) {
      window.api.windowMaximize();
      setIsMaximized(!isMaximized);
      
      // Update actual state after window manager processes the request
      setTimeout(async () => {
        if (window.api?.windowIsMaximized) {
          try {
            const maximized = await window.api.windowIsMaximized();
            setIsMaximized(maximized);
          } catch (error) {
            console.error('[TitleBar] Failed to update maximize state:', error);
          }
        }
      }, 100);
    }
  }, [isMaximized]);

  const handleClose = useCallback(() => {
    if (window.api?.windowClose) {
      window.api.windowClose();
    }
  }, []);

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
      { label: 'Action HUD', command: 'action-hud', shortcut: 'Ctrl+K' },
    ],
    Novi: [
      { label: 'New Terminal', command: 'new-terminal', shortcut: 'Ctrl+T' },
      { label: 'Novi Shell', command: 'novi-prompt', shortcut: 'Ctrl+Shift+N' },
      { separator: true },
      { label: 'Command Palette', command: 'command-palette', shortcut: 'Ctrl+P', disabled: true },
      { separator: true },
      { label: 'Reset Workspace', command: 'reset-workspace' },
    ],
    Help: [
      { label: 'About Novi', command: 'about' },
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
      if (openMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.menu-dropdown') && !target.closest('.menu-button')) {
          setOpenMenu(null);
          setMenuPosition(null);
        }
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
      if (event.key === 'Escape' && openMenu) {
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

  const fontCommands = ['increase-font-size', 'decrease-font-size', 'reset-font-size'];
  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.separator) {
      return <div key={`sep-${index}`} style={styles.separator} />;
    }

    const disabled =
      item.disabled === true ||
      (activeTabType === 'novi-prompt' && item.command && fontCommands.includes(item.command));
    return (
      <div
        key={index}
        style={{
          ...styles.menuItem,
          ...(disabled ? { opacity: 0.5, cursor: 'default' } : {}),
        }}
        onClick={() => !disabled && handleItemClick(item.command)}
        onMouseEnter={(e) => {
          if (disabled) return;
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
    <div style={styles.container}>
      <div style={styles.leftSection}>
        <div style={styles.logoContainer}>
          <img src="assets/novi_logo.png" alt="Novi Editor" style={styles.logo} />
        </div>
        <div style={styles.menuBar}>
          {Object.keys(menus).map((menuName) => (
            <div
              key={menuName}
              className="menu-button"
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
        </div>
      </div>

      {openMenu && menuPosition && (
        <div
          className="menu-dropdown"
          style={{
            ...styles.dropdown,
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          {menus[openMenu].map((item, index) => renderMenuItem(item, index))}
        </div>
      )}

      <div style={styles.controls}>
        <div
          className="window-btn window-btn-minimize"
          style={{
            ...styles.button,
            ...(hoveredButton === 'minimize' ? styles.buttonHover : {}),
            ...(activeButton === 'minimize' ? styles.buttonActive : {}),
          }}
          onMouseEnter={() => setHoveredButton('minimize')}
          onMouseLeave={() => setHoveredButton(null)}
          onMouseDown={() => setActiveButton('minimize')}
          onMouseUp={() => setActiveButton(null)}
          onClick={handleMinimize}
          role="button"
          aria-label="Minimize"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleMinimize();
            }
          }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="10" height="1" fill="#cccccc"/>
          </svg>
        </div>

        <div
          className="window-btn window-btn-maximize"
          style={{
            ...styles.button,
            ...(hoveredButton === 'maximize' ? styles.buttonHover : {}),
            ...(activeButton === 'maximize' ? styles.buttonActive : {}),
          }}
          onMouseEnter={() => setHoveredButton('maximize')}
          onMouseLeave={() => setHoveredButton(null)}
          onMouseDown={() => setActiveButton('maximize')}
          onMouseUp={() => setActiveButton(null)}
          onClick={handleMaximize}
          role="button"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              void handleMaximize();
            }
          }}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2V0H10V8H8V10H0V2H2ZM8 2H2V8H8V2Z" fill="#cccccc"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="10" height="10" stroke="#cccccc" strokeWidth="1" fill="none"/>
            </svg>
          )}
        </div>

        <div
          className="window-btn window-btn-close"
          style={{
            ...styles.button,
            ...(hoveredButton === 'close' ? styles.buttonHoverClose : {}),
            ...(activeButton === 'close' ? styles.buttonActiveClose : {}),
          }}
          onMouseEnter={() => setHoveredButton('close')}
          onMouseLeave={() => setHoveredButton(null)}
          onMouseDown={() => setActiveButton('close')}
          onMouseUp={() => setActiveButton(null)}
          onClick={handleClose}
          role="button"
          aria-label="Close"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClose();
            }
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.5 0L0 0.5L4.5 5L0 9.5L0.5 10L5 5.5L9.5 10L10 9.5L5.5 5L10 0.5L9.5 0L5 4.5L0.5 0Z" fill="#cccccc"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '32px',
    backgroundColor: '#1e1e1e',
    color: '#cccccc',
    // WebKit-specific property for window dragging
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    WebkitAppRegion: 'drag',
    userSelect: 'none' as const,
    borderBottom: '1px solid #3e3e42',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    // Keep this draggable - we'll disable drag on interactive elements
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    paddingRight: '12px',
    borderRight: '1px solid #3e3e42',
    height: '32px',
    // Logo area is draggable (inherits from container)
  },
  logo: {
    height: '25px',
    width: 'auto',
    objectFit: 'contain',
    userSelect: 'none',
  },
  menuBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    // Menu bar needs no-drag for interactive buttons
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
  },
  menuButton: {
    padding: '0 10px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.1s',
    userSelect: 'none',
  },
  menuButtonActive: {
    backgroundColor: '#2a2a2a',
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
    fontSize: '12px',
  },
  separator: {
    height: '1px',
    backgroundColor: '#454545',
    margin: '4px 0',
  },
  shortcut: {
    marginLeft: '40px',
    fontSize: '11px',
    color: '#858585',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#1e1e1e',
    // WebKit-specific property
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
  },
  button: {
    width: '46px',
    height: '32px',
    border: 'none',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'background-color 0.15s ease, color 0.15s ease',
    outline: 'none',
  } as React.CSSProperties,
  buttonHover: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
  } as React.CSSProperties,
  buttonActive: {
    backgroundColor: '#333',
  } as React.CSSProperties,
  buttonHoverClose: {
    backgroundColor: '#e81123',
    color: '#fff',
  } as React.CSSProperties,
  buttonActiveClose: {
    backgroundColor: '#c50f1f',
  } as React.CSSProperties,
};

