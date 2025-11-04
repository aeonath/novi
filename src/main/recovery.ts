/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Recovery File Management
 * Handles auto-save recovery file storage and retrieval
 */

import { app } from 'electron';
import { join, basename } from 'node:path';
import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { logInfo, logError } from './logger';

export interface RecoveryFile {
  id: string;
  originalPath: string;
  timestamp: number;
  content: string;
}

export interface RecoveryMetadata {
  id: string;
  originalPath: string;
  timestamp: number;
  recoveryPath: string;
}

/**
 * Get the recovery directory path
 */
function getRecoveryDir(): string {
  return join(app.getPath('userData'), 'recovery');
}

/**
 * Ensure recovery directory exists
 */
async function ensureRecoveryDir(): Promise<void> {
  const dir = getRecoveryDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Generate a unique recovery file ID
 */
function generateRecoveryId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get recovery file path from ID
 */
function getRecoveryFilePath(id: string): string {
  return join(getRecoveryDir(), `${id}.recovery`);
}

/**
 * Get recovery metadata file path from ID
 */
function getRecoveryMetaPath(id: string): string {
  return join(getRecoveryDir(), `${id}.meta.json`);
}

/**
 * Save recovery files for dirty tabs
 */
export async function saveRecoveryFiles(tabs: Array<{ filePath: string; content: string }>): Promise<void> {
  await ensureRecoveryDir();
  
  for (const tab of tabs) {
    try {
      const id = generateRecoveryId();
      const recoveryPath = getRecoveryFilePath(id);
      const metaPath = getRecoveryMetaPath(id);
      
      // Save content
      await writeFile(recoveryPath, tab.content, 'utf-8');
      
      // Save metadata
      const metadata: RecoveryMetadata = {
        id,
        originalPath: tab.filePath,
        timestamp: Date.now(),
        recoveryPath,
      };
      await writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
      
      logInfo(`[Recovery] Saved recovery file for ${basename(tab.filePath)} (ID: ${id})`);
    } catch (error) {
      logError(`[Recovery] Failed to save recovery file for ${tab.filePath}`, error);
    }
  }
}

/**
 * Get all available recovery files
 */
export async function getRecoveryFiles(): Promise<RecoveryFile[]> {
  const dir = getRecoveryDir();
  
  if (!existsSync(dir)) {
    return [];
  }
  
  try {
    const files = await readdir(dir);
    const metaFiles = files.filter(f => f.endsWith('.meta.json'));
    
    const recoveryFiles: RecoveryFile[] = [];
    
    for (const metaFile of metaFiles) {
      try {
        const metaPath = join(dir, metaFile);
        const metaContent = await readFile(metaPath, 'utf-8');
        const metadata: RecoveryMetadata = JSON.parse(metaContent);
        
        // Read recovery file content
        const content = await readFile(metadata.recoveryPath, 'utf-8');
        
        recoveryFiles.push({
          id: metadata.id,
          originalPath: metadata.originalPath,
          timestamp: metadata.timestamp,
          content,
        });
      } catch (error) {
        logError(`[Recovery] Failed to read recovery file ${metaFile}`, error);
      }
    }
    
    // Sort by timestamp (newest first)
    recoveryFiles.sort((a, b) => b.timestamp - a.timestamp);
    
    logInfo(`[Recovery] Found ${recoveryFiles.length} recovery file(s)`);
    return recoveryFiles;
  } catch (error) {
    logError('[Recovery] Failed to get recovery files', error);
    return [];
  }
}

/**
 * Delete a recovery file by ID
 */
export async function deleteRecoveryFile(id: string): Promise<void> {
  try {
    const recoveryPath = getRecoveryFilePath(id);
    const metaPath = getRecoveryMetaPath(id);
    
    // Delete both files
    if (existsSync(recoveryPath)) {
      await unlink(recoveryPath);
    }
    if (existsSync(metaPath)) {
      await unlink(metaPath);
    }
    
    logInfo(`[Recovery] Deleted recovery file (ID: ${id})`);
  } catch (error) {
    logError(`[Recovery] Failed to delete recovery file ${id}`, error);
  }
}

/**
 * Clear all recovery files
 */
export async function clearAllRecoveryFiles(): Promise<void> {
  const dir = getRecoveryDir();
  
  if (!existsSync(dir)) {
    return;
  }
  
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = join(dir, file);
      await unlink(filePath);
    }
    
    logInfo('[Recovery] Cleared all recovery files');
  } catch (error) {
    logError('[Recovery] Failed to clear recovery files', error);
  }
}

/**
 * Clean up old recovery files (older than 7 days)
 */
export async function cleanupOldRecoveryFiles(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const recoveryFiles = await getRecoveryFiles();
  const now = Date.now();
  
  for (const file of recoveryFiles) {
    if (now - file.timestamp > maxAgeMs) {
      await deleteRecoveryFile(file.id);
      logInfo(`[Recovery] Deleted old recovery file (ID: ${file.id})`);
    }
  }
}

