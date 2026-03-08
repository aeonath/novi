/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * command-stats-service.ts - Track command execution frequency
 * Stores command usage statistics in ~/.novi/action-hud-stats
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

export interface CommandStat {
  command: string;
  count: number;
  lastUsed: string;
}

export interface CommandStats {
  [command: string]: {
    count: number;
    lastUsed: string;
  };
}

class CommandStatsService {
  private stats: CommandStats = {};
  private statsFile: string;
  private configDir: string;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.configDir = join(homedir(), '.novi');
    this.statsFile = join(this.configDir, 'action-hud-stats');
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    if (!existsSync(this.configDir)) {
      await mkdir(this.configDir, { recursive: true });
      console.log('[CommandStats] Created config directory:', this.configDir);
    }
  }

  /**
   * Load stats from disk
   */
  async loadStats(): Promise<void> {
    try {
      if (!existsSync(this.statsFile)) {
        console.log('[CommandStats] No stats file found, starting fresh');
        this.stats = {};
        return;
      }

      const content = await readFile(this.statsFile, 'utf-8');
      const lines = content.split('\n');

      this.stats = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;

        const command = trimmed.substring(0, idx);
        const value = trimmed.substring(idx + 1);
        
        // Parse "count|timestamp" format
        const parts = value.split('|');
        if (parts.length === 2) {
          this.stats[command] = {
            count: parseInt(parts[0], 10) || 0,
            lastUsed: parts[1],
          };
        }
      }

      console.log('[CommandStats] Loaded stats:', Object.keys(this.stats).length, 'commands');
    } catch (error) {
      console.error('[CommandStats] Failed to load stats:', error);
      this.stats = {};
    }
  }

  /**
   * Save stats to disk (debounced)
   */
  private async saveStats(): Promise<void> {
    try {
      await this.ensureConfigDir();

      const lines: string[] = [];
      lines.push('# Nova Command Usage Statistics');
      lines.push('# Format: command=count|lastUsed');
      lines.push('');

      for (const [command, data] of Object.entries(this.stats)) {
        lines.push(`${command}=${data.count}|${data.lastUsed}`);
      }

      const content = lines.join('\n');
      await writeFile(this.statsFile, content, 'utf-8');

      console.log('[CommandStats] Saved stats:', Object.keys(this.stats).length, 'commands');
    } catch (error) {
      console.error('[CommandStats] Failed to save stats:', error);
    }
  }

  /**
   * Debounced save - save after 1 second of inactivity
   */
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      void this.saveStats();
    }, 1000);
  }

  /**
   * Record a command execution
   */
  recordCommand(command: string): void {
    if (!this.stats[command]) {
      this.stats[command] = {
        count: 0,
        lastUsed: new Date().toISOString(),
      };
    }

    this.stats[command].count += 1;
    this.stats[command].lastUsed = new Date().toISOString();

    console.log(`[CommandStats] Recorded: ${command} (count: ${this.stats[command].count})`);

    this.debouncedSave();
  }

  /**
   * Get top N most frequently used commands
   */
  getTopCommands(limit: number = 8): CommandStat[] {
    const sorted = Object.entries(this.stats)
      .map(([command, data]) => ({
        command,
        count: data.count,
        lastUsed: data.lastUsed,
      }))
      .sort((a, b) => {
        // Sort by count (descending), then by last used (most recent first)
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });

    return sorted.slice(0, limit);
  }

  /**
   * Get all command stats
   */
  getAllStats(): CommandStats {
    return { ...this.stats };
  }

  /**
   * Clear all stats
   */
  async clearStats(): Promise<void> {
    this.stats = {};
    await this.saveStats();
    console.log('[CommandStats] All stats cleared');
  }

  /**
   * Get stats file path for debugging
   */
  getStatsFilePath(): string {
    return this.statsFile;
  }
}

// Export singleton instance
export const commandStatsService = new CommandStatsService();

