/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Extension Loader Tests
 *
 * Tests for the generic extension loader that scans ~/.novi/extensions/
 * and converts TextMate grammars to Monaco Monarch format.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getExtensionsDir,
  loadAllExtensions,
} from '../../core/extension-loader';
import { convertTmToMonarch } from '../../core/tm-to-monarch';

describe('extension-loader', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('getExtensionsDir', () => {
    it('should return the extensions directory path', () => {
      const extensionsDir = getExtensionsDir();
      expect(extensionsDir).toBeDefined();
      expect(extensionsDir).toContain('.novi');
      expect(extensionsDir).toContain('extensions');
    });

    it('should use HOME or USERPROFILE environment variable', () => {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const extensionsDir = getExtensionsDir();
      expect(extensionsDir).toContain(homeDir);
    });
  });

  describe('loadAllExtensions', () => {
    it('should scan extensions directory and return result', async () => {
      const result = await loadAllExtensions();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.loaded).toBe('number');
      expect(typeof result.discarded).toBe('number');
      expect(Array.isArray(result.extensions)).toBe(true);
    });

    it('should handle empty extensions directory', async () => {
      const result = await loadAllExtensions();
      expect(result.success).toBe(true);
      expect(result.loaded).toBeGreaterThanOrEqual(0);
      expect(result.discarded).toBeGreaterThanOrEqual(0);
    });

    it('should log summary', async () => {
      await loadAllExtensions();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[Novi\] \d+ extension\(s\) loaded, \d+ discarded\./)
      );
    });

    it('should load extensions with valid manifests', async () => {
      const result = await loadAllExtensions();
      if (result.loaded > 0) {
        for (const ext of result.extensions) {
          expect(ext.name).toBeDefined();
          expect(ext.languageId).toBeDefined();
          expect(ext.version).toBeDefined();
          expect(Array.isArray(ext.fileExtensions)).toBe(true);
          expect(ext.tmGrammar).toBeDefined();
          expect(ext.tmGrammar.repository).toBeDefined();
        }
      }
    });

    it('should return raw TextMate grammar (not converted Monarch)', async () => {
      const result = await loadAllExtensions();
      if (result.loaded > 0) {
        const ext = result.extensions[0];
        // Raw TM grammar has scopeName and repository, not Monarch tokenizer
        expect(ext.tmGrammar.scopeName || ext.tmGrammar.repository).toBeDefined();
      }
    });
  });

  describe('convertTmToMonarch', () => {
    it('should extract keywords from TextMate repository patterns', () => {
      const tmGrammar = {
        repository: {
          keywords: {
            patterns: [
              { match: '\\b(if|else|for|while)\\b', name: 'keyword.control' },
            ],
          },
        },
      };
      const monarch = convertTmToMonarch(tmGrammar);
      expect(monarch.keywords).toContain('if');
      expect(monarch.keywords).toContain('else');
      expect(monarch.keywords).toContain('for');
      expect(monarch.keywords).toContain('while');
    });

    it('should extract keywords from types and builtins sections', () => {
      const tmGrammar = {
        repository: {
          types: {
            patterns: [
              { match: '\\b(int|str|bool)\\b', name: 'storage.type' },
            ],
          },
          builtins: {
            patterns: [
              { match: '\\b(print|input)\\b', name: 'support.function.builtin' },
            ],
          },
        },
      };
      const monarch = convertTmToMonarch(tmGrammar);
      expect(monarch.keywords).toContain('int');
      expect(monarch.keywords).toContain('str');
      expect(monarch.keywords).toContain('print');
      expect(monarch.keywords).toContain('input');
    });

    it('should handle string patterns with begin/end', () => {
      const tmGrammar = {
        repository: {
          strings: {
            patterns: [
              { begin: '"', end: '"', name: 'string.quoted.double', patterns: [] },
              { begin: "'", end: "'", name: 'string.quoted.single', patterns: [] },
            ],
          },
        },
      };
      const monarch = convertTmToMonarch(tmGrammar);
      expect(monarch.tokenizer.doubleQuoteString).toBeDefined();
      expect(monarch.tokenizer.singleQuoteString).toBeDefined();
    });

    it('should handle comment patterns', () => {
      const tmGrammar = {
        repository: {
          comments: {
            patterns: [
              { match: '#[^\\n]*', name: 'comment.line.number-sign' },
            ],
          },
        },
      };
      const monarch = convertTmToMonarch(tmGrammar);
      // Should have a comment rule in root
      const hasComment = monarch.tokenizer.root.some(
        (rule: any) => Array.isArray(rule) && rule[1] === 'comment'
      );
      expect(hasComment).toBe(true);
    });

    it('should always include number rules', () => {
      const monarch = convertTmToMonarch({ repository: {} });
      const hasFloat = monarch.tokenizer.root.some(
        (rule: any) => Array.isArray(rule) && rule[1] === 'number.float'
      );
      const hasInt = monarch.tokenizer.root.some(
        (rule: any) => Array.isArray(rule) && rule[1] === 'number'
      );
      expect(hasFloat).toBe(true);
      expect(hasInt).toBe(true);
    });

    it('should handle empty grammar gracefully', () => {
      expect(() => convertTmToMonarch({})).not.toThrow();
      expect(() => convertTmToMonarch({ repository: {} })).not.toThrow();
    });

    it('should deduplicate keywords', () => {
      const tmGrammar = {
        repository: {
          keywords: { patterns: [{ match: '\\b(if|else)\\b', name: 'keyword.control' }] },
          types: { patterns: [{ match: '\\b(if|int)\\b', name: 'storage.type' }] },
        },
      };
      const monarch = convertTmToMonarch(tmGrammar);
      const ifCount = monarch.keywords.filter((k: string) => k === 'if').length;
      expect(ifCount).toBe(1);
    });
  });

  describe('extension manifest validation', () => {
    it('should validate installed extensions have correct structure', async () => {
      const extensionsDir = getExtensionsDir();
      if (!fs.existsSync(extensionsDir)) return;

      const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const manifestPath = path.join(extensionsDir, entry.name, 'package.json');
        if (!fs.existsSync(manifestPath)) continue;

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        expect(manifest.name).toBeDefined();
        expect(manifest.version).toBeDefined();
        if (manifest.contributes?.languages) {
          expect(manifest.contributes.languages[0].id).toBeDefined();
        }
      }
    });
  });
});
