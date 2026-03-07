/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { loadNoviRc, getNoviRcSetting } from '../../main/novirc';
import { existsSync, readFileSync } from 'node:fs';

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('novirc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadNoviRc', () => {
    it('should return empty object if file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      const result = loadNoviRc();
      expect(result).toEqual({});
    });

    it('should parse KEY=VALUE pairs', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('shellType=cmd\nfontSize=16\n');
      const result = loadNoviRc();
      expect(result.shellType).toBe('cmd');
      expect(result.fontSize).toBe(16);
    });

    it('should parse boolean values', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('vimode=true\ndebug=false\n');
      const result = loadNoviRc();
      expect(result.vimode).toBe(true);
      expect(result.debug).toBe(false);
    });

    it('should ignore comments and blank lines', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('# comment\n\nshellType=gitbash\n# another comment\n');
      const result = loadNoviRc();
      expect(Object.keys(result)).toEqual(['shellType']);
      expect(result.shellType).toBe('gitbash');
    });

    it('should handle string values with special characters', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('shellPath=C:\\Program Files\\Git\\bin\\bash.exe\n');
      const result = loadNoviRc();
      expect(result.shellPath).toBe('C:\\Program Files\\Git\\bin\\bash.exe');
    });

    it('should handle value with = sign in it', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('shellPath=C:\\a=b\\bash.exe\n');
      const result = loadNoviRc();
      expect(result.shellPath).toBe('C:\\a=b\\bash.exe');
    });

    it('should ignore malformed lines', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('noequalssign\n=nokey\nvalid=yes\n');
      const result = loadNoviRc();
      expect(Object.keys(result)).toEqual(['valid']);
    });

    it('should return empty object on read error', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => { throw new Error('read error'); });
      const result = loadNoviRc();
      expect(result).toEqual({});
    });
  });

  describe('getNoviRcSetting', () => {
    it('should return undefined when key not present', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('shellType=cmd\n');
      const result = getNoviRcSetting('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return value when key is present', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('shellType=cmd\n');
      const result = getNoviRcSetting<string>('shellType');
      expect(result).toBe('cmd');
    });
  });
});
