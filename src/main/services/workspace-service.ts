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
   * Saves workspace state to disk using key-value pairs
   */
  async saveWorkspace(state: WorkspaceState): Promise<void> {
    try {
      await this.ensureConfigDir();
      
      // Convert state to key-value pairs
      const lines: string[] = [];
      
      // Basic properties
      lines.push(`workspaceRoot=${state.workspaceRoot || ''}`);
      lines.push(`activeTabId=${state.activeTabId || ''}`);
      lines.push(`activeTabType=${state.activeTabType || ''}`);
      lines.push(`showGitPanel=${state.layout.showGitPanel}`);
      lines.push(`lastSaved=${new Date().toISOString()}`);
      
      // Open files (store as delimited list of paths)
      const filePaths = state.openFiles.map(f => f.filePath).join('|');
      lines.push(`openFiles=${filePaths}`);
      
      // Open files dirty state (parallel array)
      const dirtyStates = state.openFiles.map(f => f.isDirty ? '1' : '0').join('|');
      lines.push(`openFilesDirty=${dirtyStates}`);
      
      // Terminal IDs
      const terminalIds = state.openTerminals.map(t => t.id).join('|');
      lines.push(`openTerminals=${terminalIds}`);
      
      // Nova Prompt IDs
      const promptIds = state.openNovaPrompts.map(p => p.id).join('|');
      lines.push(`openNovaPrompts=${promptIds}`);
      
      const content = lines.join('\n');
      await writeFile(this.workspaceFile, content, 'utf-8');
      
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
   * Loads workspace state from disk (key-value pairs)
   */
  async loadWorkspace(): Promise<WorkspaceState | null> {
    try {
      if (!existsSync(this.workspaceFile)) {
        console.log('[WorkspaceManager] No workspace file found, starting fresh');
        return null;
      }

      const content = await readFile(this.workspaceFile, 'utf-8');
      const lines = content.split('\n');
      
      // Parse key-value pairs
      const config: Record<string, string> = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        
        const key = trimmed.substring(0, idx);
        const value = trimmed.substring(idx + 1);
        config[key] = value;
      }
      
      // Reconstruct WorkspaceState
      const openFilePaths = config.openFiles ? config.openFiles.split('|').filter(p => p) : [];
      const dirtyStates = config.openFilesDirty ? config.openFilesDirty.split('|') : [];
      
      const openFiles = openFilePaths.map((filePath, i) => ({
        filePath,
        isDirty: dirtyStates[i] === '1',
      }));
      
      const terminalIds = config.openTerminals ? config.openTerminals.split('|').filter(id => id) : [];
      const openTerminals = terminalIds.map(id => ({
        id,
        name: 'bash',
      }));
      
      const promptIds = config.openNovaPrompts ? config.openNovaPrompts.split('|').filter(id => id) : [];
      const openNovaPrompts = promptIds.map(id => ({
        id,
        name: 'nova>',
      }));
      
      const state: WorkspaceState = {
        workspaceRoot: config.workspaceRoot || null,
        openFiles,
        openTerminals,
        openNovaPrompts,
        activeTabId: config.activeTabId || null,
        activeTabType: (config.activeTabType as any) || null,
        layout: {
          showGitPanel: config.showGitPanel === 'true',
        },
        lastSaved: config.lastSaved || new Date().toISOString(),
      };
      
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
        await writeFile(this.workspaceFile, '', 'utf-8');
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

