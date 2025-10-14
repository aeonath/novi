import { app } from 'electron';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function getLogFile(): string {
  const dir = join(app.getPath('userData'), 'logs');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'nova.log');
}

function line(level: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}\n`;
}

export function logInfo(message: string): void {
  try { appendFileSync(getLogFile(), line('INFO', message)); } catch {}
}

export function logError(message: string, error?: unknown): void {
  const stack = error instanceof Error ? `\n${error.stack}` : error ? `\n${String(error)}` : '';
  try { appendFileSync(getLogFile(), line('ERROR', `${message}${stack}`)); } catch {}
}


