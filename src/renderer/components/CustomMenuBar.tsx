import React, { useState, useEffect, useRef } from 'react';
import './CustomMenuBar.css';

interface MenuItem {
  label: string;
  type?: 'separator';
  enabled?: boolean;
  accelerator?: string;
  click?: () => void;
  submenu?: MenuItem[];
}

interface CustomMenuBarProps {
  activeTabType: 'file' | 'terminal' | 'nova-prompt' | 'image' | 'workspace-split' | null;
  onCommand: (command: string) => void;
}

export const CustomMenuBar: React.FC<CustomMenuBarProps> = ({ activeTabType, onCommand }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const isTerminal = activeTabType === 'terminal';
  const isFile = activeTabType === 'file';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openMenu) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openMenu]);

  const handleMenuClick = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.enabled !== false && item.click) {
      item.click();
      setOpenMenu(null);
    }
  };

  // Define menu structure
  const menuStructure: Record<string, MenuItem[]> = {
    File: [
      { label: 'New File', accelerator: 'Ctrl+N', click: () => onCommand('new-file') },
      { label: 'Open File…', accelerator: 'Ctrl+O', click: () => onCommand('open-file') },
      { type: 'separator' },
      { 
        label: 'Save', 
        accelerator: 'Ctrl+S', 
        enabled: !isTerminal, 
        click: () => onCommand('save') 
      },
      { 
        label: 'Save As…', 
        accelerator: 'Ctrl+Shift+S', 
        enabled: !isTerminal, 
        click: () => onCommand('save-as') 
      },
      { type: 'separator' },
      { 
        label: isTerminal ? 'Close Terminal' : 'Close File', 
        accelerator: 'Ctrl+W', 
        click: () => onCommand(isTerminal ? 'close-terminal' : 'close-file') 
      },
      { type: 'separator' },
      { label: 'Exit', accelerator: 'Alt+F4', click: () => onCommand('exit') },
    ],
    Edit: [
      { label: 'Undo', accelerator: 'Ctrl+Z', enabled: isFile, click: () => onCommand('undo') },
      { label: 'Redo', accelerator: 'Ctrl+Y', enabled: isFile, click: () => onCommand('redo') },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'Ctrl+X', enabled: isFile, click: () => onCommand('cut') },
      { label: 'Copy', accelerator: 'Ctrl+C', enabled: isFile, click: () => onCommand('copy') },
      { label: 'Paste', accelerator: 'Ctrl+V', enabled: isFile, click: () => onCommand('paste') },
      { type: 'separator' },
      { label: 'Find…', accelerator: 'Ctrl+F', enabled: isFile, click: () => onCommand('find') },
      { label: 'Replace…', accelerator: 'Ctrl+H', enabled: isFile, click: () => onCommand('replace') },
    ],
    View: [
      { label: 'Toggle Full Screen', accelerator: 'F11', click: () => onCommand('toggle-fullscreen') },
      { type: 'separator' },
      { label: 'Zoom In', accelerator: 'Ctrl+=', click: () => onCommand('zoom-in') },
      { label: 'Zoom Out', accelerator: 'Ctrl+-', click: () => onCommand('zoom-out') },
      { label: 'Reset Zoom', accelerator: 'Ctrl+0', click: () => onCommand('zoom-reset') },
      { type: 'separator' },
      { label: 'Toggle Developer Tools', accelerator: 'Ctrl+Shift+I', click: () => onCommand('toggle-devtools') },
    ],
    Nova: [
      { label: 'New Terminal', accelerator: 'Ctrl+`', click: () => onCommand('new-terminal') },
      { label: 'Nova Prompt', accelerator: 'Ctrl+Shift+P', click: () => onCommand('nova-prompt') },
      { label: 'Nova Agile', accelerator: 'Ctrl+Shift+A', click: () => onCommand('nova-agile') },
      { type: 'separator' },
      { label: 'Command Palette', accelerator: 'Ctrl+Shift+P', click: () => onCommand('command-palette') },
      { type: 'separator' },
      { label: 'Debug', click: () => onCommand('debug') },
      { type: 'separator' },
      { label: 'Reset Workspace', click: () => onCommand('reset-workspace') },
    ],
    Help: [
      { label: 'Documentation', click: () => onCommand('documentation') },
      { label: 'Report Issue', click: () => onCommand('report-issue') },
      { type: 'separator' },
      { label: 'About Nova', click: () => onCommand('about') },
      { label: 'Check for Updates', click: () => onCommand('check-updates') },
    ],
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.type === 'separator') {
      return <div key={index} className="menu-separator" />;
    }

    const isDisabled = item.enabled === false;

    return (
      <div
        key={index}
        className={`menu-item ${isDisabled ? 'disabled' : ''}`}
        onClick={() => !isDisabled && handleItemClick(item)}
      >
        <span className="menu-item-label">{item.label}</span>
        {item.accelerator && (
          <span className="menu-item-accelerator">{item.accelerator}</span>
        )}
      </div>
    );
  };

  return (
    <div className="custom-menu-bar" ref={menuBarRef}>
      {Object.keys(menuStructure).map((menuName) => (
        <div key={menuName} className="menu-container">
          <div
            className={`menu-button ${openMenu === menuName ? 'active' : ''}`}
            onClick={() => handleMenuClick(menuName)}
          >
            {menuName}
          </div>
          {openMenu === menuName && (
            <div className="menu-dropdown">
              {menuStructure[menuName].map((item, index) => renderMenuItem(item, index))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

