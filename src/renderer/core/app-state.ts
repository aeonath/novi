/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Shared application state module.
 * Replaces React's AppContext with a plain TypeScript store + event bus.
 * Components subscribe to changes via the event bus.
 */

import { bus } from './event-bus.js';
import type { GitStatus } from '../../types/global';

export interface Theme {
  name: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
}

/** Event names emitted when state changes */
export const AppEvents = {
  THEME_CHANGED: 'app:theme-changed',
  ACTIVE_FILE_CHANGED: 'app:active-file-changed',
  GIT_STATUS_CHANGED: 'app:git-status-changed',
  AGENT_MODE_CHANGED: 'app:agent-mode-changed',
  WORKSPACE_ROOT_CHANGED: 'app:workspace-root-changed',
} as const;

class AppStateStore {
  private _theme: Theme | null = null;
  private _activeFilePath: string | null = null;
  private _gitStatus: GitStatus | null = null;
  private _agentMode = false;
  private _workspaceRoot: string | null = null;

  get theme(): Theme | null { return this._theme; }
  set theme(value: Theme | null) {
    this._theme = value;
    bus.emit(AppEvents.THEME_CHANGED, value);
  }

  get activeFilePath(): string | null { return this._activeFilePath; }
  set activeFilePath(value: string | null) {
    this._activeFilePath = value;
    bus.emit(AppEvents.ACTIVE_FILE_CHANGED, value);
  }

  get gitStatus(): GitStatus | null { return this._gitStatus; }
  set gitStatus(value: GitStatus | null) {
    this._gitStatus = value;
    bus.emit(AppEvents.GIT_STATUS_CHANGED, value);
  }

  get agentMode(): boolean { return this._agentMode; }
  set agentMode(value: boolean) {
    this._agentMode = value;
    bus.emit(AppEvents.AGENT_MODE_CHANGED, value);
  }

  get workspaceRoot(): string | null { return this._workspaceRoot; }
  set workspaceRoot(value: string | null) {
    this._workspaceRoot = value;
    bus.emit(AppEvents.WORKSPACE_ROOT_CHANGED, value);
  }
}

/** Global app state singleton */
export const appState = new AppStateStore();
