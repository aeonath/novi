/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { createDefaultActions, ActionContext } from '../../renderer/components/actions';

describe('Actions', () => {
  describe('createDefaultActions', () => {
    it('should create default actions with all handlers', () => {
      const context: ActionContext = {
        onOpenFile: jest.fn(),
        onSaveFile: jest.fn(),
        onSaveFileAs: jest.fn(),
        onReloadFile: jest.fn(),
        onCloseFile: jest.fn(),
        onToggleTheme: jest.fn(),
        onOpenSettings: jest.fn(),
        onOpenDiagnostics: jest.fn(),
      };

      const actions = createDefaultActions(context);

      expect(actions).toHaveLength(8); // Core IDE actions (editor commands removed for simplicity)
      expect(actions[0].id).toBe('open-file');
      expect(actions[0].label).toBe('Open File');
      expect(actions[1].id).toBe('save-file');
      expect(actions[1].label).toBe('Save File');
      expect(actions[2].id).toBe('save-file-as');
      expect(actions[2].label).toBe('Save File As...');
      expect(actions[3].id).toBe('reload-file');
      expect(actions[3].label).toBe('Reload File');
      expect(actions[4].id).toBe('close-file');
      expect(actions[4].label).toBe('Close File');
      expect(actions[5].id).toBe('toggle-theme');
      expect(actions[5].label).toBe('Toggle Theme');
      expect(actions[6].id).toBe('settings');
      expect(actions[6].label).toBe('Settings');
      expect(actions[7].id).toBe('diagnostics');
      expect(actions[7].label).toBe('System Diagnostics');
    });

    it('should call onOpenFile handler when Open File action is executed', () => {
      const onOpenFile = jest.fn();
      const context: ActionContext = {
        onOpenFile,
      };

      const actions = createDefaultActions(context);
      const openFileAction = actions.find((a) => a.id === 'open-file');

      expect(openFileAction).toBeDefined();
      if (openFileAction) {
        void Promise.resolve(openFileAction.handler());
        expect(onOpenFile).toHaveBeenCalled();
      }
    });

    it('should call onToggleTheme handler when Toggle Theme action is executed', () => {
      const onToggleTheme = jest.fn();
      const context: ActionContext = {
        onToggleTheme,
      };

      const actions = createDefaultActions(context);
      const toggleThemeAction = actions.find((a) => a.id === 'toggle-theme');

      expect(toggleThemeAction).toBeDefined();
      if (toggleThemeAction) {
        void Promise.resolve(toggleThemeAction.handler());
        expect(onToggleTheme).toHaveBeenCalled();
      }
    });

    it('should call onOpenSettings handler when Settings action is executed', () => {
      const onOpenSettings = jest.fn();
      const context: ActionContext = {
        onOpenSettings,
      };

      const actions = createDefaultActions(context);
      const settingsAction = actions.find((a) => a.id === 'settings');

      expect(settingsAction).toBeDefined();
      if (settingsAction) {
        void Promise.resolve(settingsAction.handler());
        expect(onOpenSettings).toHaveBeenCalled();
      }
    });

    it('should handle missing handlers gracefully', () => {
      const context: ActionContext = {};

      const actions = createDefaultActions(context);

      expect(actions).toHaveLength(8); // Core IDE actions (editor commands removed for simplicity)
      // Should not throw when handlers are missing
      actions.forEach((action) => {
        expect(() => {
          void Promise.resolve(action.handler());
        }).not.toThrow();
      });
    });

    it('should handle async handlers', async () => {
      const asyncHandler = jest.fn().mockResolvedValue(undefined);
      const context: ActionContext = {
        onOpenFile: asyncHandler,
      };

      const actions = createDefaultActions(context);
      const openFileAction = actions.find((a) => a.id === 'open-file');

      expect(openFileAction).toBeDefined();
      if (openFileAction) {
        await Promise.resolve(openFileAction.handler());
        expect(asyncHandler).toHaveBeenCalled();
      }
    });

    it('should create actions with correct structure', () => {
      const context: ActionContext = {
        onOpenFile: jest.fn(),
        onToggleTheme: jest.fn(),
        onOpenSettings: jest.fn(),
      };

      const actions = createDefaultActions(context);

      actions.forEach((action) => {
        expect(action).toHaveProperty('id');
        expect(action).toHaveProperty('label');
        expect(action).toHaveProperty('handler');
        expect(typeof action.id).toBe('string');
        expect(typeof action.label).toBe('string');
        expect(typeof action.handler).toBe('function');
      });
    });

    it('should create all eight default actions', () => {
      const context: ActionContext = {
        onOpenFile: jest.fn(),
        onSaveFile: jest.fn(),
        onSaveFileAs: jest.fn(),
        onReloadFile: jest.fn(),
        onCloseFile: jest.fn(),
        onToggleTheme: jest.fn(),
        onOpenSettings: jest.fn(),
        onOpenDiagnostics: jest.fn(),
      };

      const actions = createDefaultActions(context);

      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain('open-file');
      expect(actionIds).toContain('save-file');
      expect(actionIds).toContain('save-file-as');
      expect(actionIds).toContain('reload-file');
      expect(actionIds).toContain('close-file');
      expect(actionIds).toContain('toggle-theme');
      expect(actionIds).toContain('settings');
      expect(actionIds).toContain('diagnostics');
    });

    it('should call onReloadFile handler when Reload File action is executed', () => {
      const onReloadFile = jest.fn();
      const context: ActionContext = {
        onReloadFile,
      };

      const actions = createDefaultActions(context);
      const reloadFileAction = actions.find((a) => a.id === 'reload-file');

      expect(reloadFileAction).toBeDefined();
      if (reloadFileAction) {
        void Promise.resolve(reloadFileAction.handler());
        expect(onReloadFile).toHaveBeenCalled();
      }
    });

    it('should call onCloseFile handler when Close File action is executed', () => {
      const onCloseFile = jest.fn();
      const context: ActionContext = {
        onCloseFile,
      };

      const actions = createDefaultActions(context);
      const closeFileAction = actions.find((a) => a.id === 'close-file');

      expect(closeFileAction).toBeDefined();
      if (closeFileAction) {
        void Promise.resolve(closeFileAction.handler());
        expect(onCloseFile).toHaveBeenCalled();
      }
    });

    it('should call onOpenDiagnostics handler when System Diagnostics action is executed', () => {
      const onOpenDiagnostics = jest.fn();
      const context: ActionContext = {
        onOpenDiagnostics,
      };

      const actions = createDefaultActions(context);
      const diagnosticsAction = actions.find((a) => a.id === 'diagnostics');

      expect(diagnosticsAction).toBeDefined();
      if (diagnosticsAction) {
        void Promise.resolve(diagnosticsAction.handler());
        expect(onOpenDiagnostics).toHaveBeenCalled();
      }
    });

    it('should call onSaveFile handler when Save File action is executed', () => {
      const onSaveFile = jest.fn();
      const context: ActionContext = {
        onSaveFile,
      };

      const actions = createDefaultActions(context);
      const saveFileAction = actions.find((a) => a.id === 'save-file');

      expect(saveFileAction).toBeDefined();
      if (saveFileAction) {
        void Promise.resolve(saveFileAction.handler());
        expect(onSaveFile).toHaveBeenCalled();
      }
    });

    it('should call onSaveFileAs handler when Save File As action is executed', () => {
      const onSaveFileAs = jest.fn();
      const context: ActionContext = {
        onSaveFileAs,
      };

      const actions = createDefaultActions(context);
      const saveFileAsAction = actions.find((a) => a.id === 'save-file-as');

      expect(saveFileAsAction).toBeDefined();
      if (saveFileAsAction) {
        void Promise.resolve(saveFileAsAction.handler());
        expect(onSaveFileAs).toHaveBeenCalled();
      }
    });
  });
});

