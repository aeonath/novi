/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * menu.ts - Application menu configuration
 */

import { Menu, MenuItemConstructorOptions, BrowserWindow } from 'electron';
import { logInfo } from './logger';

export type MenuCommand = 
  | 'new-file'
  | 'open-file'
  | 'save'
  | 'save-as'
  | 'close-file'
  | 'close-terminal'
  | 'exit'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'find'
  | 'replace'
  | 'toggle-fullscreen'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset'
  | 'new-terminal'
  | 'novi-prompt'
  | 'command-palette'
  | 'debug'
  | 'reset-workspace'
  | 'toggle-devtools'
  | 'about'
  | 'documentation'
  | 'report-issue'
  | 'check-updates';

let commandHandler: ((command: MenuCommand, window: BrowserWindow) => void) | null = null;

export function setMenuCommandHandler(handler: (command: MenuCommand, window: BrowserWindow) => void): void {
  commandHandler = handler;
  logInfo('[Menu] Command handler registered');
}

function executeCommand(command: MenuCommand, window: BrowserWindow): void {
  if (commandHandler) {
    commandHandler(command, window);
  }
}

function createMenuTemplate(mainWindow: BrowserWindow): MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
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
          accelerator: 'CmdOrCtrl+Y',
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
          label: 'Find…',
          accelerator: 'CmdOrCtrl+F',
          click: () => executeCommand('find', mainWindow),
        },
        {
          label: 'Replace…',
          accelerator: 'CmdOrCtrl+H',
          click: () => executeCommand('replace', mainWindow),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => executeCommand('toggle-fullscreen', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => executeCommand('zoom-in', mainWindow),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => executeCommand('zoom-out', mainWindow),
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => executeCommand('zoom-reset', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => executeCommand('toggle-devtools', mainWindow),
        },
      ],
    },
    {
      label: 'Novi',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+`',
          click: () => executeCommand('new-terminal', mainWindow),
        },
        {
          label: 'Novi Shell',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => executeCommand('novi-prompt', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => executeCommand('command-palette', mainWindow),
          enabled: false,
        },
        { type: 'separator' },
        {
          label: 'Debug',
          click: () => executeCommand('debug', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Reset Workspace',
          click: () => executeCommand('reset-workspace', mainWindow),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => executeCommand('documentation', mainWindow),
        },
        {
          label: 'Report Issue',
          click: () => executeCommand('report-issue', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'About Novi',
          click: () => executeCommand('about', mainWindow),
        },
        {
          label: 'Check for Updates',
          click: () => executeCommand('check-updates', mainWindow),
        },
      ],
    },
  ];

  return template;
}

export function buildMenu(mainWindow: BrowserWindow): Menu {
  const template = createMenuTemplate(mainWindow);
  const menu = Menu.buildFromTemplate(template);
  logInfo('[Menu] Application menu built');
  return menu;
}

export function initializeMenu(mainWindow: BrowserWindow): void {
  const menu = buildMenu(mainWindow);
  Menu.setApplicationMenu(menu);
  logInfo('[Menu] Application menu initialized');
}
