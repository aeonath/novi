// Action definitions and handlers
// Centralized action system for reusability

import { Action } from './action-hud';

export interface ActionContext {
  onOpenFile?: () => void | Promise<void>;
  onToggleTheme?: () => void | Promise<void>;
  onOpenSettings?: () => void | Promise<void>;
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

  return actions;
}

