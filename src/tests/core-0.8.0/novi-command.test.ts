/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import * as os from 'os';
import * as path from 'path';
import * as net from 'net';
import * as fs from 'fs';

import { getPipePath, parseStartupArgs, cliService } from '../../main/services/cli-service';
import { parseCliModeArgs } from '../../main/cli-mode';

jest.mock('fs');
jest.mock('net');

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeMockWindow(overrides: Record<string, unknown> = {}) {
  return {
    isDestroyed: jest.fn(() => false),
    isMinimized: jest.fn(() => false),
    restore: jest.fn(),
    focus: jest.fn(),
    setAlwaysOnTop: jest.fn(),
    webContents: { send: jest.fn() },
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. getPipePath
// ──────────────────────────────────────────────────────────────────────────────

describe('getPipePath', () => {
  it('returns <homedir>/.novi/novi-editor.sock on all platforms', () => {
    expect(getPipePath()).toBe(path.join(os.homedir(), '.novi', 'novi-editor.sock'));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. parseCliModeArgs
// ──────────────────────────────────────────────────────────────────────────────

describe('parseCliModeArgs', () => {
  const cwd = '/home/user/project';

  it('returns new-file when no user args follow --novi-cli', () => {
    expect(parseCliModeArgs(['--novi-cli'], cwd)).toEqual({ cmd: 'new-file' });
  });

  it('returns open-terminal with the caller cwd for -t', () => {
    expect(parseCliModeArgs(['--novi-cli', '-t'], cwd)).toEqual({ cmd: 'open-terminal', cwd });
  });

  it('resolves a relative file arg against the caller cwd', () => {
    const result = parseCliModeArgs(['--novi-cli', 'src/f.ts'], cwd);
    expect(result).toEqual({ cmd: 'open-file', path: path.resolve(cwd, 'src/f.ts') });
  });

  it('passes through an absolute file arg unchanged', () => {
    const result = parseCliModeArgs(['--novi-cli', '/abs/path/f.ts'], cwd);
    expect(result).toEqual({ cmd: 'open-file', path: '/abs/path/f.ts' });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. parseStartupArgs
// ──────────────────────────────────────────────────────────────────────────────

describe('parseStartupArgs', () => {
  it('returns null when no startup flags are present', () => {
    expect(parseStartupArgs(['electron', 'app.js'])).toBeNull();
  });

  it('returns { newFile: true } for --novi-new-file', () => {
    expect(parseStartupArgs(['--novi-new-file'])).toEqual({ newFile: true });
  });

  it('returns { filePath } for --novi-open-file=<path>', () => {
    expect(parseStartupArgs(['--novi-open-file=/a/b.ts'])).toEqual({ filePath: '/a/b.ts' });
  });

  it('returns null for --novi-open-file= with an empty path', () => {
    expect(parseStartupArgs(['--novi-open-file='])).toBeNull();
  });

  it('returns { openTerminal, cwd } for --novi-open-terminal + --novi-cwd', () => {
    expect(parseStartupArgs(['--novi-open-terminal', '--novi-cwd=/home/user'])).toEqual({
      openTerminal: true,
      cwd: '/home/user',
    });
  });

  it('returns { openTerminal: true } with no cwd when --novi-cwd is absent', () => {
    expect(parseStartupArgs(['--novi-open-terminal'])).toEqual({ openTerminal: true });
  });

  it('returns null when --novi-cli is present (CLI client mode suppresses startup args)', () => {
    expect(parseStartupArgs(['--novi-cli', '--novi-new-file'])).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. CliService.handleCommand
// ──────────────────────────────────────────────────────────────────────────────

describe('CliService.handleCommand', () => {
  let win: ReturnType<typeof makeMockWindow>;

  beforeEach(() => {
    win = makeMockWindow();
  });

  function handle(cmd: object, getWin: () => unknown = () => win) {
    return (cliService as any).handleCommand(cmd, getWin);
  }

  it('returns { ok: true } for ping without sending any IPC', () => {
    const result = handle({ cmd: 'ping' });
    expect(result).toEqual({ ok: true });
    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it('sends open-from-cli { newFile: true } and returns ok for new-file', () => {
    const result = handle({ cmd: 'new-file' });
    expect(result).toEqual({ ok: true });
    expect(win.webContents.send).toHaveBeenCalledWith('open-from-cli', { newFile: true });
  });

  it('sends open-from-cli { filePath } and returns ok for open-file', () => {
    const result = handle({ cmd: 'open-file', path: '/a/b.ts' });
    expect(result).toEqual({ ok: true });
    expect(win.webContents.send).toHaveBeenCalledWith('open-from-cli', { filePath: '/a/b.ts' });
  });

  it('sends open-from-cli { openTerminal, cwd } and returns ok for open-terminal', () => {
    const result = handle({ cmd: 'open-terminal', cwd: '/home/user' });
    expect(result).toEqual({ ok: true });
    expect(win.webContents.send).toHaveBeenCalledWith('open-from-cli', {
      openTerminal: true,
      cwd: '/home/user',
    });
  });

  it('returns { ok: false } when the window is null', () => {
    const result = handle({ cmd: 'new-file' }, () => null);
    expect(result.ok).toBe(false);
  });

  it('returns { ok: false } when the window is destroyed', () => {
    win.isDestroyed.mockReturnValue(true);
    const result = handle({ cmd: 'ping' });
    expect(result.ok).toBe(false);
  });

  it('returns { ok: false, error } for an unknown command', () => {
    const result = handle({ cmd: 'not-a-command' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Unknown command');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. CliService.start — .novi directory and socket lifecycle
// ──────────────────────────────────────────────────────────────────────────────

describe('CliService.start', () => {
  let mkdirSpy: jest.SpyInstance;
  let existsSpy: jest.SpyInstance;
  let createServerSpy: jest.SpyInstance;
  let mockServer: { listen: jest.Mock; on: jest.Mock; close: jest.Mock };

  beforeEach(() => {
    mockServer = { listen: jest.fn(), on: jest.fn(), close: jest.fn() };
    mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    createServerSpy = jest.spyOn(net, 'createServer').mockReturnValue(mockServer as any);
  });

  afterEach(() => {
    mkdirSpy.mockRestore();
    existsSpy.mockRestore();
    createServerSpy.mockRestore();
    (cliService as any).server = null;
  });

  it('creates the .novi directory with { recursive: true }', () => {
    cliService.start(() => null);
    expect(mkdirSpy).toHaveBeenCalledWith(
      path.join(os.homedir(), '.novi'),
      { recursive: true }
    );
  });

  it('starts net.Server and listens on the socket path', () => {
    cliService.start(() => null);
    expect(createServerSpy).toHaveBeenCalled();
    expect(mockServer.listen).toHaveBeenCalledWith(
      expect.stringContaining('.novi'),
      expect.any(Function)
    );
  });

  it('removes a stale socket file when one already exists', () => {
    existsSpy.mockReturnValue(true);
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);
    cliService.start(() => null);
    expect(unlinkSpy).toHaveBeenCalledWith(getPipePath());
    unlinkSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. Renderer — openFileFromPath, createTerminalTab, createNewFileTab
//
// These tests use a TestableCliMethods stand-in (matching the app-state.test.ts
// pattern) that replicates the exact window.api / __tabBarAPI interaction logic
// from App.ts so the contracts can be verified without a full Electron renderer.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the cli-handling methods from App.ts to allow isolated unit testing
 * of the tab deduplication and creation logic.
 */
class TestableCliMethods {
  untitledCounter = 1;

  async openFileFromPath(filePath: string): Promise<void> {
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const existing = tabBarAPI.getTabs?.().find((t: any) => t.filePath === filePath);
    if (existing) {
      tabBarAPI.switchTab(existing.id);
      return;
    }
    try {
      const fileData = await (window as any).api.readFile(filePath);
      const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
      const tabId = `tab-${Date.now()}`;
      tabBarAPI.addTab({ id: tabId, type: 'file', filePath, fileName, isDirty: false, content: fileData.content });
    } catch {
      // ignore
    }
  }

  async createTerminalTab(cwd?: string): Promise<void> {
    if (!(window as any).api?.terminalCreate) return;
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const terminalId = `terminal-${Date.now()}`;
    tabBarAPI.addTab({ id: terminalId, type: 'terminal', filePath: terminalId, fileName: '💻 bash', isDirty: false, content: '' });
    await (window as any).api.terminalCreate(cwd);
  }

  createNewFileTab(): void {
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const fileName = `Untitled-${this.untitledCounter}`;
    const tabId = `untitled-${this.untitledCounter}-${Date.now()}`;
    tabBarAPI.addTab({ id: tabId, type: 'file', filePath: '', fileName, isDirty: true, content: '' });
    this.untitledCounter++;
  }
}

describe('Renderer CLI handler methods', () => {
  let handler: TestableCliMethods;
  let addTab: jest.Mock;
  let switchTab: jest.Mock;
  let readFile: jest.Mock;
  let terminalCreate: jest.Mock;

  beforeEach(() => {
    handler = new TestableCliMethods();
    addTab = jest.fn();
    switchTab = jest.fn();
    readFile = jest.fn().mockResolvedValue({ content: 'file content', path: '/a/b.ts' });
    terminalCreate = jest.fn().mockResolvedValue({ id: 'terminal-1' });

    (window as any).__tabBarAPI = {
      getTabs: jest.fn(() => []),
      addTab,
      switchTab,
    };
    (window as any).api = { readFile, terminalCreate };
  });

  afterEach(() => {
    delete (window as any).__tabBarAPI;
    delete (window as any).api;
  });

  describe('openFileFromPath', () => {
    it('switches to the existing tab and skips readFile when the file is already open', async () => {
      const existingTab = { id: 'tab-existing', type: 'file', filePath: '/a/b.ts' };
      (window as any).__tabBarAPI.getTabs.mockReturnValue([existingTab]);

      await handler.openFileFromPath('/a/b.ts');

      expect(switchTab).toHaveBeenCalledWith('tab-existing');
      expect(readFile).not.toHaveBeenCalled();
      expect(addTab).not.toHaveBeenCalled();
    });

    it('calls readFile and adds a new tab when the file is not already open', async () => {
      await handler.openFileFromPath('/a/b.ts');

      expect(readFile).toHaveBeenCalledWith('/a/b.ts');
      expect(addTab).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'file', filePath: '/a/b.ts', fileName: 'b.ts' })
      );
      expect(switchTab).not.toHaveBeenCalled();
    });
  });

  describe('createTerminalTab', () => {
    it('adds a terminal tab and calls terminalCreate with the given cwd', async () => {
      await handler.createTerminalTab('/home/user/project');

      expect(addTab).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'terminal' })
      );
      expect(terminalCreate).toHaveBeenCalledWith('/home/user/project');
    });

    it('calls terminalCreate with undefined when no cwd is provided', async () => {
      await handler.createTerminalTab();
      expect(terminalCreate).toHaveBeenCalledWith(undefined);
    });
  });

  describe('createNewFileTab', () => {
    it('adds an untitled file tab with an empty filePath', () => {
      handler.createNewFileTab();

      expect(addTab).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'file', filePath: '', isDirty: true })
      );
    });

    it('increments the counter so successive tabs get unique names', () => {
      handler.createNewFileTab();
      handler.createNewFileTab();

      const calls = addTab.mock.calls;
      expect(calls[0][0].fileName).toBe('Untitled-1');
      expect(calls[1][0].fileName).toBe('Untitled-2');
    });
  });
});
