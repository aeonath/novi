/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

// File Tree Component - Read-only file browser
import { DirectoryEntry } from '../../types/global';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  isExpanded?: boolean;
  children?: FileNode[];
  size?: number;
}

export class FileTree {
  private container: HTMLDivElement;
  private rootPath: string | null = null;
  private nodes: Map<string, FileNode> = new Map();

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }
    this.container = container as HTMLDivElement;
    this.setupStyles();
  }

  private setupStyles(): void {
    if (!this.container) {
      return;
    }
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      background: #252526;
      color: #cccccc;
      font-family: 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      user-select: none;
    `;
  }

  public async loadDirectory(path: string): Promise<void> {
    if (!window.api) {
      throw new Error('API not available');
    }

    this.rootPath = path;
    this.nodes.clear();
    this.container.innerHTML = '';

    try {
      const entries = await window.api.readDirectory(path);
      const rootNode: FileNode = {
        name: path.split(/[/\\]/).pop() ?? path,
        path,
        type: 'directory',
        isExpanded: true,
        children: entries.map((entry) => this.createNode(entry)),
      };

      this.nodes.set(path, rootNode);
      this.renderNode(rootNode, this.container, 0);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load directory:', error);
      this.container.innerHTML = '<div style="padding: 8px; color: #f48771;">Failed to load directory</div>';
    }
  }

  private createNode(entry: DirectoryEntry): FileNode {
    const node: FileNode = {
      name: entry.name,
      path: entry.path,
      type: entry.type,
      isExpanded: false,
      size: entry.size,
    };

    if (entry.isDirectory) {
      node.children = [];
    }

    this.nodes.set(entry.path, node);
    return node;
  }

  private renderNode(node: FileNode, parent: HTMLElement, depth: number): void {
    const item = document.createElement('div');
    item.dataset.path = node.path;
    item.style.cssText = `
      display: flex;
      align-items: center;
      padding: 4px 8px;
      padding-left: ${8 + depth * 16}px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s;
    `;

    const icon = document.createElement('span');
    icon.style.cssText = `
      margin-right: 4px;
      width: 16px;
      display: inline-block;
      text-align: center;
    `;

    if (node.type === 'directory') {
      icon.textContent = node.isExpanded ? '▼' : '▶';
      icon.style.color = '#4ec9b0';
    } else {
      icon.textContent = '•';
      icon.style.color = '#cccccc';
    }

    const label = document.createElement('span');
    label.textContent = node.name;
    label.style.flex = '1';

    item.appendChild(icon);
    item.appendChild(label);

    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.background = '#2a2d2e';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });

    // Click handler for directories
    if (node.type === 'directory') {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        void this.toggleDirectory(node);
      });
    }

    parent.appendChild(item);

    // Render children if expanded
    if (node.type === 'directory' && node.isExpanded && node.children) {
      for (const child of node.children) {
        this.renderNode(child, parent, depth + 1);
      }
    }
  }

  private async toggleDirectory(node: FileNode): Promise<void> {
    if (node.type !== 'directory') {
      return;
    }

    // Load children if not loaded
    if (node.children?.length === 0 && !node.isExpanded) {
      try {
        if (!window.api) {
          return;
        }
        const entries = await window.api.readDirectory(node.path);
        node.children = entries.map((entry) => this.createNode(entry));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load directory contents:', error);
        return;
      }
    }

    node.isExpanded = !node.isExpanded;
    this.render();
  }

  private render(): void {
    if (!this.rootPath) {
      return;
    }

    const rootNode = this.nodes.get(this.rootPath);
    if (!rootNode) {
      return;
    }

    this.container.innerHTML = '';
    this.renderNode(rootNode, this.container, 0);
  }

  public selectDirectory(): Promise<string | null> {
    if (!window.api) {
      return Promise.resolve(null);
    }
    return window.api.selectDirectory();
  }

  public getRootPath(): string | null {
    return this.rootPath;
  }
}
