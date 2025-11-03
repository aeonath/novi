import { app } from 'electron';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function getLogFile(): string {
  const dir = join(app.getPath('userData'), 'logs');
  mkdirSync(dir, { recursive: true });
  // Use date-based log file: YYYY-MM-DD.log
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  return join(dir, `${dateStr}.log`);
}

function line(level: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}\n`;
}

export function logInfo(message: string): void {
  const logLine = line('INFO', message);
  // Print to console
  console.log(logLine.trim());
  // Write to file
  try {
    appendFileSync(getLogFile(), logLine);
  } catch {
    // Silently ignore file write errors
  }
}

export function logError(message: string, error?: unknown): void {
  const stack = error instanceof Error ? `\n${error.stack}` : error ? `\n${String(error)}` : '';
  const logLine = line('ERROR', `${message}${stack}`);
  // Print to console
  console.error(logLine.trim());
  // Write to file
  try {
    appendFileSync(getLogFile(), logLine);
  } catch {
    // Silently ignore file write errors
  }
}


