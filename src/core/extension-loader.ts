/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Extension Loader - Generic syntax extension loader for Monaco Editor
 *
 * Scans ~/.novi/extensions/ for VSCode-compatible language extensions,
 * reads their TextMate grammars, converts to Monaco Monarch format,
 * and returns everything needed for the renderer to register them.
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Extension manifest (package.json) — VSCode-compatible subset
 */
interface ExtensionManifest {
  name: string;
  displayName?: string;
  version: string;
  description?: string;
  publisher?: string;
  activationEvents?: string[];
  contributes?: {
    languages?: Array<{
      id: string;
      extensions?: string[];
      aliases?: string[];
      configuration?: string;
    }>;
    grammars?: Array<{
      language: string;
      scopeName: string;
      path: string;
    }>;
  };
}

/**
 * Info about a successfully loaded extension, sent to the renderer
 */
export interface LoadedExtension {
  name: string;
  displayName: string;
  version: string;
  description: string;
  publisher: string;
  languageId: string;
  fileExtensions: string[];
  aliases: string[];
  tmGrammar: any; // Raw TextMate grammar JSON (IPC-safe plain objects)
}

/**
 * Result from loadAllExtensions()
 */
export interface ExtensionLoadResult {
  success: boolean;
  error?: string;
  loaded: number;
  discarded: number;
  extensions: LoadedExtension[];
}

/**
 * Get the Novi extensions directory path
 */
export function getExtensionsDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(homeDir, '.novi', 'extensions');
}

/**
 * Check if an extension should be loaded (must have language + grammar contributions)
 */
function shouldLoadExtension(manifest: ExtensionManifest): { load: boolean; reason?: string } {
  if (!manifest.contributes?.languages?.length || !manifest.contributes?.grammars?.length) {
    return { load: false, reason: 'No language or grammar contributions' };
  }

  if (manifest.activationEvents) {
    const hasNonLanguageEvent = manifest.activationEvents.some(
      event => !event.startsWith('onLanguage:')
    );
    if (hasNonLanguageEvent) {
      return { load: false, reason: 'Has non-language activation events' };
    }
  }

  return { load: true };
}

/**
 * Load all syntax extensions from ~/.novi/extensions/
 *
 * Each subdirectory should be a VSCode-compatible language extension with:
 * - package.json with contributes.languages and contributes.grammars
 * - A TextMate grammar file (.tmLanguage.json)
 */
export async function loadAllExtensions(): Promise<ExtensionLoadResult> {
  try {
    const extensionsDir = getExtensionsDir();

    if (!fs.existsSync(extensionsDir)) {
      fs.mkdirSync(extensionsDir, { recursive: true });
    }

    const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
    const extensionDirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({ name: entry.name, dirPath: path.join(extensionsDir, entry.name) }));

    const loaded: LoadedExtension[] = [];
    let discarded = 0;

    for (const { name, dirPath } of extensionDirs) {
      try {
        const manifestPath = path.join(dirPath, 'package.json');
        if (!fs.existsSync(manifestPath)) {
          console.log(`[Novi] Skipping '${name}': No package.json`);
          discarded++;
          continue;
        }

        const manifest: ExtensionManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const { load, reason } = shouldLoadExtension(manifest);
        if (!load) {
          console.log(`[Novi] Skipping '${name}': ${reason}`);
          discarded++;
          continue;
        }

        const language = manifest.contributes!.languages![0];
        const grammarDef = manifest.contributes!.grammars![0];
        if (!language || !grammarDef) {
          console.log(`[Novi] Skipping '${name}': Empty language or grammar`);
          discarded++;
          continue;
        }

        const grammarPath = path.join(dirPath, grammarDef.path);
        if (!fs.existsSync(grammarPath)) {
          console.log(`[Novi] Skipping '${name}': Grammar file not found: ${grammarDef.path}`);
          discarded++;
          continue;
        }

        const tmGrammar = JSON.parse(fs.readFileSync(grammarPath, 'utf-8'));

        loaded.push({
          name: manifest.name,
          displayName: manifest.displayName || manifest.name,
          version: manifest.version,
          description: manifest.description || '',
          publisher: manifest.publisher || '',
          languageId: language.id,
          fileExtensions: language.extensions || [],
          aliases: language.aliases || [],
          tmGrammar,
        });

        console.log(`[Novi] Loaded extension '${manifest.displayName || manifest.name}' (${language.id})`);
      } catch (error) {
        console.log(`[Novi] Skipping '${name}': ${error instanceof Error ? error.message : String(error)}`);
        discarded++;
      }
    }

    console.log(`[Novi] ${loaded.length} extension(s) loaded, ${discarded} discarded.`);

    return { success: true, loaded: loaded.length, discarded, extensions: loaded };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      loaded: 0,
      discarded: 0,
      extensions: [],
    };
  }
}
