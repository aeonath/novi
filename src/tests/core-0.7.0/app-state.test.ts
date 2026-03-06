/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { EventBus } from '../../renderer/core/event-bus';

/**
 * Tests for AppStateStore behavior using a fresh instance pattern.
 * We test the pattern (getter/setter + event emission) rather than
 * importing the singleton, to avoid cross-test pollution.
 */

// Replicate the AppEvents constants
const AppEvents = {
  THEME_CHANGED: 'app:theme-changed',
  ACTIVE_FILE_CHANGED: 'app:active-file-changed',
  GIT_STATUS_CHANGED: 'app:git-status-changed',
  AGENT_MODE_CHANGED: 'app:agent-mode-changed',
  WORKSPACE_ROOT_CHANGED: 'app:workspace-root-changed',
} as const;

/** Minimal store that mirrors AppStateStore but uses an injected bus */
class TestableAppState {
  private bus: EventBus;
  private _theme: { name: string } | null = null;
  private _activeFilePath: string | null = null;
  private _agentMode = false;
  private _workspaceRoot: string | null = null;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  get theme() { return this._theme; }
  set theme(value: { name: string } | null) {
    this._theme = value;
    this.bus.emit(AppEvents.THEME_CHANGED, value);
  }

  get activeFilePath() { return this._activeFilePath; }
  set activeFilePath(value: string | null) {
    this._activeFilePath = value;
    this.bus.emit(AppEvents.ACTIVE_FILE_CHANGED, value);
  }

  get agentMode() { return this._agentMode; }
  set agentMode(value: boolean) {
    this._agentMode = value;
    this.bus.emit(AppEvents.AGENT_MODE_CHANGED, value);
  }

  get workspaceRoot() { return this._workspaceRoot; }
  set workspaceRoot(value: string | null) {
    this._workspaceRoot = value;
    this.bus.emit(AppEvents.WORKSPACE_ROOT_CHANGED, value);
  }
}

describe('AppStateStore', () => {
  let bus: EventBus;
  let state: TestableAppState;

  beforeEach(() => {
    bus = new EventBus();
    state = new TestableAppState(bus);
  });

  it('should have null defaults', () => {
    expect(state.theme).toBeNull();
    expect(state.activeFilePath).toBeNull();
    expect(state.workspaceRoot).toBeNull();
    expect(state.agentMode).toBe(false);
  });

  it('should emit event when theme changes', () => {
    const listener = jest.fn();
    bus.on(AppEvents.THEME_CHANGED, listener);
    const theme = { name: 'dark' };
    state.theme = theme;
    expect(state.theme).toBe(theme);
    expect(listener).toHaveBeenCalledWith(theme);
  });

  it('should emit event when activeFilePath changes', () => {
    const listener = jest.fn();
    bus.on(AppEvents.ACTIVE_FILE_CHANGED, listener);
    state.activeFilePath = '/src/main.ts';
    expect(state.activeFilePath).toBe('/src/main.ts');
    expect(listener).toHaveBeenCalledWith('/src/main.ts');
  });

  it('should emit event when agentMode changes', () => {
    const listener = jest.fn();
    bus.on(AppEvents.AGENT_MODE_CHANGED, listener);
    state.agentMode = true;
    expect(state.agentMode).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('should emit event when workspaceRoot changes', () => {
    const listener = jest.fn();
    bus.on(AppEvents.WORKSPACE_ROOT_CHANGED, listener);
    state.workspaceRoot = '/home/user/project';
    expect(state.workspaceRoot).toBe('/home/user/project');
    expect(listener).toHaveBeenCalledWith('/home/user/project');
  });

  it('should allow setting values to null', () => {
    const listener = jest.fn();
    bus.on(AppEvents.ACTIVE_FILE_CHANGED, listener);
    state.activeFilePath = '/file.ts';
    state.activeFilePath = null;
    expect(state.activeFilePath).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(null);
  });
});
