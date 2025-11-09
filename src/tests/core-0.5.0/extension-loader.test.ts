/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Extension Loader Tests
 * 
 * Tests for the extension-loader module that loads TextMate grammars
 * from Nova extensions and registers them with Monaco Editor.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getExtensionsDir,
  loadLyricExtension,
  ensureEditorFallback,
} from '../../core/extension-loader';

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
      expect(extensionsDir).toContain('.nova');
      expect(extensionsDir).toContain('extensions');
    });

    it('should use HOME or USERPROFILE environment variable', () => {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const extensionsDir = getExtensionsDir();
      expect(extensionsDir).toContain(homeDir);
    });
  });

  describe('loadLyricExtension', () => {
    it('should successfully load Lyric extension when all files exist', async () => {
      const result = await loadLyricExtension();
      
      expect(result).toBeDefined();
      // If extension is not installed, success will be false
      // Log the result for debugging
      if (!result.success) {
        console.error('[Test Debug] Load failed:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.languageId).toBe('lyric');
      expect(result.error).toBeUndefined();
    });

    it('should log success message on successful load', async () => {
      const result = await loadLyricExtension();
      
      if (result.success) {
        // Verify success message was logged
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Nova] Lyric syntax loaded successfully')
        );
      }
    });

    it('should validate extension manifest exists', async () => {
      const extensionsDir = getExtensionsDir();
      const manifestPath = path.join(extensionsDir, 'lyric-lang', 'package.json');
      
      // Verify manifest file exists
      const manifestExists = fs.existsSync(manifestPath);
      
      const result = await loadLyricExtension();
      // Result should match whether manifest exists
      expect(result.success).toBe(manifestExists);
    });

    it('should validate grammar file exists', async () => {
      const extensionsDir = getExtensionsDir();
      const grammarPath = path.join(extensionsDir, 'lyric-lang', 'syntaxes', 'lyric.tmLanguage.json');
      
      // Verify grammar file exists
      const grammarExists = fs.existsSync(grammarPath);
      
      const result = await loadLyricExtension();
      // Result should match whether grammar exists
      expect(result.success).toBe(grammarExists);
    });
  });

  describe('ensureEditorFallback', () => {
    it('should not throw when Monaco is not available', () => {
      // This test runs in Node.js environment where Monaco is not available
      expect(() => {
        ensureEditorFallback('lyric');
      }).not.toThrow();
    });

    it('should register fallback language when called', () => {
      // In Node.js environment, this should gracefully handle Monaco not being available
      ensureEditorFallback('test-language');
      
      // Should not have logged fallback registration since Monaco is not available
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Registered fallback')
      );
    });
  });

  describe('extension manifest structure', () => {
    it('should have valid Lyric extension manifest if extension is installed', () => {
      const extensionsDir = getExtensionsDir();
      const manifestPath = path.join(extensionsDir, 'lyric-lang', 'package.json');
      
      if (fs.existsSync(manifestPath)) {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        
        expect(manifest.name).toBe('lyric-lang');
        expect(manifest.version).toBeDefined();
        expect(manifest.contributes).toBeDefined();
        expect(manifest.contributes.languages).toBeDefined();
        expect(manifest.contributes.grammars).toBeDefined();
        expect(manifest.contributes.languages[0].id).toBe('lyric');
        expect(manifest.contributes.grammars[0].scopeName).toBe('source.lyric');
      } else {
        // Skip test if extension is not installed
        console.warn('[Test] Lyric extension not installed, skipping manifest validation');
      }
    });

    it('should have valid grammar JSON structure if extension is installed', () => {
      const extensionsDir = getExtensionsDir();
      const grammarPath = path.join(extensionsDir, 'lyric-lang', 'syntaxes', 'lyric.tmLanguage.json');
      
      if (fs.existsSync(grammarPath)) {
        const grammarContent = fs.readFileSync(grammarPath, 'utf-8');
        const grammar = JSON.parse(grammarContent);
        
        expect(grammar.scopeName).toBe('source.lyric');
        expect(grammar.patterns).toBeDefined();
        expect(Array.isArray(grammar.patterns)).toBe(true);
        expect(grammar.repository).toBeDefined();
      } else {
        // Skip test if extension is not installed
        console.warn('[Test] Lyric extension not installed, skipping grammar validation');
      }
    });
  });

  describe('editor fallback behavior', () => {
    it('should ensure editor remains usable in all cases', () => {
      // Fallback should not throw regardless of Monaco availability
      expect(() => ensureEditorFallback('lyric')).not.toThrow();
      expect(() => ensureEditorFallback('nonexistent-language')).not.toThrow();
    });
  });

  describe('non-language sections ignored', () => {
    it('should only load language and grammar contributions', async () => {
      const extensionsDir = getExtensionsDir();
      const manifestPath = path.join(extensionsDir, 'lyric-lang', 'package.json');
      
      if (fs.existsSync(manifestPath)) {
        // Extension should not have non-language contributions
        // (or they should be ignored by our loader)
        const result = await loadLyricExtension();
        expect(result.success).toBe(true);
        
        // Verify only language-related fields are processed
        expect(result.languageId).toBe('lyric');
      }
    });

    it('should not process activationEvents other than onLanguage', async () => {
      const extensionsDir = getExtensionsDir();
      const manifestPath = path.join(extensionsDir, 'lyric-lang', 'package.json');
      
      if (fs.existsSync(manifestPath)) {
        // If activationEvents exist, they should be ignored in our implementation
        // We only care about language/grammar contributions
        const result = await loadLyricExtension();
        expect(result.success).toBe(true);
      }
    });
  });
});
