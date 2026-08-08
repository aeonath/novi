/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Regression test for GitPanel's git-change listener registration.
 *
 * window.api.gitOnChange() is a bare ipcRenderer.on() with no dedup, so
 * calling it more than once per component lifetime leaks listeners. GitPanel
 * used to call it from startWatching(), which re-runs on every workspaceRoot
 * change (every tab switch / tree navigation) — piling up listeners that all
 * shared one changeDebounceTimer and clobbered each other's pending refresh,
 * so only the last-registered listener's (possibly stale) captured root ever
 * got refreshed. This verifies the listener is registered exactly once and
 * that a `.git`-change event always refreshes against the *current*
 * workspaceRoot, not whichever root was active when the listener was set up.
 */

import { GitPanel } from '../../renderer/components/GitPanel';
import type { GitStatus } from '../../types/global';

type ChangeHandler = () => void;

function makeStatus(isRepo: boolean): GitStatus {
  return { isRepo, branch: isRepo ? 'main' : null, files: [], ahead: 0, behind: 0 };
}

describe('GitPanel git-change listener', () => {
  let container: HTMLDivElement;
  let panel: GitPanel;
  let changeHandlers: ChangeHandler[];
  let mockApi: {
    gitStartWatching: jest.Mock;
    gitStopWatching: jest.Mock;
    gitOnChange: jest.Mock;
    gitRemoveChangeListener: jest.Mock;
    gitManualRefresh: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    changeHandlers = [];

    mockApi = {
      gitStartWatching: jest.fn().mockResolvedValue(undefined),
      gitStopWatching: jest.fn().mockResolvedValue(undefined),
      gitOnChange: jest.fn((cb: ChangeHandler) => { changeHandlers.push(cb); }),
      gitRemoveChangeListener: jest.fn(),
      gitManualRefresh: jest.fn(() => Promise.resolve(makeStatus(true))),
    };
    (window as unknown as { api: typeof mockApi }).api = mockApi;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    panel?.destroy();
    container.remove();
    jest.useRealTimers();
  });

  async function fireChangeAndSettle(): Promise<void> {
    changeHandlers.forEach((h) => h());
    await jest.advanceTimersByTimeAsync(1000);
  }

  it('registers gitOnChange exactly once across multiple workspaceRoot changes', async () => {
    panel = new GitPanel({ workspaceRoot: '/repoA' });
    panel.mount(container);
    await jest.advanceTimersByTimeAsync(100); // startWatching's initial setTimeout

    panel.workspaceRoot = '/repoB';
    await jest.advanceTimersByTimeAsync(100);
    panel.workspaceRoot = '/repoC';
    await jest.advanceTimersByTimeAsync(100);
    panel.workspaceRoot = '/repoA';
    await jest.advanceTimersByTimeAsync(100);

    expect(mockApi.gitOnChange).toHaveBeenCalledTimes(1);
    expect(changeHandlers.length).toBe(1);
  });

  it('refreshes against the current workspaceRoot after root changes, not a stale captured one', async () => {
    panel = new GitPanel({ workspaceRoot: '/repoA' });
    panel.mount(container);
    await jest.advanceTimersByTimeAsync(100);

    panel.workspaceRoot = '/repoB';
    await jest.advanceTimersByTimeAsync(100);
    mockApi.gitManualRefresh.mockClear();

    await fireChangeAndSettle();

    expect(mockApi.gitManualRefresh).toHaveBeenCalledTimes(1);
    expect(mockApi.gitManualRefresh).toHaveBeenCalledWith('/repoB');
  });

  it('calls onRefreshStatus after a `.git`-change event settles', async () => {
    const onRefreshStatus = jest.fn();
    panel = new GitPanel({ workspaceRoot: '/repoA', onRefreshStatus });
    panel.mount(container);
    await jest.advanceTimersByTimeAsync(100);
    onRefreshStatus.mockClear();

    await fireChangeAndSettle();

    expect(onRefreshStatus).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid successive `.git`-change events into a single refresh', async () => {
    panel = new GitPanel({ workspaceRoot: '/repoA' });
    panel.mount(container);
    await jest.advanceTimersByTimeAsync(100);
    mockApi.gitManualRefresh.mockClear();

    changeHandlers.forEach((h) => h());
    await jest.advanceTimersByTimeAsync(400);
    changeHandlers.forEach((h) => h()); // resets the debounce window
    await jest.advanceTimersByTimeAsync(1000);

    expect(mockApi.gitManualRefresh).toHaveBeenCalledTimes(1);
  });

  it('removes the change listener on destroy', async () => {
    panel = new GitPanel({ workspaceRoot: '/repoA' });
    panel.mount(container);
    await jest.advanceTimersByTimeAsync(100);

    panel.destroy();

    expect(mockApi.gitRemoveChangeListener).toHaveBeenCalledTimes(1);
  });
});
