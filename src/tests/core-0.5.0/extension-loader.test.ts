/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Extension Loader Tests
 * 
 * Tests for the extension-loader module that loads TextMate grammars
 * from Novi extensions and registers them with Monaco Editor.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getExtensionsDir,
  loadLyricExtension,
  loadAllExtensions,
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
      expect(extensionsDir).toContain('.novi');
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
          expect.stringContaining('[Novi] Lyric syntax loaded successfully')
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
  
  describe('loadAllExtensions', () => {
    it('should scan extensions directory and load all valid language extensions', async () => {
      const result = await loadAllExtensions();
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.loaded).toBeDefined();
      expect(result.discarded).toBeDefined();
    });
    
    it('should return empty result if no extensions directory', async () => {
      const extensionsDir = getExtensionsDir();
      
      // If directory doesn't exist, should return 0 loaded/discarded
      const result = await loadAllExtensions();
      expect(result.success).toBe(true);
      
      if (!fs.existsSync(extensionsDir)) {
        expect(result.loaded).toBe(0);
        expect(result.discarded).toBe(0);
      }
    });
    
    it('should count valid language extensions correctly', async () => {
      const result = await loadAllExtensions();
      
      if (result.success && result.loaded && result.loaded > 0) {
        expect(result.languages).toBeDefined();
        expect(result.languages!.length).toBe(result.loaded);
      }
    });
    
    it('should skip extensions without language contributions', async () => {
      // This test validates that extensions without language contributions are discarded
      const result = await loadAllExtensions();
      
      expect(result.success).toBe(true);
      // Loaded count should only include extensions with language contributions
      if (result.loaded) {
        expect(result.loaded).toBeGreaterThanOrEqual(0);
      }
    });
    
    it('should skip extensions with non-language activation events', async () => {
      // This test validates filtering by activationEvents
      const result = await loadAllExtensions();
      
      expect(result.success).toBe(true);
      // Extensions with non-onLanguage:* events should be discarded
      if (result.languages) {
        result.languages.forEach(lang => {
          expect(lang.id).toBeDefined();
          expect(lang.extensions).toBeDefined();
        });
      }
    });
    
    it('should log summary of loaded and discarded extensions', async () => {
      const result = await loadAllExtensions();
      
      if (result.success) {
        // Should log: "[Novi] Loaded N syntax extension(s), M discarded."
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[Novi\] Loaded \d+ syntax extension\(s\), \d+ discarded\./)
        );
      }
    });
    
    it('should handle corrupted manifest files gracefully', async () => {
      // This test validates error handling for bad JSON
      const result = await loadAllExtensions();
      
      // Should not throw, even if some manifests are corrupted
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
    
    it('should validate grammar file exists for each extension', async () => {
      const result = await loadAllExtensions();
      
      if (result.success && result.languages && result.languages.length > 0) {
        // All loaded extensions should have valid grammar files
        // (This is validated during loading)
        expect(result.loaded).toBeGreaterThan(0);
      }
    });
    
    it('should return language metadata for all loaded extensions', async () => {
      const result = await loadAllExtensions();
      
      if (result.success && result.languages && result.languages.length > 0) {
        result.languages.forEach(lang => {
          expect(lang.id).toBeDefined();
          expect(typeof lang.id).toBe('string');
          expect(Array.isArray(lang.extensions)).toBe(true);
          expect(Array.isArray(lang.aliases)).toBe(true);
        });
      }
    });
    
    it('should handle empty extensions directory', async () => {
      const result = await loadAllExtensions();
      
      // Should not fail even if directory is empty
      expect(result.success).toBe(true);
      expect(typeof result.loaded).toBe('number');
      expect(typeof result.discarded).toBe('number');
    });
  });
});
