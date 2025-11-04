/**
 * Auto-Save Service
 * Provides automatic backup of unsaved editor content
 */

import type { Tab } from '../components/tab-bar.js';

export interface AutoSaveOptions {
  enabled: boolean;
  intervalMs: number; // milliseconds between auto-saves
}

export interface RecoveryFile {
  id: string;
  originalPath: string;
  timestamp: number;
  content: string;
}

export class AutoSaveService {
  private options: AutoSaveOptions;
  private intervalId: NodeJS.Timeout | null = null;
  private getDirtyTabsCallback: (() => Tab[]) | null = null;
  private onAutoSaveCallback: ((tabs: Tab[]) => void) | null = null;

  constructor(options: AutoSaveOptions = { enabled: true, intervalMs: 30000 }) {
    this.options = options;
  }

  /**
   * Start the auto-save service
   */
  public start(): void {
    if (!this.options.enabled) {
      return;
    }

    if (this.intervalId) {
      return; // Already running
    }

    console.log(`[AutoSave] Starting with interval ${this.options.intervalMs}ms`);
    
    this.intervalId = setInterval(() => {
      void this.performAutoSave();
    }, this.options.intervalMs);
  }

  /**
   * Stop the auto-save service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[AutoSave] Stopped');
    }
  }

  /**
   * Update auto-save options
   */
  public updateOptions(options: Partial<AutoSaveOptions>): void {
    const wasEnabled = this.options.enabled;
    this.options = { ...this.options, ...options };
    
    // Restart if enabled state changed or interval changed
    if (wasEnabled !== this.options.enabled || options.intervalMs) {
      this.stop();
      if (this.options.enabled) {
        this.start();
      }
    }
  }

  /**
   * Set callback to get dirty tabs
   */
  public onGetDirtyTabs(callback: () => Tab[]): void {
    this.getDirtyTabsCallback = callback;
  }

  /**
   * Set callback for when auto-save occurs
   */
  public onAutoSave(callback: (tabs: Tab[]) => void): void {
    this.onAutoSaveCallback = callback;
  }

  /**
   * Perform auto-save for all dirty tabs
   */
  private async performAutoSave(): Promise<void> {
    if (!this.getDirtyTabsCallback) {
      return;
    }

    const dirtyTabs = this.getDirtyTabsCallback();
    
    if (dirtyTabs.length === 0) {
      return;
    }

    console.log(`[AutoSave] Saving ${dirtyTabs.length} dirty tab(s)`);

    try {
      // Save recovery files for all dirty tabs
      await window.api?.saveRecoveryFiles(dirtyTabs);
      
      // Notify callback
      if (this.onAutoSaveCallback) {
        this.onAutoSaveCallback(dirtyTabs);
      }
    } catch (error) {
      console.error('[AutoSave] Failed to save recovery files:', error);
    }
  }

  /**
   * Manually trigger auto-save
   */
  public async triggerAutoSave(): Promise<void> {
    await this.performAutoSave();
  }

  /**
   * Check if auto-save is enabled
   */
  public isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * Get current interval
   */
  public getInterval(): number {
    return this.options.intervalMs;
  }
}

