/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for TerminalHistoryService — persists each terminal tab's
 * serialized scrollback to disk on quit and restores it on the next
 * "Restore Previous Session" launch. Same fs-mocking pattern as
 * workspace-service.test.ts.
 */

import { TerminalHistoryService } from '../../main/services/terminal-history-service';
import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync, mkdirSync, readdirSync } from 'fs';

jest.mock('fs/promises');
jest.mock('fs');

describe('TerminalHistoryService', () => {
  let service: TerminalHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
    (readdirSync as jest.Mock).mockReturnValue([]);
    service = new TerminalHistoryService();
  });

  describe('saveAll', () => {
    it('writes one file per non-empty entry, named by tab index', async () => {
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.saveAll([
        { index: 0, text: 'first tab scrollback' },
        { index: 1, text: 'second tab scrollback' },
      ]);

      expect(writeFile).toHaveBeenCalledTimes(2);
      const paths = (writeFile as jest.Mock).mock.calls.map((c) => c[0]);
      expect(paths.some((p: string) => p.endsWith('terminal-0.hist'))).toBe(true);
      expect(paths.some((p: string) => p.endsWith('terminal-1.hist'))).toBe(true);
    });

    it('skips writing a file for an entry with empty text', async () => {
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.saveAll([
        { index: 0, text: '' },
        { index: 1, text: 'has content' },
      ]);

      expect(writeFile).toHaveBeenCalledTimes(1);
      expect((writeFile as jest.Mock).mock.calls[0][0]).toContain('terminal-1.hist');
    });

    it('creates the history directory if it does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.saveAll([{ index: 0, text: 'x' }]);

      expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('prunes leftover terminal-N.hist files at or beyond the new entry count', async () => {
      (writeFile as jest.Mock).mockResolvedValue(undefined);
      (unlink as jest.Mock).mockResolvedValue(undefined);
      (readdirSync as jest.Mock).mockReturnValue([
        'terminal-0.hist', 'terminal-1.hist', 'terminal-2.hist', 'terminal-3.hist', 'unrelated.txt',
      ]);

      // Only 2 tabs open now — files for indices 2 and 3 are stale.
      await service.saveAll([
        { index: 0, text: 'a' },
        { index: 1, text: 'b' },
      ]);

      const deletedPaths = (unlink as jest.Mock).mock.calls.map((c) => c[0]);
      expect(deletedPaths.some((p: string) => p.endsWith('terminal-2.hist'))).toBe(true);
      expect(deletedPaths.some((p: string) => p.endsWith('terminal-3.hist'))).toBe(true);
      expect(deletedPaths.some((p: string) => p.endsWith('terminal-0.hist'))).toBe(false);
      expect(deletedPaths.some((p: string) => p.endsWith('unrelated.txt'))).toBe(false);
    });

    it('does not throw if writing fails', async () => {
      // Intentionally triggers the service's own console.error for this failure — silence it here.
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        (writeFile as jest.Mock).mockRejectedValue(new Error('disk full'));
        await expect(service.saveAll([{ index: 0, text: 'x' }])).resolves.toBeUndefined();
      } finally {
        errorSpy.mockRestore();
      }
    });
  });

  describe('loadAll', () => {
    it('reads terminal-0.hist through terminal-{count-1}.hist in order', async () => {
      (readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.endsWith('terminal-0.hist')) return Promise.resolve('history for tab 0');
        if (path.endsWith('terminal-1.hist')) return Promise.resolve('history for tab 1');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.loadAll(2);

      expect(result).toEqual(['history for tab 0', 'history for tab 1']);
    });

    it('returns an empty string for a tab with no saved history file', async () => {
      (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await service.loadAll(3);

      expect(result).toEqual(['', '', '']);
    });
  });

  describe('clearAll', () => {
    it('deletes every terminal-N.hist file', async () => {
      (readdirSync as jest.Mock).mockReturnValue(['terminal-0.hist', 'terminal-1.hist', 'unrelated.txt']);
      (unlink as jest.Mock).mockResolvedValue(undefined);

      await service.clearAll();

      const deletedPaths = (unlink as jest.Mock).mock.calls.map((c) => c[0]);
      expect(deletedPaths.some((p: string) => p.endsWith('terminal-0.hist'))).toBe(true);
      expect(deletedPaths.some((p: string) => p.endsWith('terminal-1.hist'))).toBe(true);
      expect(deletedPaths.some((p: string) => p.endsWith('unrelated.txt'))).toBe(false);
    });

    it('does nothing if the history directory does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await service.clearAll();

      expect(unlink).not.toHaveBeenCalled();
    });
  });
});
