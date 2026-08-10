/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * menu.ts - Application menu configuration
 */

import { Menu, MenuItemConstructorOptions, BrowserWindow } from 'electron';
import { logInfo } from './logger';
import { getSetting } from './settings';
import { NOVI_SHORTCUTS, EDITOR_TERMINAL_SHORTCUTS, computeEffectiveAccelerator, defaultKeyboardShortcutsSettings } from '../core/shortcuts/shortcut-registry';
import type { KeyboardShortcutsSettings, ShortcutDef } from '../core/shortcuts/shortcut-registry';

function loadKeyboardShortcutsSettings(): KeyboardShortcutsSettings {
  const stored = getSetting<Partial<KeyboardShortcutsSettings>>('keyboardShortcuts', undefined);
  const defaults = defaultKeyboardShortcutsSettings();
  return {
    novi: stored?.novi ?? defaults.novi,
    editorTerminal: stored?.editorTerminal ?? defaults.editorTerminal,
  };
}

function getEffectiveAccelerators(defs: ShortcutDef[], settings: KeyboardShortcutsSettings): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const def of defs) {
    result[def.id] = computeEffectiveAccelerator(def, settings) ?? undefined;
  }
  return result;
}

/**
 * Resolves the current effective accelerator for every Novi-category
 * shortcut (default unless the user customized it in Options → Keyboard
 * Shortcuts). Read fresh on every menu build so a settings change just
 * needs a `buildMenu` + `Menu.setApplicationMenu` re-call to take effect —
 * the same pattern already used for the devtools/show-hidden-files items.
 */
function getEffectiveNoviAccelerators(): Record<string, string | undefined> {
  return getEffectiveAccelerators(NOVI_SHORTCUTS, loadKeyboardShortcutsSettings());
}

/**
 * Resolves the current effective accelerator for every Terminal+Editor
 * shortcut that still has a menu item (Save, Undo, Copy, etc.). These items
 * use `registerAccelerator: false` — see createMenuTemplate — so this value
 * is display-only; the real key handling lives in the renderer (App.ts),
 * since which target (editor vs. terminal) a keypress applies to depends on
 * which tab is focused, something the native menu can't express.
 */
function getEffectiveEditorTerminalAccelerators(): Record<string, string | undefined> {
  return getEffectiveAccelerators(EDITOR_TERMINAL_SHORTCUTS, loadKeyboardShortcutsSettings());
}

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
  | 'command-palette'
  | 'debug'
  | 'reset-workspace'
  | 'toggle-devtools'
  | 'about'
  | 'documentation'
  | 'report-issue'
  | 'check-updates'
  | 'settings'
  | 'show-hidden-files';

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
  const accel = getEffectiveNoviAccelerators();
  const sharedAccel = getEffectiveEditorTerminalAccelerators();

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: accel['new-file'],
          click: () => executeCommand('new-file', mainWindow),
        },
        {
          label: 'Open File…',
          accelerator: accel['open-file'],
          click: () => executeCommand('open-file', mainWindow),
        },
        { type: 'separator' },
        {
          // Save/Save As live in the Terminal+Editor shortcut category (they
          // route to whichever tab is focused), so the actual key handling
          // is done in the renderer — this accelerator is display-only.
          label: 'Save',
          accelerator: sharedAccel['save'],
          registerAccelerator: false,
          click: () => executeCommand('save', mainWindow),
        },
        {
          label: 'Save As…',
          accelerator: sharedAccel['save-as'],
          registerAccelerator: false,
          click: () => executeCommand('save-as', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Close File',
          accelerator: accel['close-file'],
          click: () => executeCommand('close-file', mainWindow),
        },
        { type: 'separator' },
        {
          // Novi's registry entry defaults to the Windows/Linux binding
          // (Alt+F4); macOS keeps its own convention regardless of any
          // customization, matching the platform-specific default it's
          // shown with in Settings.
          label: 'Exit',
          accelerator: isMac ? 'Cmd+Q' : (accel['exit'] || 'Alt+F4'),
          click: () => executeCommand('exit', mainWindow),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          // Undo/Redo/Cut/Copy/Paste/Find/Replace all live in the
          // Terminal+Editor shortcut category and route to whichever tab is
          // focused — real key handling is in the renderer, so these
          // accelerators are display-only (registerAccelerator: false).
          label: 'Undo',
          accelerator: sharedAccel['undo'],
          registerAccelerator: false,
          click: () => executeCommand('undo', mainWindow),
        },
        {
          label: 'Redo',
          accelerator: sharedAccel['redo'],
          registerAccelerator: false,
          click: () => executeCommand('redo', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: sharedAccel['cut'],
          registerAccelerator: false,
          click: () => executeCommand('cut', mainWindow),
        },
        {
          label: 'Copy',
          accelerator: sharedAccel['copy'],
          registerAccelerator: false,
          click: () => executeCommand('copy', mainWindow),
        },
        {
          label: 'Paste',
          accelerator: sharedAccel['paste'],
          registerAccelerator: false,
          click: () => executeCommand('paste', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Find…',
          accelerator: sharedAccel['find'],
          registerAccelerator: false,
          click: () => executeCommand('find', mainWindow),
        },
        {
          label: 'Replace…',
          accelerator: sharedAccel['replace'],
          registerAccelerator: false,
          click: () => executeCommand('replace', mainWindow),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: accel['toggle-fullscreen'],
          click: () => executeCommand('toggle-fullscreen', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: accel['zoom-in'],
          click: () => executeCommand('zoom-in', mainWindow),
        },
        {
          label: 'Zoom Out',
          accelerator: accel['zoom-out'],
          click: () => executeCommand('zoom-out', mainWindow),
        },
        {
          label: 'Reset Zoom',
          accelerator: accel['zoom-reset'],
          click: () => executeCommand('zoom-reset', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Show Hidden Files',
          type: 'checkbox',
          checked: !!getSetting<boolean>('showhiddenfiles', false),
          click: () => executeCommand('show-hidden-files', mainWindow),
        },
      ],
    },
    {
      label: 'Novi',
      submenu: [
        {
          label: 'Settings',
          accelerator: accel['settings'],
          click: () => executeCommand('settings', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'New Terminal',
          accelerator: accel['new-terminal'],
          click: () => executeCommand('new-terminal', mainWindow),
        },
        {
          label: 'Command Palette',
          click: () => executeCommand('command-palette', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Debug',
          click: () => executeCommand('debug', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Clear Workspace',
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
          label: !!getSetting<boolean>('devToolsEnabled', false) ? 'Disable Developer Tools' : 'Enable Developer Tools',
          accelerator: accel['toggle-devtools'],
          click: () => executeCommand('toggle-devtools', mainWindow),
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => executeCommand('check-updates', mainWindow),
        },
        {
          label: 'About Novi',
          click: () => executeCommand('about', mainWindow),
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
