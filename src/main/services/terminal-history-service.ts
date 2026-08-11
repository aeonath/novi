/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * TerminalHistoryService — persists each terminal tab's serialized
 * scrollback buffer (ANSI-formatted text from @xterm/addon-serialize) to
 * disk on quit, and restores it the next time "Restore Previous Session"
 * brings those tabs back.
 *
 * One file per tab, named by its position in the tab list at save time
 * (terminal-0.hist, terminal-1.hist, ...) — terminal IDs are regenerated on
 * every restore, so they can't be used as a stable key, but tab *order* is
 * already how App.ts's workspace restore correlates a saved openTerminals
 * entry to the newly created tab (see loadWorkspace()'s oldToNewTabId map),
 * so history files reuse that same correlation.
 */

import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface TerminalHistoryEntry {
  index: number;
  text: string;
}

export class TerminalHistoryService {
  private historyDir: string;

  constructor() {
    this.historyDir = join(homedir(), '.novi', 'terminal-history');
  }

  private ensureDir(): void {
    if (!existsSync(this.historyDir)) {
      mkdirSync(this.historyDir, { recursive: true });
    }
  }

  private filePath(index: number): string {
    return join(this.historyDir, `terminal-${index}.hist`);
  }

  /**
   * Writes one file per entry, then removes any leftover terminal-N.hist
   * files beyond entries.length — otherwise a session that closes tabs
   * before quitting would leave stale history around for tabs that no
   * longer exist, which a later, larger session could confusingly pick
   * back up under a coincidentally-matching index.
   */
  async saveAll(entries: TerminalHistoryEntry[]): Promise<void> {
    try {
      this.ensureDir();
      await Promise.all(
        entries
          .filter((e) => e.text.length > 0)
          .map((e) => writeFile(this.filePath(e.index), e.text, 'utf-8'))
      );
      await this.pruneBeyond(entries.length);
      console.log('[TerminalHistoryService] Saved history for', entries.length, 'terminal(s)');
    } catch (error) {
      console.error('[TerminalHistoryService] Failed to save terminal history:', error);
    }
  }

  /** Reads terminal-0.hist..terminal-{count-1}.hist; '' for any that don't exist. */
  async loadAll(count: number): Promise<string[]> {
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      try {
        results.push(await readFile(this.filePath(i), 'utf-8'));
      } catch {
        results.push('');
      }
    }
    return results;
  }

  /** Deletes every terminal-N.hist file with N >= keepBelow. */
  private async pruneBeyond(keepBelow: number): Promise<void> {
    if (!existsSync(this.historyDir)) return;
    const files = readdirSync(this.historyDir);
    const stale = files.filter((f) => {
      const m = /^terminal-(\d+)\.hist$/.exec(f);
      return m && Number(m[1]) >= keepBelow;
    });
    await Promise.all(stale.map((f) => unlink(join(this.historyDir, f)).catch(() => {})));
  }

  /** Wipes all saved terminal history — used when the workspace is cleared. */
  async clearAll(): Promise<void> {
    if (!existsSync(this.historyDir)) return;
    try {
      const files = readdirSync(this.historyDir);
      await Promise.all(
        files
          .filter((f) => /^terminal-\d+\.hist$/.test(f))
          .map((f) => unlink(join(this.historyDir, f)).catch(() => {}))
      );
    } catch (error) {
      console.error('[TerminalHistoryService] Failed to clear terminal history:', error);
    }
  }
}

export const terminalHistoryService = new TerminalHistoryService();
