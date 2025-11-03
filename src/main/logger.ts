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
  // eslint-disable-next-line no-console
  console.log(logLine.trim());
  // Write to file
  try {
    appendFileSync(getLogFile(), logLine);
  } catch {
    // Silently ignore file write errors
  }
}

export function logError(message: string, error?: unknown): void {
  let stack = '';
  if (error instanceof Error) {
    stack = `\n${error.stack ?? ''}`;
  } else if (error !== null && error !== undefined) {
    if (typeof error === 'string') {
      stack = `\n${error}`;
    } else if (typeof error === 'object') {
      try {
        stack = `\n${JSON.stringify(error)}`;
      } catch {
        stack = '\n[Object]';
      }
    } else {
      // Primitives: number, boolean, bigint, symbol
      // Use String() for primitives, but ensure it's not an object
      const primitiveValue = error as string | number | boolean | bigint | symbol;
      stack = `\n${String(primitiveValue)}`;
    }
  }
  const logLine = line('ERROR', `${message}${stack}`);
  // Print to console
  // eslint-disable-next-line no-console
  console.error(logLine.trim());
  // Write to file
  try {
    appendFileSync(getLogFile(), logLine);
  } catch {
    // Silently ignore file write errors
  }
}
