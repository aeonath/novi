/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

// Action definitions and handlers
// Centralized action system for reusability

import { Action } from './action-hud.js';

export interface ActionContext {
  onOpenFile?: () => void | Promise<void>;
  onSaveFile?: () => void | Promise<void>;
  onSaveFileAs?: () => void | Promise<void>;
  onReloadFile?: () => void | Promise<void>;
  onCloseFile?: () => void | Promise<void>;
  onNewTerminal?: () => void | Promise<void>;
  onNovaPrompt?: () => void | Promise<void>;
  onOpenSettings?: () => void | Promise<void>;
  // Editor commands
  onFormatDocument?: () => void | Promise<void>;
  onGoToDefinition?: () => void | Promise<void>;
  onFindReferences?: () => void | Promise<void>;
  onRenameSymbol?: () => void | Promise<void>;
  onRunLinting?: () => void | Promise<void>;
}

function callHandler(handler: (() => void | Promise<void>) | undefined): void {
  if (handler) {
    void Promise.resolve(handler());
  }
}

export function createDefaultActions(context: ActionContext): Action[] {
  const actions: Action[] = [];

  // Open File action
  actions.push({
    id: 'open-file',
    label: 'Open File',
    handler: () => {
      callHandler(context.onOpenFile);
    },
  });

  // Save File action
  actions.push({
    id: 'save-file',
    label: 'Save File',
    handler: () => {
      callHandler(context.onSaveFile);
    },
  });

  // Save File As action
  actions.push({
    id: 'save-file-as',
    label: 'Save File As...',
    handler: () => {
      callHandler(context.onSaveFileAs);
    },
  });

  // Reload File action
  actions.push({
    id: 'reload-file',
    label: 'Reload File',
    handler: () => {
      callHandler(context.onReloadFile);
    },
  });

  // Close File action
  actions.push({
    id: 'close-file',
    label: 'Close File',
    handler: () => {
      callHandler(context.onCloseFile);
    },
  });

  // New Terminal action
  actions.push({
    id: 'new-terminal',
    label: 'New Terminal',
    handler: () => {
      callHandler(context.onNewTerminal);
    },
  });

  // Settings action
  actions.push({
    id: 'settings',
    label: 'Settings',
    handler: () => {
      callHandler(context.onOpenSettings);
    },
  });

  // Removed editor actions (Format Document, Go to Definition, etc.)
  // These will be added to the application menu later

  return actions;
}

