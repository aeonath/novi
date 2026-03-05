/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * File System Operation Logger
 * Logs all file system operations to logs/fs.log for debugging and audit trail
 */

import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';

let fsLogPath: string | undefined;
function getFSLogPath(): string {
  if (!fsLogPath) {
    fsLogPath = join(app.getPath('userData'), 'logs', 'fs.log');
  }
  return fsLogPath;
}

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir(): Promise<void> {
  try {
    const logsDir = join(app.getPath('userData'), 'logs');
    await mkdir(logsDir, { recursive: true });
  } catch (error) {
    console.error('[FSLogger] Failed to create logs directory:', error);
  }
}

/**
 * Log a file system operation
 */
export async function logFSOperation(
  operation: string,
  path: string,
  status: 'success' | 'error',
  details?: string
): Promise<void> {
  try {
    await ensureLogsDir();
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${operation.toUpperCase()} | ${status.toUpperCase()} | ${path}${
      details ? ` | ${details}` : ''
    }\n`;
    
    await appendFile(getFSLogPath(), logEntry, 'utf-8');
    
    // Also log to console for development
    if (status === 'error') {
      console.error(`[FSLogger] ${operation} failed:`, path, details);
    } else {
      console.log(`[FSLogger] ${operation}:`, path);
    }
  } catch (error) {
    // Don't throw - logging failures shouldn't break file operations
    console.error('[FSLogger] Failed to write log:', error);
  }
}

/**
 * Log successful operation
 */
export async function logSuccess(operation: string, path: string, details?: string): Promise<void> {
  await logFSOperation(operation, path, 'success', details);
}

/**
 * Log failed operation
 */
export async function logError(operation: string, path: string, error: Error): Promise<void> {
  await logFSOperation(operation, path, 'error', error.message);
}

