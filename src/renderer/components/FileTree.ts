/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * FileTree - Interactive File System Browser (vanilla TS)
 * Supports create, rename, delete, and context menus
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';
import { appState } from '../core/app-state.js';
import { bus } from '../core/event-bus.js';
import { markReady } from '../utils/ready-events.js';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isLoaded?: boolean;
}

export interface FileTreeConfig {
  onFileOpen?: (filePath: string) => void;
  onToggleGit?: () => void;
  showGitToggle?: boolean;
  onDirectoryOpen?: (dirPath: string) => void;
  onNewTerminal?: () => void;
  onNoviPrompt?: () => void;
  initialPath?: string;
  displayRoot?: string | null;
  isTerminalTree?: boolean;
  onRootChange?: (path: string | null) => void;
  hideHeader?: boolean;
  driveFileWatcher?: boolean;
  showOpenFolder?: boolean;
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': case 'jsx': case 'ts': case 'tsx': return '\ud83d\udcdc';
    case 'json': return '\ud83d\udccb';
    case 'md': return '\ud83d\udcdd';
    case 'html': case 'htm': return '\ud83c\udf10';
    case 'css': case 'scss': case 'less': return '\ud83c\udfa8';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': return '\ud83d\uddbc\ufe0f';
    default: return '\ud83d\udcc4';
  }
}

function isImageFile(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(name);
}

export class FileTree extends Component {
  private config: FileTreeConfig;
  private rootPath: string | null = null;
  private tree: FileNode[] = [];
  private _loading = false;
  private _inGitRepo = false;
  private expandedDirs = new Set<string>();
  private contextMenuEl: HTMLElement | null = null;

  // New file/folder inline input state
  private newFileInput: { parentPath: string; parentNode: FileNode | null } | null = null;
  private newFolderInput: { parentPath: string; parentNode: FileNode | null } | null = null;

  // DOM elements
  private headerEl: HTMLElement;
  private titleEl: HTMLElement;
  private headerBtnsEl: HTMLElement;
  private contentEl: HTMLElement;
  private footerEl: HTMLElement;

  constructor(config: FileTreeConfig = {}) {
    super('div');
    this.config = {
      showGitToggle: true,
      hideHeader: false,
      driveFileWatcher: true,
      showOpenFolder: true,
      ...config,
    };

    setStyles(this.el, {
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: '#252526', color: '#cccccc',
    });

    // Header
    this.titleEl = el('span', {}, 'FILES');
    setStyles(this.titleEl, {
      fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px', color: '#cccccc',
    });
    if (this.config.isTerminalTree) this.titleEl.style.color = '#4ec9b0';

    this.headerBtnsEl = el('div');
    setStyles(this.headerBtnsEl, { display: 'flex', gap: '4px' });

    this.headerEl = el('div', {}, this.titleEl, this.headerBtnsEl);
    setStyles(this.headerEl, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      height: '35px', padding: '0 12px', borderBottom: '1px solid #3e3e42',
      backgroundColor: '#252526',
    });
    if (this.config.hideHeader) this.headerEl.style.display = 'none';

    // Content
    this.contentEl = el('div');
    this.contentEl.className = 'file-tree-scroll';
    setStyles(this.contentEl, { flex: '1', overflowY: 'auto' });

    // Footer (git branch)
    this.footerEl = el('div');
    setStyles(this.footerEl, {
      display: 'none', alignItems: 'center', gap: '8px',
      padding: '8px 12px', borderTop: '1px solid #3e3e42',
      backgroundColor: '#252526', fontSize: '12px', color: '#cccccc',
    });

    this.el.appendChild(this.headerEl);
    this.el.appendChild(this.contentEl);
    this.el.appendChild(this.footerEl);

    // Context menu on empty space
    this.el.addEventListener('contextmenu', (e) => {
      // Only handle if clicking on the container itself or content area (not on a node)
      if ((e.target as HTMLElement).closest('[data-filetree-node]')) return;
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('novi-close-context-menus', { detail: { source: 'FileTree' } }));
      this.showContextMenu(e.clientX, e.clientY, null);
    });
  }

  protected onMount(): void {
    // Close context menus from other components
    const closeHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.source !== 'FileTree') this.hideContextMenu();
    };
    window.addEventListener('novi-close-context-menus', closeHandler);
    this.addCleanup(() => window.removeEventListener('novi-close-context-menus', closeHandler));

    const clickHandler = () => this.hideContextMenu();
    document.addEventListener('click', clickHandler);
    this.addCleanup(() => document.removeEventListener('click', clickHandler));

    // Git status updates
    bus.on('app:gitStatusChanged', () => this.renderFooter());
    this.addCleanup(() => bus.off('app:gitStatusChanged', () => this.renderFooter()));

    // Initial load
    if (this.config.displayRoot) {
      this.rootPath = this.config.displayRoot;
      this.loadDirectory(this.config.displayRoot);
    } else if (this.config.initialPath && !this.rootPath) {
      this.rootPath = this.config.initialPath;
      this.loadDirectory(this.config.initialPath);
      this.config.onDirectoryOpen?.(this.config.initialPath);
    }
    this.config.onRootChange?.(this.rootPath);

    // File watcher
    this.setupFileWatcher();

    // Expose API
    if (this.config.driveFileWatcher) {
      (window as any).__fileTreeAPI = {
        openDirectory: () => this.openDirectory(),
        loadDirectory: (dir: string) => this.loadDirectoryProgrammatically(dir),
        refresh: () => this.rootPath && this.loadDirectory(this.rootPath),
        reset: () => this.reset(),
      };
      markReady('filetree-ready');
      this.addCleanup(() => { delete (window as any).__fileTreeAPI; });
    }

    this.render();
  }

  // --- Public API ---

  setShowOpenFolder(show: boolean): void {
    if (this.config.showOpenFolder !== show) {
      this.config.showOpenFolder = show;
      this.render();
    }
  }

  setShowGitToggle(show: boolean): void {
    if (this.config.showGitToggle !== show) {
      this.config.showGitToggle = show;
      this.render();
    }
  }

  get isLoading(): boolean {
    return this._loading;
  }

  set loading(value: boolean) {
    if (this._loading !== value) {
      this._loading = value;
      this.render();
    }
  }

  set displayRoot(path: string | null) {
    if (path && path !== this.rootPath) {
      this.rootPath = path;
      this.loadDirectory(path);
      this.checkGitRepo(path);
      this.config.onRootChange?.(this.rootPath);
    }
  }

  // --- Directory Operations ---

  private async openDirectory(): Promise<void> {
    if (!window.api?.selectDirectory) return;
    try {
      const dirPath = await window.api.selectDirectory();
      if (!dirPath) return;
      this.rootPath = dirPath;
      await this.loadDirectory(dirPath);
      this.config.onDirectoryOpen?.(dirPath);
      this.config.onRootChange?.(dirPath);
    } catch (err) {
      console.error('[FileTree] Failed to open directory:', err);
    }
  }

  private async checkGitRepo(path: string): Promise<void> {
    if (!window.api?.gitFindRoot) {
      this._inGitRepo = false;
      return;
    }
    try {
      const root = await window.api.gitFindRoot(path);
      const wasInRepo = this._inGitRepo;
      this._inGitRepo = root !== null;
      if (wasInRepo !== this._inGitRepo) this.renderHeader();
    } catch {
      this._inGitRepo = false;
    }
  }

  private async loadDirectory(path: string, parentPath?: string): Promise<void> {
    if (!window.api?.readDirectory) return;
    try {
      const result = await window.api.readDirectory(path);
      const nodes: FileNode[] = result.map((entry: any) => ({
        name: entry.name, path: entry.path,
        isDirectory: entry.isDirectory,
        children: entry.isDirectory ? [] : undefined,
        isLoaded: false,
      }));

      if (parentPath) {
        this.tree = this.updateNodeChildren(this.tree, parentPath, nodes);
      } else {
        this.tree = nodes;
      }
      this.render();
    } catch (err) {
      console.error('[FileTree] Failed to load directory:', err);
    }
  }

  private updateNodeChildren(nodes: FileNode[], targetPath: string, children: FileNode[]): FileNode[] {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, children, isLoaded: true };
      }
      if (node.children) {
        return { ...node, children: this.updateNodeChildren(node.children, targetPath, children) };
      }
      return node;
    });
  }

  private async toggleDirectory(node: FileNode): Promise<void> {
    const isExpanded = this.expandedDirs.has(node.path);
    if (isExpanded) {
      this.expandedDirs.delete(node.path);
    } else {
      this.expandedDirs.add(node.path);
      if (!node.isLoaded) {
        await this.loadDirectory(node.path, node.path);
      }
    }
    this.setupFileWatcher(); // Re-watch with updated expanded set
    this.render();
  }

  private async loadDirectoryProgrammatically(dirPath: string): Promise<void> {
    try {
      this.rootPath = dirPath;
      await this.loadDirectory(dirPath);
      this.config.onDirectoryOpen?.(dirPath);
      this.config.onRootChange?.(dirPath);
    } catch (err) {
      console.error('[FileTree] Failed to load directory programmatically:', dirPath, err);
    }
  }

  private reset(): void {
    this.rootPath = null;
    this.tree = [];
    this.expandedDirs.clear();
    this.hideContextMenu();
    this.newFileInput = null;
    this.newFolderInput = null;
    this.config.onRootChange?.(null);
    this.render();
  }

  // --- File Watcher ---

  private setupFileWatcher(): void {
    if (!this.config.driveFileWatcher || !this.rootPath || !window.api?.fileTreeStartWatching) return;

    const normalized = this.rootPath.replace(/\\/g, '/');
    if (/^[A-Za-z]:\/?$/.test(normalized)) return;

    const expandedList = Array.from(this.expandedDirs);
    window.api.fileTreeStartWatching(this.rootPath, expandedList);

    if (window.api.fileTreeOnChange) {
      window.api.fileTreeOnChange(async (event: { type: string; path: string }) => {
        if (!this.rootPath) return;
        const normEvent = event.path.replace(/\\/g, '/');
        const normRoot = this.rootPath.replace(/\\/g, '/');
        const parts = normEvent.split('/');
        parts.pop();
        const dirPath = parts.join('/');

        if (dirPath === normRoot || normEvent.startsWith(normRoot)) {
          if (['add', 'unlink', 'addDir', 'unlinkDir'].includes(event.type)) {
            const isRootChange = dirPath === normRoot;
            const normExpanded = new Set(Array.from(this.expandedDirs).map(p => p.replace(/\\/g, '/')));

            if (isRootChange) {
              await this.loadDirectory(this.rootPath);
            } else if (normExpanded.has(dirPath)) {
              await this.loadDirectory(dirPath, dirPath);
            }
          }
        }
      });
    }
  }

  // --- Render ---

  private render(): void {
    this.renderHeader();
    this.renderContent();
    this.renderFooter();
  }

  private renderHeader(): void {
    const dirName = this.getDirName(this.rootPath);
    this.titleEl.textContent = dirName;

    clearChildren(this.headerBtnsEl);
    if (this.config.showGitToggle && this.rootPath && this.config.onToggleGit && this._inGitRepo) {
      const gitBtn = this.makeHeaderBtn('\u271a', 'Toggle Git View');
      gitBtn.addEventListener('click', () => this.config.onToggleGit!());
      this.headerBtnsEl.appendChild(gitBtn);
    }
    if (this.config.showOpenFolder && this.rootPath) {
      const openBtn = this.makeHeaderBtn('\ud83d\udcc2', 'Open Folder');
      openBtn.addEventListener('click', () => this.openDirectory());
      this.headerBtnsEl.appendChild(openBtn);
    }
  }

  private makeHeaderBtn(text: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text; btn.title = title;
    setStyles(btn, {
      background: 'transparent', border: 'none', color: '#cccccc',
      cursor: 'pointer', fontSize: '16px', padding: '2px 4px',
    });
    return btn;
  }

  private renderContent(): void {
    clearChildren(this.contentEl);

    if (this._loading) {
      const loader = el('div');
      setStyles(loader, {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: '8px',
      });
      if (!document.getElementById('novi-dots-keyframes')) {
        const style = document.createElement('style');
        style.id = 'novi-dots-keyframes';
        style.textContent = [
          '@keyframes novi-dot-pulse {',
          '  0%, 100% { transform: scale(1); opacity: 0.4; }',
          '  20% { transform: scale(1.8); opacity: 1; }',
          '}',
        ].join('\n');
        document.head.appendChild(style);
      }
      for (let i = 0; i < 5; i++) {
        const dot = el('div');
        setStyles(dot, {
          width: '8px', height: '8px', borderRadius: '50%',
          backgroundColor: '#858585',
        });
        dot.style.animation = `novi-dot-pulse 2.5s ease-in-out ${i * 0.4}s infinite`;
        loader.appendChild(dot);
      }
      this.contentEl.appendChild(loader);
      return;
    }

    if (this.tree.length === 0 && !this.rootPath) {
      // Empty state
      const empty = el('div');
      setStyles(empty, {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 16px', textAlign: 'center',
        color: '#858585', fontSize: '13px',
      });
      empty.appendChild(el('p', {}, 'No folder open'));
      if (this.config.showOpenFolder) {
        const openBtn = document.createElement('button');
        openBtn.textContent = 'Open Folder';
        setStyles(openBtn, {
          marginTop: '16px', padding: '8px 16px', backgroundColor: '#0e639c',
          color: '#ffffff', border: 'none', borderRadius: '4px',
          cursor: 'pointer', fontSize: '13px',
        });
        openBtn.addEventListener('click', () => this.openDirectory());
        empty.appendChild(openBtn);
      }
      this.contentEl.appendChild(empty);
      return;
    }

    if (this.tree.length === 0 && this.rootPath) {
      const empty = el('div');
      setStyles(empty, {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 16px', textAlign: 'center',
        color: '#858585', fontSize: '13px',
      });
      empty.appendChild(el('p', {}, 'Directory is empty'));
      this.contentEl.appendChild(empty);
      return;
    }

    // Root-level new file/folder inputs
    if (this.newFileInput && this.newFileInput.parentPath === this.rootPath && !this.newFileInput.parentNode) {
      this.contentEl.appendChild(this.makeNewInput(0, (name) => this.handleNewFileSubmit(name), () => { this.newFileInput = null; this.render(); }));
    }
    if (this.newFolderInput && this.newFolderInput.parentPath === this.rootPath && !this.newFolderInput.parentNode) {
      this.contentEl.appendChild(this.makeNewInput(0, (name) => this.handleNewFolderSubmit(name), () => { this.newFolderInput = null; this.render(); }, '\ud83d\udcc1', 'folder-name'));
    }

    for (const node of this.tree) {
      this.renderNode(this.contentEl, node, 0);
    }
  }

  private renderNode(parent: HTMLElement, node: FileNode, level: number): void {
    const row = el('div');
    row.setAttribute('data-filetree-node', 'true');
    setStyles(row, {
      display: 'flex', alignItems: 'center', padding: '4px 8px',
      paddingLeft: `${level * 16 + 8}px`, cursor: 'pointer',
      fontSize: '13px', userSelect: 'none',
    });

    row.addEventListener('mouseenter', () => { row.style.backgroundColor = '#2a2d2e'; });
    row.addEventListener('mouseleave', () => { row.style.backgroundColor = 'transparent'; });

    row.addEventListener('click', (e) => {
      e.stopPropagation();
      if (node.isDirectory) {
        this.toggleDirectory(node);
      } else {
        this.config.onFileOpen?.(node.path);
      }
    });

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('novi-close-context-menus', { detail: { source: 'FileTree' } }));
      this.showContextMenu(e.clientX, e.clientY, node);
    });

    const isExpanded = this.expandedDirs.has(node.path);

    if (node.isDirectory) {
      const arrow = el('span', {}, isExpanded ? '\u25bc' : '\u25b6');
      setStyles(arrow, { marginRight: '4px', fontSize: '10px', width: '12px' });
      row.appendChild(arrow);
    }

    const icon = el('span', {}, node.isDirectory ? (isExpanded ? '\ud83d\udcc2' : '\ud83d\udcc1') : getFileIcon(node.name));
    setStyles(icon, { marginRight: '6px', fontSize: '14px' });
    row.appendChild(icon);

    const name = el('span', {}, node.name);
    setStyles(name, { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    row.appendChild(name);

    parent.appendChild(row);

    // Render children if expanded
    if (node.isDirectory && isExpanded) {
      // New file/folder input inside expanded dir
      if (this.newFileInput && this.newFileInput.parentPath === node.path) {
        parent.appendChild(this.makeNewInput(level + 1, (n) => this.handleNewFileSubmit(n), () => { this.newFileInput = null; this.render(); }));
      }
      if (this.newFolderInput && this.newFolderInput.parentPath === node.path) {
        parent.appendChild(this.makeNewInput(level + 1, (n) => this.handleNewFolderSubmit(n), () => { this.newFolderInput = null; this.render(); }, '\ud83d\udcc1', 'folder-name'));
      }

      if (node.children) {
        for (const child of node.children) {
          this.renderNode(parent, child, level + 1);
        }
      }
    }
  }

  private makeNewInput(level: number, onSubmit: (name: string) => void, onCancel: () => void, iconText = '\ud83d\udcc4', placeholder = 'filename.txt'): HTMLElement {
    const row = el('div');
    setStyles(row, {
      display: 'flex', alignItems: 'center', padding: '4px 8px',
      paddingLeft: `${level * 16 + 8}px`, backgroundColor: '#2a2d2e',
      fontSize: '13px', userSelect: 'none',
    });

    const icon = el('span', {}, iconText);
    setStyles(icon, { marginRight: '6px', fontSize: '14px' });
    row.appendChild(icon);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    setStyles(input, {
      flex: '1', backgroundColor: '#1e1e1e', border: '1px solid #007acc',
      outline: 'none', padding: '2px 4px', borderRadius: '2px',
      color: '#cccccc', fontFamily: 'inherit', fontSize: 'inherit',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); onSubmit(input.value); }
      else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    });
    input.addEventListener('blur', () => {
      if (input.value.trim()) onSubmit(input.value);
      else onCancel();
    });

    row.appendChild(input);

    // Focus after appending to DOM
    requestAnimationFrame(() => input.focus());

    return row;
  }

  private renderFooter(): void {
    const git = appState.gitStatus;
    if (git && git.isRepo) {
      this.footerEl.style.display = 'flex';
      clearChildren(this.footerEl);

      const gitIcon = el('span', {}, '\u2387');
      setStyles(gitIcon, { fontSize: '14px', opacity: '0.9' });
      this.footerEl.appendChild(gitIcon);

      const branch = el('span', {}, git.branch || 'detached');
      setStyles(branch, { fontSize: '12px', color: '#cccccc' });
      this.footerEl.appendChild(branch);

      if (git.ahead > 0) {
        const badge = el('span', {}, `\u2191${git.ahead}`);
        setStyles(badge, { fontSize: '11px', padding: '2px 4px', backgroundColor: '#007acc', color: '#ffffff', borderRadius: '3px' });
        this.footerEl.appendChild(badge);
      }
      if (git.behind > 0) {
        const badge = el('span', {}, `\u2193${git.behind}`);
        setStyles(badge, { fontSize: '11px', padding: '2px 4px', backgroundColor: '#007acc', color: '#ffffff', borderRadius: '3px' });
        this.footerEl.appendChild(badge);
      }
    } else {
      this.footerEl.style.display = 'none';
    }
  }

  // --- Context Menu ---

  private showContextMenu(x: number, y: number, node: FileNode | null): void {
    this.hideContextMenu();

    const menu = el('div');
    setStyles(menu, {
      position: 'fixed', left: `${x}px`, top: `${y}px`,
      backgroundColor: '#2d2d30', border: '1px solid #3e3e42',
      borderRadius: '4px', padding: '4px 0', minWidth: '150px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)', zIndex: '1000',
    });
    menu.addEventListener('click', (e) => e.stopPropagation());

    const makeItem = (text: string, handler: () => void) => {
      const item = el('div', {}, text);
      setStyles(item, {
        padding: '8px 16px', cursor: 'pointer', fontSize: '13px', color: '#cccccc',
      });
      item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#2a2d2e'; });
      item.addEventListener('mouseleave', () => { item.style.backgroundColor = 'transparent'; });
      item.addEventListener('click', handler);
      return item;
    };

    const makeDivider = () => {
      const div = el('div');
      setStyles(div, { height: '1px', backgroundColor: '#3e3e42', margin: '4px 0' });
      return div;
    };

    menu.appendChild(makeItem('\ud83d\udcc4 New File', () => { this.hideContextMenu(); this.createNewFile(node); }));
    menu.appendChild(makeItem('\ud83d\udcc1 New Folder', () => { this.hideContextMenu(); this.createNewFolder(node); }));
    menu.appendChild(makeItem('\ud83d\udcbb New Terminal', () => { this.hideContextMenu(); this.config.onNewTerminal?.(); }));
    menu.appendChild(makeItem('\u25b6\ufe0f Novi Shell', () => { this.hideContextMenu(); this.config.onNoviPrompt?.(); }));

    if (node) {
      menu.appendChild(makeDivider());
      if (!node.isDirectory && isImageFile(node.name)) {
        menu.appendChild(makeItem('\ud83d\uddbc\ufe0f Edit Image', () => { this.hideContextMenu(); this.config.onFileOpen?.(node.path); }));
      }
      menu.appendChild(makeItem('\u270f\ufe0f Rename', () => { this.hideContextMenu(); this.renameNode(node); }));
      menu.appendChild(makeItem('\ud83d\uddd1\ufe0f Delete', () => { this.hideContextMenu(); this.deleteNode(node); }));
    }

    menu.appendChild(makeDivider());
    menu.appendChild(makeItem('\ud83d\udeaa Quit', () => { this.hideContextMenu(); window.api?.quit?.(); }));

    document.body.appendChild(menu);
    this.contextMenuEl = menu;
  }

  private hideContextMenu(): void {
    if (this.contextMenuEl) { this.contextMenuEl.remove(); this.contextMenuEl = null; }
  }

  // --- File Operations ---

  private createNewFile(parentNode: FileNode | null): void {
    let parentPath: string | null;
    let effectiveParentNode: FileNode | null = null;

    if (!parentNode) {
      parentPath = this.rootPath;
    } else if (parentNode.isDirectory) {
      parentPath = parentNode.path;
      effectiveParentNode = parentNode;
    } else {
      const lastSlash = Math.max(parentNode.path.lastIndexOf('/'), parentNode.path.lastIndexOf('\\'));
      parentPath = parentNode.path.substring(0, lastSlash);
    }

    if (!parentPath) return;

    this.newFileInput = { parentPath, parentNode: effectiveParentNode };

    if (effectiveParentNode?.isDirectory) {
      this.expandedDirs.add(parentPath);
    }
    this.render();
  }

  private async handleNewFileSubmit(fileName: string): Promise<void> {
    if (!this.newFileInput || !window.api?.createFile) return;
    if (!fileName.trim()) { this.newFileInput = null; this.render(); return; }

    try {
      const sep = this.newFileInput.parentPath.includes('\\') ? '\\' : '/';
      const pp = this.newFileInput.parentPath;
      const filePath = `${pp}${pp.endsWith('/') || pp.endsWith('\\') ? '' : sep}${fileName}`;
      await window.api.createFile(filePath);
      await this.loadDirectory(this.newFileInput.parentPath, this.newFileInput.parentNode ? this.newFileInput.parentPath : undefined);
      this.config.onFileOpen?.(filePath);
      this.newFileInput = null;
      this.render();
    } catch (err) {
      console.error('[FileTree] Failed to create file:', err);
      this.newFileInput = null;
      this.render();
    }
  }

  private createNewFolder(parentNode: FileNode | null): void {
    let parentPath: string | null;
    let effectiveParentNode: FileNode | null = null;

    if (!parentNode) {
      parentPath = this.rootPath;
    } else if (parentNode.isDirectory) {
      parentPath = parentNode.path;
      effectiveParentNode = parentNode;
    } else {
      const lastSlash = Math.max(parentNode.path.lastIndexOf('/'), parentNode.path.lastIndexOf('\\'));
      parentPath = parentNode.path.substring(0, lastSlash);
    }

    if (!parentPath) return;

    this.newFolderInput = { parentPath, parentNode: effectiveParentNode };

    if (effectiveParentNode?.isDirectory) {
      this.expandedDirs.add(parentPath);
    }
    this.render();
  }

  private async handleNewFolderSubmit(folderName: string): Promise<void> {
    if (!this.newFolderInput || !window.api?.createDirectory) return;
    if (!folderName.trim()) { this.newFolderInput = null; this.render(); return; }

    try {
      const sep = this.newFolderInput.parentPath.includes('\\') ? '\\' : '/';
      const pp = this.newFolderInput.parentPath;
      const folderPath = `${pp}${pp.endsWith('/') || pp.endsWith('\\') ? '' : sep}${folderName}`;
      await window.api.createDirectory(folderPath);
      await this.loadDirectory(this.newFolderInput.parentPath, this.newFolderInput.parentNode ? this.newFolderInput.parentPath : undefined);

      if (!this.expandedDirs.has(this.newFolderInput.parentPath)) {
        this.expandedDirs.add(this.newFolderInput.parentPath);
      }
      this.newFolderInput = null;
      this.render();
    } catch (err) {
      console.error('[FileTree] Failed to create folder:', err);
      this.newFolderInput = null;
      this.render();
    }
  }

  private async renameNode(node: FileNode): Promise<void> {
    if (!window.api?.renameFile) return;

    const newName = prompt('Enter new name:', node.name);
    if (!newName || newName === node.name) return;

    try {
      const lastSlash = Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\'));
      const parentPath = node.path.substring(0, lastSlash);
      const sep = node.path.includes('\\') ? '\\' : '/';
      const newPath = `${parentPath}${sep}${newName}`;
      await window.api.renameFile(node.path, newPath);

      if (parentPath === this.rootPath || !parentPath) {
        if (this.rootPath) await this.loadDirectory(this.rootPath, undefined);
      } else {
        await this.loadDirectory(parentPath, parentPath);
      }
    } catch (err) {
      console.error('[FileTree] Failed to rename:', err);
    }
  }

  private async deleteNode(node: FileNode): Promise<void> {
    if (!window.api?.deleteFile) return;

    const msg = node.isDirectory
      ? `Delete folder "${node.name}" and all its contents?`
      : `Delete file "${node.name}"?`;
    if (!confirm(msg)) return;

    try {
      await window.api.deleteFile(node.path, node.isDirectory);
      const lastSlash = Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\'));
      const parentPath = node.path.substring(0, lastSlash);

      if (parentPath === this.rootPath || !parentPath) {
        if (this.rootPath) await this.loadDirectory(this.rootPath, undefined);
      } else {
        await this.loadDirectory(parentPath, parentPath);
      }
    } catch (err) {
      console.error('[FileTree] Failed to delete:', err);
    }
  }

  // --- Helpers ---

  private getDirName(path: string | null): string {
    if (!path) return 'FILES';
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'FILES';
  }

  // --- Cleanup ---

  protected onDestroy(): void {
    this.hideContextMenu();
    if (this.config.driveFileWatcher && window.api?.fileTreeStopWatching) {
      window.api.fileTreeStopWatching();
    }
    if (window.api?.fileTreeRemoveChangeListener) {
      window.api.fileTreeRemoveChangeListener();
    }
  }
}
