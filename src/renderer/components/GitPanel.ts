/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * GitPanel - Git source control panel (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';
import type { GitStatus, GitFileStatus } from '../../types/global';

const DEBUG_GIT_OPERATIONS = false;

export interface GitPanelConfig {
  workspaceRoot: string | null;
  onRefreshStatus?: () => void;
  onToggleFiles?: () => void;
}

export class GitPanel extends Component {
  private _workspaceRoot: string | null;
  private onRefreshStatus?: () => void;
  private onToggleFiles?: () => void;

  private gitStatus: GitStatus | null = null;
  private commitMessage = '';
  private isCommitting = false;
  private isPushing = false;
  private isPulling = false;
  private error: string | null = null;
  private success: string | null = null;
  private needsCredentials = false;
  private credentialInput = '';
  private credentialPrompt = '';
  private currentCredentialRequest: any = null;

  // DOM elements
  private containerEl: HTMLElement;

  constructor(config: GitPanelConfig) {
    super('div');
    this._workspaceRoot = config.workspaceRoot;
    this.onRefreshStatus = config.onRefreshStatus;
    this.onToggleFiles = config.onToggleFiles;

    this.containerEl = this.el;
    setStyles(this.containerEl, {
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: '#252526', color: '#cccccc', overflow: 'hidden',
    });
  }

  set workspaceRoot(root: string | null) {
    const changed = this._workspaceRoot !== root;
    this._workspaceRoot = root;
    if (changed) {
      this.gitStatus = null;
      this.render();
      if (root) this.startWatching();
    }
  }

  protected onMount(): void {
    this.render();
    if (this._workspaceRoot) this.startWatching();

    // Credential listener
    if (window.api?.gitOnCredentialRequest) {
      window.api.gitOnCredentialRequest((request: any) => {
        this.currentCredentialRequest = request;
        this.credentialPrompt = request.prompt;
        this.needsCredentials = true;
        this.credentialInput = '';
        this.error = null;
        this.success = null;
        this.render();
      });
      this.addCleanup(() => window.api?.gitRemoveCredentialListener?.());
    }
  }

  private startWatching(): void {
    if (!this._workspaceRoot || !window.api?.gitStartWatching || !window.api?.gitOnChange) return;
    const normalized = this._workspaceRoot.replace(/\\/g, '/');
    if (/^[A-Za-z]:\/?$/.test(normalized)) return;

    const root = this._workspaceRoot;
    setTimeout(() => {
      window.api.gitStartWatching(root).catch(() => {});
      this.refreshStatus();
    }, 100);

    window.api.gitOnChange(() => {
      if (root && window.api?.gitManualRefresh) {
        window.api.gitManualRefresh(root).then((status: GitStatus) => {
          this.gitStatus = status;
          this.error = null;
          this.onRefreshStatus?.();
          this.render();
        }).catch(() => {
          this.error = 'Failed to get Git status';
          this.render();
        });
      }
    });

    this.addCleanup(() => {
      window.api?.gitRemoveChangeListener?.();
      window.api?.gitStopWatching?.().catch(() => {});
    });
  }

  private async refreshStatus(): Promise<void> {
    if (!this._workspaceRoot || !window.api?.gitManualRefresh) return;
    try {
      this.gitStatus = await window.api.gitManualRefresh(this._workspaceRoot);
      this.error = null;
      this.onRefreshStatus?.();
    } catch (_) {
      this.error = 'Failed to get Git status';
    }
    this.render();
  }

  private async handleStageFile(filePath: string): Promise<void> {
    if (!this._workspaceRoot || !window.api?.gitStageFile) return;
    try { await window.api.gitStageFile(this._workspaceRoot, filePath); await this.refreshStatus(); }
    catch (_) { this.error = 'Failed to stage file'; this.render(); }
  }

  private async handleUnstageFile(filePath: string): Promise<void> {
    if (!this._workspaceRoot || !window.api?.gitUnstageFile) return;
    try { await window.api.gitUnstageFile(this._workspaceRoot, filePath); await this.refreshStatus(); }
    catch (_) { this.error = 'Failed to unstage file'; this.render(); }
  }

  private async handleCommit(): Promise<void> {
    if (!this._workspaceRoot || !window.api?.gitCommit) return;
    this.isCommitting = true; this.error = null; this.success = null; this.render();
    try {
      const result = await window.api.gitCommit(this._workspaceRoot, this.commitMessage.trim());
      if (result.success) {
        this.success = 'Committed successfully'; this.commitMessage = '';
        await this.refreshStatus();
        setTimeout(() => { this.success = null; this.render(); }, 3000);
      } else { this.error = result.error || 'Commit failed'; }
    } catch (_) { this.error = 'Failed to commit changes'; }
    this.isCommitting = false; this.render();
  }

  private async handlePush(): Promise<void> {
    if (!this._workspaceRoot || !window.api?.gitPush) return;
    this.isPushing = true; this.error = null; this.success = null; this.render();
    try {
      const result = await window.api.gitPush(this._workspaceRoot);
      if (result.success) {
        this.success = 'Pushed successfully'; await this.refreshStatus();
        setTimeout(() => { this.success = null; this.render(); }, 3000);
      } else { this.error = result.error || 'Push failed'; }
    } catch (_) { this.error = 'Failed to push changes'; }
    this.isPushing = false; this.render();
  }

  private async handlePull(): Promise<void> {
    if (!this._workspaceRoot || !window.api?.gitPull) return;
    this.isPulling = true; this.error = null; this.success = null; this.render();
    try {
      const result = await window.api.gitPull(this._workspaceRoot);
      if (result.success) {
        this.success = 'Pulled successfully'; await this.refreshStatus();
        setTimeout(() => { this.success = null; this.render(); }, 3000);
      } else { this.error = result.error || 'Pull failed'; }
    } catch (_) { this.error = 'Failed to pull changes'; }
    this.isPulling = false; this.render();
  }

  private async handleCredentialSubmit(): Promise<void> {
    if (!this.credentialInput.trim() || !window.api?.gitProvideCredentials) return;
    try { await window.api.gitProvideCredentials({ password: this.credentialInput, cancelled: false }); }
    catch (_) {}
    this.needsCredentials = false; this.credentialInput = ''; this.currentCredentialRequest = null;
    this.render();
  }

  private async handleCredentialCancel(): Promise<void> {
    if (window.api?.gitProvideCredentials) {
      try { await window.api.gitProvideCredentials({ cancelled: true }); } catch (_) {}
    }
    this.needsCredentials = false; this.credentialInput = ''; this.currentCredentialRequest = null;
    this.error = 'Authentication cancelled';
    this.render();
    setTimeout(() => { this.error = null; this.render(); }, 3000);
  }

  private render(): void {
    clearChildren(this.containerEl);

    if (!this._workspaceRoot) {
      this.renderEmptyState('No workspace open', 'Open a folder to see Git status');
      return;
    }
    if (!this.gitStatus) {
      this.renderEmptyState('Loading Git status...'); return;
    }
    if (!this.gitStatus.isRepo) {
      this.renderEmptyState('Not a Git repository', 'Initialize Git to track changes'); return;
    }

    const stagedFiles = this.gitStatus.files.filter(f => f.staged);
    const unstagedFiles = this.gitStatus.files.filter(f => !f.staged);

    // Header
    const header = el('div');
    setStyles(header, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '35px', padding: '0 12px', borderBottom: '1px solid #3e3e42' });
    const branchInfo = el('div', {}, el('span', {}, '\u2387 '));
    setStyles(branchInfo, { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' });
    const branchName = el('span', {}, this.gitStatus.branch || 'detached');
    (branchName as HTMLElement).style.fontWeight = '600';
    branchInfo.appendChild(branchName);
    if (this.gitStatus.ahead > 0) branchInfo.appendChild(this.makeBadge(`\u2191${this.gitStatus.ahead}`));
    if (this.gitStatus.behind > 0) branchInfo.appendChild(this.makeBadge(`\u2193${this.gitStatus.behind}`));
    const headerBtns = el('div');
    setStyles(headerBtns, { display: 'flex', gap: '4px' });
    const refreshBtn = this.makeIconBtn('\u27F3', 'Refresh', () => this.refreshStatus());
    headerBtns.appendChild(refreshBtn);
    if (this.onToggleFiles) {
      headerBtns.appendChild(this.makeIconBtn('\u2190', 'Show Files', () => this.onToggleFiles!()));
    }
    header.append(branchInfo, headerBtns);

    // Commit section
    const commitSection = el('div');
    setStyles(commitSection, { padding: '16px', paddingTop: '20px', borderBottom: '1px solid #3e3e42' });

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Commit message (optional)...';
    textarea.value = this.commitMessage;
    textarea.disabled = this.isCommitting || stagedFiles.length === 0;
    setStyles(textarea, {
      width: '100%', minHeight: '60px', padding: '10px', backgroundColor: '#1e1e1e',
      color: '#cccccc', border: '1px solid #3e3e42', borderRadius: '4px',
      fontSize: '12px', fontFamily: 'inherit', resize: 'none', marginBottom: '8px', marginTop: '4px', boxSizing: 'border-box',
    });
    textarea.addEventListener('input', () => { this.commitMessage = textarea.value; });

    const commitActions = el('div');
    setStyles(commitActions, { display: 'flex', gap: '8px', marginBottom: '8px' });
    const commitBtn = this.makeBtn(
      this.isCommitting ? 'Committing...' : `Commit (${stagedFiles.length})`,
      () => this.handleCommit(),
      this.isCommitting || stagedFiles.length === 0
    );
    commitBtn.style.flex = '1';
    const pushBtn = this.makeBtn(
      this.isPushing ? '...' : `\u2191 Push${this.gitStatus.ahead > 0 ? ` (${this.gitStatus.ahead})` : ''}`,
      () => this.handlePush(),
      this.isPushing || this.gitStatus.ahead === 0
    );
    const pullBtn = this.makeBtn(
      this.isPulling ? '...' : `\u2193 Pull${this.gitStatus.behind > 0 ? ` (${this.gitStatus.behind})` : ''}`,
      () => this.handlePull(),
      this.isPulling || this.gitStatus.behind === 0
    );
    commitActions.append(commitBtn, pushBtn, pullBtn);

    // Status message
    const statusContainer = el('div');
    setStyles(statusContainer, { minHeight: '32px', display: 'flex', alignItems: 'center' });
    if (this.needsCredentials) {
      const credContainer = el('div');
      setStyles(credContainer, { width: '100%', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' });
      const prompt = el('div', {}, this.credentialPrompt);
      setStyles(prompt, { fontSize: '11px', color: '#cccccc', textAlign: 'center' });
      const input = document.createElement('input');
      input.type = 'password'; input.placeholder = 'Password or Personal Access Token';
      input.value = this.credentialInput;
      setStyles(input, { width: '100%', padding: '6px 8px', backgroundColor: '#1e1e1e', color: '#cccccc', border: '1px solid #007acc', borderRadius: '3px', fontSize: '12px', fontFamily: 'inherit', outline: 'none' });
      input.addEventListener('input', () => { this.credentialInput = input.value; });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.handleCredentialSubmit(); }
        else if (e.key === 'Escape') { e.preventDefault(); this.handleCredentialCancel(); }
      });
      const hint = el('div', {}, 'Press Enter to submit, Escape to cancel');
      setStyles(hint, { fontSize: '10px', color: '#808080', textAlign: 'center' });
      credContainer.append(prompt, input, hint);
      statusContainer.appendChild(credContainer);
      setTimeout(() => input.focus(), 0);
    } else if (this.error) {
      const msg = el('div', {}, this.error);
      setStyles(msg, { width: '100%', padding: '8px 0', backgroundColor: '#5a1d1d', color: '#f48771', fontSize: '12px', textAlign: 'center' });
      statusContainer.appendChild(msg);
    } else if (this.success) {
      const msg = el('div', {}, this.success);
      setStyles(msg, { width: '100%', padding: '8px 0', backgroundColor: '#1e5c1e', color: '#73c991', fontSize: '12px', textAlign: 'center' });
      statusContainer.appendChild(msg);
    }

    commitSection.append(textarea, commitActions, statusContainer);

    // Files list
    const filesList = el('div');
    setStyles(filesList, { flex: '1', overflow: 'auto' });

    if (stagedFiles.length > 0) {
      filesList.appendChild(this.renderFileSection('STAGED CHANGES', stagedFiles, (f) => this.handleUnstageFile(f.path), '\u2212', 'Unstage'));
    }
    if (unstagedFiles.length > 0) {
      filesList.appendChild(this.renderFileSection('CHANGES', unstagedFiles, (f) => this.handleStageFile(f.path), '+', 'Stage'));
    }
    if (this.gitStatus.files.length === 0) {
      const noChanges = el('div');
      setStyles(noChanges, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' });
      noChanges.appendChild(el('p', {}, 'No changes'));
      const sub = el('p', {}, 'Working tree is clean');
      setStyles(sub, { fontSize: '12px', color: '#808080', marginTop: '8px' });
      noChanges.appendChild(sub);
      filesList.appendChild(noChanges);
    }

    this.containerEl.append(header, commitSection, filesList);
  }

  private renderEmptyState(text: string, subtitle?: string): void {
    const wrapper = el('div');
    setStyles(wrapper, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' });
    wrapper.appendChild(el('p', {}, text));
    if (subtitle) {
      const sub = el('p', {}, subtitle);
      setStyles(sub, { fontSize: '12px', color: '#808080', marginTop: '8px' });
      wrapper.appendChild(sub);
    }
    this.containerEl.appendChild(wrapper);
  }

  private renderFileSection(title: string, files: GitFileStatus[], onAction: (f: GitFileStatus) => void, actionLabel: string, actionTitle: string): HTMLElement {
    const section = el('div');
    section.style.marginTop = '12px';
    const titleEl = el('div', {}, `${title} (${files.length})`);
    setStyles(titleEl, { padding: '4px 12px', fontSize: '11px', fontWeight: '600', color: '#808080', textTransform: 'uppercase' });
    section.appendChild(titleEl);

    for (const file of files) {
      const row = el('div');
      setStyles(row, { display: 'flex', alignItems: 'center', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' });
      row.addEventListener('mouseenter', () => { row.style.backgroundColor = '#2a2d2e'; });
      row.addEventListener('mouseleave', () => { row.style.backgroundColor = 'transparent'; });

      const statusIcon = el('span', {}, this.getStatusIcon(file.status));
      setStyles(statusIcon, { width: '20px', fontWeight: '600', marginRight: '8px', color: this.getStatusColor(file.status) });

      const fileName = el('span', {}, file.path);
      setStyles(fileName, { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });

      const actionBtn = el('button', { type: 'button' }, actionLabel);
      actionBtn.title = actionTitle;
      setStyles(actionBtn, { background: 'none', border: 'none', color: '#cccccc', fontSize: '14px', cursor: 'pointer', padding: '2px 8px', opacity: '0.7' });
      actionBtn.addEventListener('click', (e) => { e.stopPropagation(); onAction(file); });

      row.append(statusIcon, fileName, actionBtn);
      section.appendChild(row);
    }
    return section;
  }

  private getStatusIcon(status: GitFileStatus['status']): string {
    const map: Record<string, string> = { modified: 'M', added: 'A', deleted: 'D', renamed: 'R', untracked: 'U' };
    return map[status] ?? '?';
  }

  private getStatusColor(status: GitFileStatus['status']): string {
    const map: Record<string, string> = { modified: '#e2c08d', added: '#73c991', deleted: '#f48771', renamed: '#4fc1ff', untracked: '#808080' };
    return map[status] ?? '#cccccc';
  }

  private makeBadge(text: string): HTMLElement {
    const badge = el('span', {}, text);
    setStyles(badge, { padding: '2px 6px', backgroundColor: '#3e3e42', borderRadius: '10px', fontSize: '11px' });
    return badge;
  }

  private makeIconBtn(icon: string, title: string, handler: () => void): HTMLElement {
    const btn = el('button', { type: 'button' }, icon);
    btn.title = title;
    setStyles(btn, { background: 'none', border: 'none', color: '#cccccc', fontSize: '16px', cursor: 'pointer', padding: '4px 8px' });
    btn.addEventListener('click', handler);
    return btn;
  }

  private makeBtn(text: string, handler: () => void, disabled: boolean): HTMLElement {
    const btn = el('button', { type: 'button' }, text);
    setStyles(btn, {
      padding: '6px 12px', backgroundColor: '#0e639c', color: '#ffffff',
      border: 'none', borderRadius: '2px', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
    });
    if (disabled) { setStyles(btn, { opacity: '0.5', cursor: 'not-allowed' }); btn.setAttribute('disabled', ''); }
    else { btn.addEventListener('click', handler); }
    return btn;
  }
}
