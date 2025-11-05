/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * WorkspaceManager - Persists workspace state between sessions
 * Handles saving and loading workspace configuration including open files, active tab, and layout
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface WorkspaceState {
  workspaceRoot: string | null;
  openFiles: Array<{
    filePath: string;
    content?: string;
    isDirty?: boolean;
  }>;
  openTerminals: Array<{
    id: string;
    name: string;
  }>;
  openNovaPrompts: Array<{
    id: string;
    name: string;
  }>;
  activeTabId: string | null;
  activeTabType: 'file' | 'terminal' | 'nova-prompt' | null;
  layout: {
    showGitPanel: boolean;
    gitPanelCollapsed?: boolean;
  };
  gitBranch?: string;
  lastSaved: string;
}

export class WorkspaceManager {
  private configDir: string;
  private workspaceFile: string;

  constructor() {
    // Store workspace in user's home directory under .nova
    this.configDir = join(homedir(), '.nova');
    this.workspaceFile = join(this.configDir, 'workspacerc.json');
  }

  /**
   * Ensures the config directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    if (!existsSync(this.configDir)) {
      await mkdir(this.configDir, { recursive: true });
      console.log('[WorkspaceManager] Created config directory:', this.configDir);
    }
  }

  /**
   * Saves workspace state to disk
   */
  async saveWorkspace(state: WorkspaceState): Promise<void> {
    try {
      await this.ensureConfigDir();
      
      // Add timestamp
      const stateWithTimestamp: WorkspaceState = {
        ...state,
        lastSaved: new Date().toISOString(),
      };

      const json = JSON.stringify(stateWithTimestamp, null, 2);
      await writeFile(this.workspaceFile, json, 'utf-8');
      
      console.log('[WorkspaceManager] Workspace saved:', this.workspaceFile);
      console.log('[WorkspaceManager] Root:', state.workspaceRoot);
      console.log('[WorkspaceManager] Open files:', state.openFiles.length);
      console.log('[WorkspaceManager] Open terminals:', state.openTerminals.length);
      console.log('[WorkspaceManager] Open prompts:', state.openNovaPrompts.length);
    } catch (error) {
      console.error('[WorkspaceManager] Failed to save workspace:', error);
      throw error;
    }
  }

  /**
   * Loads workspace state from disk
   */
  async loadWorkspace(): Promise<WorkspaceState | null> {
    try {
      if (!existsSync(this.workspaceFile)) {
        console.log('[WorkspaceManager] No workspace file found, starting fresh');
        return null;
      }

      const json = await readFile(this.workspaceFile, 'utf-8');
      const state = JSON.parse(json) as WorkspaceState;
      
      console.log('[WorkspaceManager] Workspace loaded:', this.workspaceFile);
      console.log('[WorkspaceManager] Root:', state.workspaceRoot);
      console.log('[WorkspaceManager] Open files:', state.openFiles?.length || 0);
      console.log('[WorkspaceManager] Open terminals:', state.openTerminals?.length || 0);
      console.log('[WorkspaceManager] Open prompts:', state.openNovaPrompts?.length || 0);
      console.log('[WorkspaceManager] Last saved:', state.lastSaved);
      
      return state;
    } catch (error) {
      console.error('[WorkspaceManager] Failed to load workspace:', error);
      return null;
    }
  }

  /**
   * Clears the saved workspace state
   */
  async clearWorkspace(): Promise<void> {
    try {
      if (existsSync(this.workspaceFile)) {
        await writeFile(this.workspaceFile, '{}', 'utf-8');
        console.log('[WorkspaceManager] Workspace cleared');
      }
    } catch (error) {
      console.error('[WorkspaceManager] Failed to clear workspace:', error);
      throw error;
    }
  }

  /**
   * Gets the workspace file path for debugging
   */
  getWorkspaceFilePath(): string {
    return this.workspaceFile;
  }
}

// Singleton instance
export const workspaceManager = new WorkspaceManager();

