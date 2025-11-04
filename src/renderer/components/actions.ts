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
  onToggleTheme?: () => void | Promise<void>;
  onOpenSettings?: () => void | Promise<void>;
  onOpenDiagnostics?: () => void | Promise<void>;
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

  // Toggle Theme action
  actions.push({
    id: 'toggle-theme',
    label: 'Toggle Theme',
    handler: () => {
      callHandler(context.onToggleTheme);
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

  // Diagnostics action
  actions.push({
    id: 'diagnostics',
    label: 'System Diagnostics',
    handler: () => {
      callHandler(context.onOpenDiagnostics);
    },
  });

  // Editor: Format Document
  actions.push({
    id: 'format-document',
    label: 'Format Document',
    handler: () => {
      callHandler(context.onFormatDocument);
    },
  });

  // Editor: Go to Definition
  actions.push({
    id: 'go-to-definition',
    label: 'Go to Definition',
    handler: () => {
      callHandler(context.onGoToDefinition);
    },
  });

  // Editor: Find References
  actions.push({
    id: 'find-references',
    label: 'Find All References',
    handler: () => {
      callHandler(context.onFindReferences);
    },
  });

  // Editor: Rename Symbol
  actions.push({
    id: 'rename-symbol',
    label: 'Rename Symbol',
    handler: () => {
      callHandler(context.onRenameSymbol);
    },
  });

  // Editor: Run Linting
  actions.push({
    id: 'run-linting',
    label: 'Run Linting',
    handler: () => {
      callHandler(context.onRunLinting);
    },
  });

  return actions;
}

