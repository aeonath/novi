/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * menu.ts - Application menu bar configuration
 * Defines the Nova IDE menu structure with proper keyboard shortcuts
 */

import { Menu, MenuItemConstructorOptions, BrowserWindow } from 'electron';
import { logInfo } from './logger';

export type MenuCommand = 
  | 'new-file'
  | 'open-file'
  | 'save'
  | 'save-as'
  | 'close-file'
  | 'exit'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'select-all'
  | 'toggle-word-wrap'
  | 'toggle-line-numbers'
  | 'increase-font-size'
  | 'decrease-font-size'
  | 'reset-font-size'
  | 'theme-light'
  | 'theme-dark'
  | 'theme-system'
  | 'action-hud'
  | 'new-terminal'
  | 'nova-prompt'
  | 'nova-agile'
  | 'command-palette'
  | 'reset-workspace'
  | 'about'
  | 'documentation'
  | 'check-updates';

export interface MenuCommandHandler {
  (command: MenuCommand, window: BrowserWindow): void | Promise<void>;
}

let commandHandler: MenuCommandHandler | null = null;

/**
 * Set the menu command handler
 */
export function setMenuCommandHandler(handler: MenuCommandHandler): void {
  commandHandler = handler;
  logInfo('[Menu] Command handler registered');
}

/**
 * Execute a menu command
 */
async function executeCommand(command: MenuCommand, window: BrowserWindow): Promise<void> {
  logInfo(`[Menu] Executing command: ${command}`);
  
  if (!commandHandler) {
    console.warn('[Menu] No command handler registered');
    return;
  }

  try {
    await commandHandler(command, window);
  } catch (error) {
    console.error(`[Menu] Error executing command ${command}:`, error);
  }
}

/**
 * Create menu template
 */
function createMenuTemplate(mainWindow: BrowserWindow): MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => executeCommand('new-file', mainWindow),
        },
        {
          label: 'Open File…',
          accelerator: 'CmdOrCtrl+O',
          click: () => executeCommand('open-file', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => executeCommand('save', mainWindow),
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => executeCommand('save-as', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Close File',
          accelerator: 'CmdOrCtrl+W',
          click: () => executeCommand('close-file', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: isMac ? 'Cmd+Q' : 'Alt+F4',
          click: () => executeCommand('exit', mainWindow),
        },
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => executeCommand('undo', mainWindow),
        },
        {
          label: 'Redo',
          accelerator: isMac ? 'Cmd+Shift+Z' : 'CmdOrCtrl+Y',
          click: () => executeCommand('redo', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          click: () => executeCommand('cut', mainWindow),
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: () => executeCommand('copy', mainWindow),
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          click: () => executeCommand('paste', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => executeCommand('select-all', mainWindow),
        },
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Word Wrap',
          click: () => executeCommand('toggle-word-wrap', mainWindow),
        },
        {
          label: 'Toggle Line Numbers',
          click: () => executeCommand('toggle-line-numbers', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Increase Font Size',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => executeCommand('increase-font-size', mainWindow),
        },
        {
          label: 'Decrease Font Size',
          accelerator: 'CmdOrCtrl+-',
          click: () => executeCommand('decrease-font-size', mainWindow),
        },
        {
          label: 'Reset Font Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => executeCommand('reset-font-size', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            {
              label: 'Light',
              click: () => executeCommand('theme-light', mainWindow),
            },
            {
              label: 'Dark',
              click: () => executeCommand('theme-dark', mainWindow),
            },
            {
              label: 'System',
              click: () => executeCommand('theme-system', mainWindow),
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Action HUD',
          accelerator: 'CmdOrCtrl+K',
          click: () => executeCommand('action-hud', mainWindow),
        },
      ],
    },

    // Nova Menu
    {
      label: 'Nova',
      submenu: [
        {
          label: 'Reset Workspace',
          click: () => executeCommand('reset-workspace', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+T',
          click: () => executeCommand('new-terminal', mainWindow),
        },
        {
          label: 'Nova Prompt',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => executeCommand('nova-prompt', mainWindow),
        },
        {
          label: 'Nova Agile',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => executeCommand('nova-agile', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+P',
          click: () => executeCommand('command-palette', mainWindow),
        },
      ],
    },

    // Help Menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Nova',
          click: () => executeCommand('about', mainWindow),
        },
        {
          label: 'Documentation',
          click: () => executeCommand('documentation', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => executeCommand('check-updates', mainWindow),
        },
      ],
    },
  ];

  return template;
}

/**
 * Build and set the application menu
 */
export function buildMenu(mainWindow: BrowserWindow): Menu {
  const template = createMenuTemplate(mainWindow);
  const menu = Menu.buildFromTemplate(template);
  
  logInfo('[Menu] Application menu built');
  return menu;
}

/**
 * Initialize the application menu for a window
 */
export function initializeMenu(mainWindow: BrowserWindow): void {
  const menu = buildMenu(mainWindow);
  Menu.setApplicationMenu(menu);
  
  logInfo('[Menu] Application menu initialized');
}

