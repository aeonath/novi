import { app } from 'electron';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { logError } from './logger';

function getCrashesDir(): string {
  const dir = join(app.getPath('userData'), 'crashes');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function getCrashReportPath(): string {
  const crashesDir = getCrashesDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return join(crashesDir, `crash-${timestamp}.txt`);
}

interface CrashReport {
  timestamp: string;
  type: 'uncaughtException' | 'unhandledRejection' | 'rendererError';
  error: {
    message: string;
    stack?: string;
    name?: string;
  };
  environment: {
    platform: string;
    arch: string;
    nodeVersion: string;
    electronVersion: string;
    appVersion: string;
  };
}

function createCrashReport(
  type: CrashReport['type'],
  error: Error | string | number | boolean | bigint | symbol | object | null | undefined,
  stack?: string
): CrashReport {
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (error === null || error === undefined) {
    errorMessage = 'Unknown error';
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (typeof error === 'object') {
    try {
      errorMessage = JSON.stringify(error);
    } catch {
      errorMessage = '[Object]';
    }
  } else {
    // Primitives: number, boolean, bigint, symbol
    errorMessage = String(error);
  }
  const errorStack = stack ?? (error instanceof Error ? error.stack : undefined);
  const errorName = error instanceof Error ? error.name : undefined;

  return {
    timestamp: new Date().toISOString(),
    type,
    error: {
      message: errorMessage,
      stack: errorStack,
      name: errorName,
    },
    environment: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node ?? 'unknown',
      electronVersion: process.versions.electron ?? 'unknown',
      appVersion: app.getVersion(),
    },
  };
}

function formatCrashReport(report: CrashReport): string {
  let output = `Nova Crash Report\n`;
  output += `=================\n\n`;
  output += `Timestamp: ${report.timestamp}\n`;
  output += `Type: ${report.type}\n\n`;
  output += `Error:\n`;
  output += `  Name: ${report.error.name ?? 'Unknown'}\n`;
  output += `  Message: ${report.error.message}\n`;
  if (report.error.stack) {
    output += `  Stack:\n${report.error.stack}\n`;
  }
  output += `\nEnvironment:\n`;
  output += `  Platform: ${report.environment.platform}\n`;
  output += `  Architecture: ${report.environment.arch}\n`;
  output += `  Node.js Version: ${report.environment.nodeVersion}\n`;
  output += `  Electron Version: ${report.environment.electronVersion}\n`;
  output += `  App Version: ${report.environment.appVersion}\n`;
  return output;
}

export function saveCrashReport(
  type: CrashReport['type'],
  error: Error | string | number | boolean | bigint | symbol | object | null | undefined,
  stack?: string
): string | null {
  try {
    const report = createCrashReport(type, error, stack);
    const reportPath = getCrashReportPath();
    const formattedReport = formatCrashReport(report);
    writeFileSync(reportPath, formattedReport, 'utf-8');
    logError(`Crash report saved: ${reportPath}`, error);
    return reportPath;
  } catch (err) {
    logError('Failed to save crash report', err);
    return null;
  }
}

export function getDiagnosticsInfo(): string {
  const report: CrashReport = {
    timestamp: new Date().toISOString(),
    type: 'rendererError',
    error: {
      message: 'Diagnostics information',
    },
    environment: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node ?? 'unknown',
      electronVersion: process.versions.electron ?? 'unknown',
      appVersion: app.getVersion(),
    },
  };
  return formatCrashReport(report);
}

export function getCrashesDirectory(): string {
  return getCrashesDir();
}

