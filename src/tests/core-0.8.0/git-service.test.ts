/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';

// Automock 'fs' (matches the pattern used in novi-command.test.ts) — the real
// fs module's existsSync is non-configurable in this Jest worker once another
// test file has spied on it, so a plain jest.spyOn() here is unreliable.
jest.mock('fs');

// GitService's constructor calls fs/promises.mkdir + appendFile for its log file —
// keep those hermetic rather than touching the real homedir during tests.
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  appendFile: jest.fn().mockResolvedValue(undefined),
}));

// jest.mock factories may only reference out-of-scope variables named with a
// "mock" prefix — this array collects every fake Worker spawned so tests can
// inspect/drive them.
const mockWorkerInstances: EventEmitter[] = [];

jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation((scriptPath: string, options: { workerData: { cwd: string } }) => {
    const worker = new (require('events').EventEmitter)() as EventEmitter & {
      scriptPath: string;
      options: typeof options;
      terminate: jest.Mock;
    };
    worker.scriptPath = scriptPath;
    worker.options = options;
    worker.terminate = jest.fn().mockResolvedValue(0);
    mockWorkerInstances.push(worker);
    return worker;
  }),
}));

import { gitService } from '../../main/services/git-service';

type FakeWorker = EventEmitter & { scriptPath: string; options: { workerData: { cwd: string } }; terminate: jest.Mock };

const existsSyncSpy = fs.existsSync as jest.Mock;

beforeEach(() => {
  mockWorkerInstances.length = 0;
  existsSyncSpy.mockReset();
});

describe('GitService.getStatus', () => {
  it('returns an empty status without spawning a worker when cwd has no .git directory', async () => {
    existsSyncSpy.mockReturnValue(false);

    const status = await gitService.getStatus('/some/non-repo');

    expect(status).toEqual({ isRepo: false, branch: null, files: [], ahead: 0, behind: 0 });
    expect(mockWorkerInstances.length).toBe(0);
  });

  it('spawns a worker for the given cwd and resolves with its posted status', async () => {
    existsSyncSpy.mockReturnValue(true);

    const promise = gitService.getStatus('/some/repo');
    expect(mockWorkerInstances.length).toBe(1);
    expect((mockWorkerInstances[0] as FakeWorker).options.workerData).toEqual({ cwd: '/some/repo' });

    const status = { isRepo: true, branch: 'main', files: [], ahead: 0, behind: 0 };
    mockWorkerInstances[0].emit('message', { ok: true, status });

    await expect(promise).resolves.toEqual(status);
  });

  it('resolves with an empty status when the worker reports an error', async () => {
    existsSyncSpy.mockReturnValue(true);

    const promise = gitService.getStatus('/some/repo');
    mockWorkerInstances[0].emit('message', { ok: false, error: 'boom' });

    await expect(promise).resolves.toEqual({ isRepo: false, branch: null, files: [], ahead: 0, behind: 0 });
  });

  it('terminates a still-running scan when a newer request supersedes it', async () => {
    existsSyncSpy.mockReturnValue(true);

    const first = gitService.getStatus('/repo-a');
    const firstWorker = mockWorkerInstances[0] as FakeWorker;

    const second = gitService.getStatus('/repo-b');

    // The stale scan for /repo-a is cancelled — its promise resolves as "not a repo"
    // and its worker is terminated outright rather than left to keep scanning.
    await expect(first).resolves.toEqual({ isRepo: false, branch: null, files: [], ahead: 0, behind: 0 });
    expect(firstWorker.terminate).toHaveBeenCalled();

    const status = { isRepo: true, branch: 'main', files: [], ahead: 1, behind: 0 };
    mockWorkerInstances[1].emit('message', { ok: true, status });
    await expect(second).resolves.toEqual(status);
  });
});

describe('GitService.cancelActiveStatus', () => {
  it('is a no-op when no scan is in flight', () => {
    expect(() => gitService.cancelActiveStatus()).not.toThrow();
  });

  it('resolves the in-flight getStatus() call and terminates its worker', async () => {
    existsSyncSpy.mockReturnValue(true);

    const promise = gitService.getStatus('/repo');
    const worker = mockWorkerInstances[0] as FakeWorker;

    gitService.cancelActiveStatus();

    await expect(promise).resolves.toEqual({ isRepo: false, branch: null, files: [], ahead: 0, behind: 0 });
    expect(worker.terminate).toHaveBeenCalled();
  });
});
