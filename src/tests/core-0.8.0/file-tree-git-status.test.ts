/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for FileTree git-status coloring.
 * Verifies that tree rows are colored by git status if and only if git
 * support is enabled (i.e. appState.gitStatus is populated), and that
 * new/modified files (and the directories containing them) get the right
 * colors and update live when appState.gitStatus changes.
 */

import { FileTree } from '../../renderer/components/FileTree';
import { appState } from '../../renderer/core/app-state';
import type { DirectoryEntry, GitStatus } from '../../types/global';

const mockApi = {
  readDirectory: jest.fn<Promise<DirectoryEntry[]>, [string]>(),
};

const ROOT = '/repo';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function nameSpanFor(container: HTMLElement, fileName: string): HTMLElement | undefined {
  const rows = Array.from(container.querySelectorAll('[data-filetree-node]'));
  const row = rows.find((r) => r.textContent?.includes(fileName));
  return row?.lastElementChild as HTMLElement | undefined;
}

describe('FileTree git status coloring', () => {
  let container: HTMLDivElement;
  let fileTree: FileTree;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    (window as unknown as { api: typeof mockApi }).api = mockApi;
    jest.clearAllMocks();
    appState.gitStatus = null;
  });

  afterEach(() => {
    fileTree?.destroy();
    container.remove();
    appState.gitStatus = null;
  });

  async function mountWithEntries(entries: DirectoryEntry[]): Promise<void> {
    mockApi.readDirectory.mockResolvedValue(entries);
    fileTree = new FileTree({ initialPath: ROOT, driveFileWatcher: false, showGitToggle: false });
    fileTree.mount(container);
    await flush();
  }

  const flatEntries: DirectoryEntry[] = [
    { name: 'new-file.ts', path: `${ROOT}/new-file.ts`, type: 'file', isDirectory: false, size: 10 },
    { name: 'changed-file.ts', path: `${ROOT}/changed-file.ts`, type: 'file', isDirectory: false, size: 10 },
    { name: 'clean-file.ts', path: `${ROOT}/clean-file.ts`, type: 'file', isDirectory: false, size: 10 },
    { name: 'src', path: `${ROOT}/src`, type: 'directory', isDirectory: true, size: 0 },
  ];

  const gitStatus: GitStatus = {
    isRepo: true,
    branch: 'main',
    ahead: 0,
    behind: 0,
    files: [
      { path: 'new-file.ts', status: 'untracked', staged: false },
      { path: 'changed-file.ts', status: 'modified', staged: false },
      { path: 'src/nested.ts', status: 'modified', staged: false },
    ],
  };

  it('applies no coloring when git support is disabled (gitStatus is null)', async () => {
    await mountWithEntries(flatEntries);

    expect(nameSpanFor(container, 'new-file.ts')?.style.color).toBe('');
    expect(nameSpanFor(container, 'changed-file.ts')?.style.color).toBe('');
    expect(nameSpanFor(container, 'clean-file.ts')?.style.color).toBe('');
  });

  it('applies no coloring when gitStatus.isRepo is false', async () => {
    await mountWithEntries(flatEntries);
    appState.gitStatus = { isRepo: false, branch: null, files: [], ahead: 0, behind: 0 };
    await flush();

    expect(nameSpanFor(container, 'new-file.ts')?.style.color).toBe('');
  });

  it('colors untracked (new) files green', async () => {
    await mountWithEntries(flatEntries);
    appState.gitStatus = gitStatus;
    await flush();

    expect(nameSpanFor(container, 'new-file.ts')?.style.color).toBe('rgb(115, 201, 145)'); // #73c991
  });

  it('colors modified files orange', async () => {
    await mountWithEntries(flatEntries);
    appState.gitStatus = gitStatus;
    await flush();

    expect(nameSpanFor(container, 'changed-file.ts')?.style.color).toBe('rgb(226, 192, 141)'); // #e2c08d
  });

  it('leaves unmodified files uncolored', async () => {
    await mountWithEntries(flatEntries);
    appState.gitStatus = gitStatus;
    await flush();

    expect(nameSpanFor(container, 'clean-file.ts')?.style.color).toBe('');
  });

  it('bubbles a modified status up to an ancestor directory, even collapsed', async () => {
    await mountWithEntries(flatEntries);
    appState.gitStatus = gitStatus;
    await flush();

    // src/nested.ts is modified, so the (collapsed) src/ directory row should be tinted too.
    expect(nameSpanFor(container, 'src')?.style.color).toBe('rgb(226, 192, 141)'); // #e2c08d
  });

  it('re-colors live when appState.gitStatus changes after mount', async () => {
    await mountWithEntries(flatEntries);
    expect(nameSpanFor(container, 'new-file.ts')?.style.color).toBe('');

    appState.gitStatus = gitStatus;
    await flush();
    expect(nameSpanFor(container, 'new-file.ts')?.style.color).toBe('rgb(115, 201, 145)');

    appState.gitStatus = null;
    await flush();
    expect(nameSpanFor(container, 'new-file.ts')?.style.color).toBe('');
  });
});
