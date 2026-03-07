/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * App — Vanilla TypeScript root application component.
 * Replaces React App.tsx + AppContext.tsx.
 * Owns all UI state, mounts all child components, handles IPC and keyboard shortcuts.
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';
import { appState } from '../core/app-state.js';
import { TitleBar } from './TitleBar.js';
import { StatusBar } from './StatusBar.js';
import { TabBar } from './TabBar.js';
import type { Tab } from './TabBar.js';
import { MonacoEditor } from './MonacoEditor.js';
import { ImageEditor } from './ImageEditor.js';
import { FileTree } from './FileTree.js';
import { GitPanel } from './GitPanel.js';
import { Terminal } from './Terminal.js';
import { NoviShell } from './NoviShell.js';
import { SettingsTab } from './SettingsTab.js';
import type { SettingsSection } from './SettingsTab.js';
import { SettingsSidebar } from './SettingsSidebar.js';
import { DiagnosticsPanel } from './DiagnosticsPanel.js';
import { RecoveryDialog } from './RecoveryDialog.js';
import { SavePrompt, type SavePromptCallbacks } from './SavePrompt.js';
import type { ActionContext } from './actions.js';
import { ensureReady, waitForMultipleReady } from '../utils/ready-events.js';
import { isImageFile, getMimeType } from '../../core/image/image-utils.js';

const HOME_TERMINAL_ID = 'terminal-home';
const homeTerminalPinnedSet = new Set([HOME_TERMINAL_ID]);

interface ActiveTab {
  id: string;
  type: 'file' | 'image' | 'terminal' | 'novi-prompt' | 'settings';
  filePath?: string;
  fileName?: string;
}

export class App extends Component {
  // ---- State ----
  private showWelcome = false;
  private monacoReady = false;
  private showGitPanel = false;
  private gitEnabled = true;
  private workspaceRoot: string | null = null;
  private activeTab: ActiveTab | null = null;
  private terminalTabs: Array<{ id: string; fileName: string; workspaceRoot?: string | null }> = [];
  private noviPromptTabs: Array<{ id: string; fileName: string }> = [];
  private untitledCounter = 1;
  private sidebarWidth = 250;
  private isResizing = false;
  private editorFontSize = 14;
  private terminalFontSize = 14;
  private showAbout = false;
  private showCheckUpdates = false;
  private appVersion = 'unknown';
  private singleFileTree = true;
  private terminalFileTreeRoots: Record<string, { cwd: string; overriddenRoot?: string }> = {};
  private fileTabToTreeRoot: Record<string, string> = {};
  private fileTreeReportedRoot: string | null = null;
  private savePromptState: { show: boolean; fileName: string; tabId: string; resolve: ((v: boolean) => void) | null } = { show: false, fileName: '', tabId: '', resolve: null };
  private forceCloseTabId: string | null = null;
  private previousActiveTabId: string | null = null;
  private lastFileTreeRoot: string | null = null;
  private welcomeContextMenu: { x: number; y: number } | null = null;
  private shellLabel = 'git-bash';
  // restartingTerminalId tracked via (window as any).__restartingTerminalId

  // ---- DOM refs ----
  private sidebarEl!: HTMLElement;
  private dividerEl!: HTMLElement;
  private editorAreaEl!: HTMLElement;
  private welcomeEl!: HTMLElement;
  private monacoContainerEl!: HTMLElement;
  private imageEditorContainerEl!: HTMLElement;
  private terminalContainerEl!: HTMLElement;
  private noviShellContainerEl!: HTMLElement;
  private fileTreeContainerEl!: HTMLElement;
  private gitPanelContainerEl!: HTMLElement;
  private statusBarContainerEl!: HTMLElement;
  private noviPromptPlaceholderEl!: HTMLElement;
  private settingsContainerEl!: HTMLElement;
  private settingsSidebarContainerEl!: HTMLElement;
  private aboutOverlay: HTMLElement | null = null;
  private checkUpdatesOverlay: HTMLElement | null = null;
  private welcomeContextMenuEl: HTMLElement | null = null;

  // ---- Component instances ----
  private titleBar!: TitleBar;
  private tabBar!: TabBar;
  private statusBar!: StatusBar;
  private fileTree!: FileTree;
  private gitPanel!: GitPanel;
  private monacoEditor!: MonacoEditor;
  private savePromptInst!: SavePrompt;
  private terminalInstances = new Map<string, { instance: Terminal; container: HTMLElement }>();
  private noviShellInstances = new Map<string, { instance: NoviShell; container: HTMLElement }>();
  private imageEditorInstance: { instance: ImageEditor; filePath: string } | null = null;
  private settingsTab: SettingsTab | null = null;
  private settingsSidebar: SettingsSidebar | null = null;
  private actionContext: ActionContext = {};
  private pendingReloadBanners = new Map<string, HTMLElement>(); // file path → banner element

  constructor() {
    super('div', 'novi-layout');
    (window as any).__appInstance = this;
    setStyles(this.el, {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#1e1e1e',
      color: '#cccccc',
    });
    this.buildLayout();
  }

  protected onMount(): void {
    this.mountChildComponents();
    this.setupIpcListeners();
    this.setupKeyboardShortcuts();
    this.loadSettings();
    this.loadWorkspace();
    this.checkMonaco();
  }

  protected onDestroy(): void {
    // Destroy all child component instances
    this.titleBar?.destroy();
    this.tabBar?.destroy();
    this.statusBar?.destroy();
    this.fileTree?.destroy();
    this.gitPanel?.destroy();
    this.monacoEditor?.destroy();
    this.savePromptInst?.destroy();
    for (const [, entry] of this.terminalInstances) { entry.instance.destroy(); entry.container.remove(); }
    for (const [, entry] of this.noviShellInstances) { entry.instance.destroy(); entry.container.remove(); }
    if (this.imageEditorInstance) this.imageEditorInstance.instance.destroy();
    delete (window as any).__actionAPI;
    delete (window as any).__noviVimQuit;
  }

  // ============================================================
  // Layout
  // ============================================================

  private buildLayout(): void {
    // TitleBar container
    const titleBarContainer = el('div', { style: 'display: contents;' });

    // Main content
    const mainContent = el('div', { style: 'display: flex; flex: 1; overflow: hidden;' });

    // Sidebar
    this.noviPromptPlaceholderEl = el('div', { style: 'display: none; flex-direction: column; height: 100%; background-color: #252526;' });
    this.fileTreeContainerEl = el('div', { style: 'display: flex; flex-direction: column; height: 100%;' });
    this.gitPanelContainerEl = el('div', { style: 'display: none; flex-direction: column; height: 100%;' });
    this.settingsSidebarContainerEl = el('div', { style: 'display: none; flex-direction: column; height: 100%;' });
    this.sidebarEl = el('div', { style: `background-color: #252526; border-right: 1px solid #3e3e42; overflow: auto; width: ${this.sidebarWidth}px; flex-shrink: 0;` },
      this.noviPromptPlaceholderEl,
      this.fileTreeContainerEl,
      this.gitPanelContainerEl,
      this.settingsSidebarContainerEl,
    );

    // Resize divider
    this.dividerEl = el('div', { style: 'width: 4px; cursor: col-resize; background-color: transparent; transition: background-color 0.2s;' });
    this.dividerEl.addEventListener('mousedown', (e) => { e.preventDefault(); this.startResize(); });
    this.dividerEl.addEventListener('mouseenter', () => { if (!this.isResizing) this.dividerEl.style.backgroundColor = '#3e3e42'; });
    this.dividerEl.addEventListener('mouseleave', () => { if (!this.isResizing) this.dividerEl.style.backgroundColor = 'transparent'; });

    // Editor area
    const tabBarContainer = el('div', { style: 'display: contents;' });

    this.welcomeEl = el('div', { style: 'flex: 1; display: none; flex-direction: column; align-items: center; justify-content: center; font-size: 1.2em; text-align: center; outline: none;' });
    this.welcomeEl.addEventListener('contextmenu', (e) => this.showWelcomeContextMenu(e));

    this.terminalContainerEl = el('div', { style: 'display: contents;' });
    this.noviShellContainerEl = el('div', { style: 'display: contents;' });
    this.monacoContainerEl = el('div', { style: 'flex: 1; display: none; flex-direction: column; overflow: hidden;' });
    this.imageEditorContainerEl = el('div', { style: 'flex: 1; display: none; overflow: hidden;' });
    this.settingsContainerEl = el('div', { style: 'flex: 1; display: none; flex-direction: column; overflow: hidden;' });

    const contentArea = el('div', { style: 'flex: 1; display: flex; flex-direction: column; overflow: hidden;' },
      this.welcomeEl,
      this.terminalContainerEl,
      this.noviShellContainerEl,
      this.monacoContainerEl,
      this.imageEditorContainerEl,
      this.settingsContainerEl,
    );

    this.editorAreaEl = el('div', { style: 'flex: 1; display: flex; flex-direction: column; overflow: hidden;' },
      tabBarContainer,
      contentArea,
    );

    mainContent.appendChild(this.sidebarEl);
    mainContent.appendChild(this.dividerEl);
    mainContent.appendChild(this.editorAreaEl);

    // StatusBar container
    this.statusBarContainerEl = el('div');

    this.el.appendChild(titleBarContainer);
    this.el.appendChild(mainContent);
    this.el.appendChild(this.statusBarContainerEl);

    // Mount TitleBar
    this.titleBar = new TitleBar({
      onCommand: (cmd) => this.handleMenuCommand(cmd),
      activeTabType: null,
    });
    this.titleBar.mount(titleBarContainer);

    // Mount TabBar
    this.tabBar = new TabBar({
      pinnedTabIds: homeTerminalPinnedSet,
      getPreferredNextTabId: () => this.previousActiveTabId,
      onAllTabsClosed: () => {
        this.showWelcome = false;
        this.setActiveTab({ id: HOME_TERMINAL_ID, type: 'terminal' });
        const api = (window as any).__tabBarAPI;
        if (api) api.switchTab(HOME_TERMINAL_ID);
      },
      onTabSwitch: (tab) => this.onTabSwitch(tab),
      onTabClose: (tabId) => this.onTabClose(tabId),
    });
    this.tabBar.mount(tabBarContainer);
  }

  // ============================================================
  // Child component mounting
  // ============================================================

  private mountChildComponents(): void {
    // Settings tab + sidebar
    this.settingsTab = new SettingsTab();
    this.settingsTab.mount(this.settingsContainerEl);
    this.addCleanup(() => this.settingsTab?.destroy());

    this.settingsSidebar = new SettingsSidebar({
      onSectionSelect: (section: SettingsSection) => {
        if (this.settingsTab) this.settingsTab.section = section;
      },
    });
    this.settingsSidebar.mount(this.settingsSidebarContainerEl);
    this.addCleanup(() => this.settingsSidebar?.destroy());

    // Modal components on document.body
    const diagnosticsPanel = new DiagnosticsPanel();
    diagnosticsPanel.mount(document.body);
    this.addCleanup(() => diagnosticsPanel.destroy());

    const recoveryDialog = new RecoveryDialog();
    recoveryDialog.mount(document.body);
    this.addCleanup(() => recoveryDialog.destroy());

    this.savePromptInst = new SavePrompt();
    this.savePromptInst.mount(document.body);

    // StatusBar
    this.statusBar = new StatusBar();
    this.statusBar.mount(this.statusBarContainerEl);
    this.statusBar.onHomeClick = () => {
      const api = (window as any).__tabBarAPI;
      if (api) api.switchTab(HOME_TERMINAL_ID);
      this.showWelcome = false;
      this.setActiveTab({ id: HOME_TERMINAL_ID, type: 'terminal' });
    };

    // FileTree
    this.fileTree = new FileTree({
      onFileOpen: (fp) => this.onFileTreeFileOpen(fp),
      onDirectoryOpen: (dp) => this.onFileTreeDirectoryOpen(dp),
      onToggleGit: () => { if (this.gitEnabled) { this.showGitPanel = !this.showGitPanel; this.updateSidebarVisibility(); } },
      onNewTerminal: () => this.actionContext.onNewTerminal?.(),
      onNoviPrompt: () => this.actionContext.onNoviPrompt?.(),
      onRootChange: (p) => { this.fileTreeReportedRoot = p; this.statusBar.fileTreePath = p; },
      showGitToggle: true,
      showOpenFolder: this.singleFileTree,
    });
    this.fileTree.loading = true;
    this.fileTree.mount(this.fileTreeContainerEl);

    // GitPanel
    this.gitPanel = new GitPanel({
      workspaceRoot: null,
      onToggleFiles: () => { this.showGitPanel = false; this.updateSidebarVisibility(); },
      onRefreshStatus: async () => {
        const gitRoot = this.currentFileTreeDisplayRoot || this.workspaceRoot;
        if (!gitRoot || !window.api?.gitGetStatus) return;
        try {
          const status = await window.api.gitGetStatus(gitRoot);
          if (status.isRepo) appState.gitStatus = status;
        } catch (error) {
          console.error('[App] Failed to refresh git status:', error);
        }
      },
    });
    this.gitPanel.mount(this.gitPanelContainerEl);

    // MonacoEditor
    this.monacoEditor = new MonacoEditor({
      fontSize: this.editorFontSize,
      onDirtyChange: (isDirty) => {
        const tabBarAPI = (window as any).__tabBarAPI;
        const current = tabBarAPI?.getActiveTab();
        if (current && current.type === 'file') tabBarAPI.updateTabDirty(current.id, isDirty);
      },
    });
    this.monacoEditor.mount(this.monacoContainerEl);

    // Build action context
    this.buildActionContext();

    // Expose action API globally
    (window as any).__actionAPI = { onNewTerminal: () => this.actionContext.onNewTerminal?.() };

    // Vim :q support
    (window as any).__noviVimQuit = (force: boolean) => {
      const tabBarAPI = (window as any).__tabBarAPI;
      const active = tabBarAPI?.getActiveTab();
      if (active && active.type === 'file') {
        if (force) this.forceCloseTabId = active.id;
        void tabBarAPI.closeTab(active.id);
      }
    };
  }

  // ============================================================
  // IPC Listeners
  // ============================================================

  private earlyTerminalData: Map<string, string[]> = new Map();

  /** Get a Terminal component instance by ID (used by SettingsTab for shell restart) */
  getTerminalInstance(terminalId: string): Terminal | undefined {
    return this.terminalInstances.get(terminalId)?.instance;
  }

  /**
   * Destroy and recreate the home terminal from scratch.
   * Used when switching shells — ensures truly fresh state identical to first load.
   */
  async recreateHomeTerminal(): Promise<void> {
    // Suppress exit handler quit for the deliberate kill
    (window as any).__restartingTerminalId = HOME_TERMINAL_ID;
    // Kill old PTY
    await window.api?.terminalKill?.(HOME_TERMINAL_ID);
    // Clear buffers and API for old instance
    this.earlyTerminalData.delete(HOME_TERMINAL_ID);
    if ((window as any).__terminalAPI) {
      delete (window as any).__terminalAPI[HOME_TERMINAL_ID];
    }
    // Destroy old Terminal component and remove its DOM
    const old = this.terminalInstances.get(HOME_TERMINAL_ID);
    if (old) {
      old.instance.destroy();
      old.container.remove();
      this.terminalInstances.delete(HOME_TERMINAL_ID);
    }
    // syncTerminalInstances creates a fresh Terminal for the existing tab entry
    this.syncTerminalInstances();
  }

  /** Flush any buffered terminal data that arrived before xterm was ready */
  flushEarlyTerminalData(terminalId: string): void {
    const buffer = this.earlyTerminalData.get(terminalId);
    if (!buffer || buffer.length === 0) return;
    const api = (window as any).__terminalAPI?.[terminalId];
    if (api?.write) {
      for (const chunk of buffer) api.write(chunk);
    }
    this.earlyTerminalData.delete(terminalId);
  }

  private setupIpcListeners(): void {
    // Terminal data — buffer if xterm not yet ready, flush later
    if (window.api?.terminalOnData && window.api?.terminalRemoveDataListener) {
      window.api.terminalRemoveDataListener();
      window.api.terminalOnData((terminalId: string, data: string) => {
        const api = (window as any).__terminalAPI?.[terminalId];
        if (api?.write) {
          api.write(data);
        } else {
          // xterm not ready yet — buffer for replay
          let buf = this.earlyTerminalData.get(terminalId);
          if (!buf) { buf = []; this.earlyTerminalData.set(terminalId, buf); }
          buf.push(data);
        }
      });
      this.addCleanup(() => window.api?.terminalRemoveDataListener?.());
    }

    // Terminal exit
    if (window.api?.terminalOnExit && window.api?.terminalRemoveExitListener) {
      window.api.terminalRemoveExitListener();
      window.api.terminalOnExit((terminalId: string, exitCode: number) => {
        console.log('[App] Terminal', terminalId, 'exited with code', exitCode);
        if (terminalId === HOME_TERMINAL_ID) {
          if ((window as any).__restartingTerminalId === terminalId) {
            (window as any).__restartingTerminalId = null;
            // Deliberate restart — xterm was already cleared before restart.
            // Do NOT resetTerminal() here: it races with the new PTY's output.
            return;
          }
          window.api?.quit?.();
          return;
        }
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          tabBarAPI.closeTab(terminalId);
          this.terminalTabs = this.terminalTabs.filter(t => t.id !== terminalId);
          const tabs = tabBarAPI.getTabs();
          if (tabs.length > 0 && this.activeTab?.id === terminalId) {
            this.setActiveTab(tabs[0]);
            tabBarAPI.setActiveTab(tabs[0].id);
          } else if (tabs.length === 0) {
            this.showWelcome = true;
            this.setActiveTab(null);
          }
        }
      });
      this.addCleanup(() => window.api?.terminalRemoveExitListener?.());
    }

    // Terminal PWD
    if (window.api?.terminalOnPwd && window.api?.terminalRemovePwdListener) {
      window.api.terminalRemovePwdListener();
      window.api.terminalOnPwd((terminalId: string, pwd: string) => {
        console.log('[App] Terminal', terminalId, 'PWD changed to:', pwd);
        this.terminalFileTreeRoots = { ...this.terminalFileTreeRoots, [terminalId]: { ...this.terminalFileTreeRoots[terminalId], cwd: pwd } };
        this.fileTree.loading = false;
        this.updateFileTreeDisplayRoot();
        const segments = pwd.replace(/\\/g, '/').split('/').filter(Boolean);
        const dirName = segments[segments.length - 1] || pwd;
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          const icon = terminalId === HOME_TERMINAL_ID ? '\u{1F5A5}\uFE0F' : '\u{1F4BB}';
          tabBarAPI.updateTabFileName(terminalId, `${icon} ${dirName}/`);
        }
        if (window.api?.gitGetStatus) {
          window.api.gitGetStatus(pwd).then((status: any) => {
            if (status.isRepo) appState.gitStatus = status;
            else appState.gitStatus = null;
          }).catch(() => { appState.gitStatus = null; });
        }
      });
      this.addCleanup(() => window.api?.terminalRemovePwdListener?.());
    }

    // Terminal initial CWD
    if (window.api?.terminalOnInitialCwd && window.api?.terminalRemoveInitialCwdListener) {
      window.api.terminalRemoveInitialCwdListener();
      window.api.terminalOnInitialCwd((terminalId: string, cwd: string) => {
        console.log('[App] Terminal', terminalId, 'initial CWD:', cwd);
        this.terminalFileTreeRoots = { ...this.terminalFileTreeRoots, [terminalId]: { ...this.terminalFileTreeRoots[terminalId], cwd } };
        // Don't clear loading here — initialCwd just echoes the saved workspace CWD.
        // Wait for terminalOnPwd (OSC 7) which reports the shell's actual CWD.
      });
      this.addCleanup(() => window.api?.terminalRemoveInitialCwdListener?.());
    }

    // Menu commands from Electron menu
    if (window.api?.onMenuCommand) {
      window.api.onMenuCommand((command: string) => {
        console.log('[App] Menu command received:', command);
        this.handleMenuCommand(command);
      });
      this.addCleanup(() => window.api?.removeMenuCommandListener?.());
    }

    // singlefiletree setting changes
    const sftHandler = () => {
      window.api?.getSetting<boolean>('singlefiletree', false).then((v) => {
        this.singleFileTree = !!v;
        this.fileTree.setShowOpenFolder(this.singleFileTree);
        this.updateFileTreeDisplayRoot();
      });
    };
    window.addEventListener('novi-singlefiletree-changed', sftHandler);
    this.addCleanup(() => window.removeEventListener('novi-singlefiletree-changed', sftHandler));

    // gitenabled setting changes
    const geHandler = () => {
      window.api?.getSetting<boolean>('gitenabled', true).then((v) => {
        this.gitEnabled = v !== false;
        this.fileTree.setShowGitToggle(this.gitEnabled);
        if (!this.gitEnabled && this.showGitPanel) {
          this.showGitPanel = false;
          this.updateSidebarVisibility();
        }
      });
    };
    window.addEventListener('novi-gitenabled-changed', geHandler);
    this.addCleanup(() => window.removeEventListener('novi-gitenabled-changed', geHandler));

    // External file change detection — dedicated editor file watcher (independent of file tree)
    if (window.api?.editorOnFileChanged) {
      window.api.editorOnFileChanged((filePath: string) => {
        this.handleExternalFileChange(filePath);
      });
    }
  }

  // ============================================================
  // Keyboard shortcuts
  // ============================================================

  private setupKeyboardShortcuts(): void {
    this.listen(document, 'keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.ctrlKey && ke.key === 'o') { ke.preventDefault(); void this.actionContext.onOpenFile?.(); }
      if (ke.ctrlKey && ke.key === 's') {
        ke.preventDefault();
        if (this.activeTab?.type === 'file' || this.activeTab?.type === 'image') {
          void this.actionContext.onSaveFile?.();
        }
      }
      if (ke.ctrlKey && ke.key === 'r') { ke.preventDefault(); this.reloadFileFromDisk(); }
      if (ke.ctrlKey && ke.shiftKey && ke.key === 'G') { ke.preventDefault(); void this.actionContext.onGitRefresh?.(); }
      if (ke.ctrlKey && ke.key === 'Tab') {
        ke.preventDefault();
        this.cycleTab(ke.shiftKey);
      }
    });
  }

  // ============================================================
  // Settings loading
  // ============================================================

  private async loadSettings(): Promise<void> {
    try {
      const sf = await window.api?.getSetting<boolean>('singlefiletree', false);
      this.singleFileTree = !!sf;
      this.fileTree.setShowOpenFolder(this.singleFileTree);
      if (this.singleFileTree) this.fileTree.loading = false;
      const ef = await window.api?.getSetting<number>('fontSize', 14);
      const tf = await window.api?.getSetting<number>('terminalFontSize', 14);
      this.editorFontSize = ef ?? 14;
      this.terminalFontSize = tf ?? 14;
      this.monacoEditor.fontSize = this.editorFontSize;
      const v = await window.api?.getVersion?.();
      this.appVersion = v ?? 'unknown';
      const ge = await window.api?.getSetting<boolean>('gitenabled', true);
      this.gitEnabled = ge !== false;
      this.fileTree.setShowGitToggle(this.gitEnabled);
      this.shellLabel = this.shellTypeToLabel(await window.api?.getSetting<string>('shellType'));
    } catch { /* ignore */ }
  }

  private shellTypeToLabel(shellType?: string | null): string {
    switch (shellType) {
      case 'cmd': return 'cmd.exe';
      case 'powershell': return 'powershell.exe';
      case 'wsl': return 'WSL';
      case 'linux': return 'linux';
      default: return 'git-bash';
    }
  }

  /** Called by SettingsTab after shell type changes */
  updateShellLabel(shellType: string): void {
    this.shellLabel = this.shellTypeToLabel(shellType);
  }

  // ============================================================
  // Workspace save/restore
  // ============================================================

  private async loadWorkspace(): Promise<void> {
    if (!window.api?.workspaceLoad || !window.api?.getCommandLineArgs) {
      ensureReady('tabbar-ready').then(() => {
        this.createHomeTerminal();
      }).catch(() => {});
      return;
    }

    const args = await window.api.getCommandLineArgs();
    const keeptabs = await window.api.getSetting<boolean>('keeptabs', true);
    if (args.includes('--clean') || !keeptabs) {
      console.log('[App] Skipping workspace restoration');
      await ensureReady('tabbar-ready');
      this.createHomeTerminal();
      return;
    }

    try {
      const workspace = await window.api.workspaceLoad();
      if (!workspace) {
        await ensureReady('tabbar-ready');
        this.createHomeTerminal();
        return;
      }

      console.log('[App] Restoring workspace:', workspace);
      if (workspace.workspaceRoot) {
        this.workspaceRoot = workspace.workspaceRoot;
        // Only restore the saved file tree root in singlefiletree mode.
        // In multi-tree mode, the file tree is driven by terminal CWD —
        // it stays in loading state until the terminal reports its CWD.
        if (this.singleFileTree) {
          ensureReady('filetree-ready').then(() => {
            const ftApi = (window as any).__fileTreeAPI;
            if (ftApi?.loadDirectory) ftApi.loadDirectory(workspace.workspaceRoot);
          }).catch(() => {});
        }
      }
      if (workspace.layout) this.showGitPanel = workspace.layout.showGitPanel;

      await ensureReady('tabbar-ready');
      this.createHomeTerminal(workspace.homeTerminalCwd);

      // Restore files
      if (workspace.openFiles?.length) {
        waitForMultipleReady(['monaco-ready', 'tabbar-ready']).then(async () => {
          const monacoAPI = (window as any).__monacoEditorAPI;
          const tabBarAPI = (window as any).__tabBarAPI;
          if (!monacoAPI || !tabBarAPI || !window.api?.readFile) return;
          let count = 0;
          for (let i = 0; i < workspace.openFiles.length; i++) {
            const file = workspace.openFiles[i];
            if (!file?.filePath) continue;
            try {
              const fileData = await window.api.readFile(file.filePath);
              const fileName = file.filePath.split(/[\\/]/).pop() || 'untitled';
              tabBarAPI.addTab({ id: `tab-${Date.now()}-${i}`, type: 'file', filePath: file.filePath, fileName, isDirty: false, content: fileData.content, language: 'typescript' });
              count++;
            } catch { /* skip */ }
          }
          const aIdx = typeof workspace.activeFileIndex === 'number' ? workspace.activeFileIndex : -1;
          if (aIdx >= 0 && aIdx < count) {
            const tabs = tabBarAPI.getTabs().filter((t: any) => t.type === 'file');
            const at = tabs[aIdx];
            if (at) {
              this.showWelcome = false;
              this.setActiveTab({ id: at.id, type: 'file' });
              tabBarAPI.setActiveTab(at.id);
              monacoAPI.loadFile(at.filePath, at.content);
            }
          }
        }).catch(() => {});
      }

      // Restore images
      if (workspace.openImages?.length) {
        const tabBarAPI = (window as any).__tabBarAPI;
        for (let i = 0; i < workspace.openImages.length; i++) {
          const img = workspace.openImages[i];
          tabBarAPI.addTab({ id: `tab-${Date.now()}-image-${i}`, type: 'image', filePath: img.filePath, fileName: img.fileName, isDirty: false, content: '', language: '' });
        }
      }

      // Restore terminals
      if (workspace.openTerminals?.length) {
        const tabBarAPI = (window as any).__tabBarAPI;
        for (const ti of workspace.openTerminals) {
          const tid = `terminal-${Date.now()}-${Math.random()}`;
          tabBarAPI.addTab({ id: tid, type: 'terminal', filePath: tid, fileName: ti.name || 'bash', isDirty: false, content: '', language: 'terminal' });
          const cwd = ti.cwd || workspace.workspaceRoot || '';
          this.terminalTabs = [...this.terminalTabs, { id: tid, fileName: ti.name || 'bash', workspaceRoot: cwd || this.workspaceRoot }];
          this.terminalFileTreeRoots = { ...this.terminalFileTreeRoots, [tid]: { cwd, overriddenRoot: undefined } };
          this.syncTerminalInstances();
        }
      }

      // Restore novi prompts
      if (workspace.openNoviPrompts?.length) {
        const tabBarAPI = (window as any).__tabBarAPI;
        for (const pi of workspace.openNoviPrompts) {
          const pid = `novi-prompt-${Date.now()}-${Math.random()}`;
          tabBarAPI.addTab({ id: pid, type: 'novi-prompt', filePath: pid, fileName: pi.name || '\u2699 novi>', isDirty: false, content: '', language: 'plaintext' });
          this.noviPromptTabs = [...this.noviPromptTabs, { id: pid, fileName: pi.name || '\u2699 novi>' }];
          this.syncNoviShellInstances();
        }
      }

      // Restore active tab for non-file types
      if (workspace.activeTabId && workspace.activeTabType !== 'file') {
        this.setActiveTab({ id: workspace.activeTabId, type: workspace.activeTabType || 'file' });
      }

      // Focus after restoration
      setTimeout(() => this.focusActiveTab(), 300);

    } catch (error) {
      console.error('[App] Failed to load workspace:', error);
      this.createHomeTerminal();
    }
  }

  private createHomeTerminal(savedCwd?: string): void {
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const existing = tabBarAPI.getTabs();
    if (existing.some((t: any) => t.id === HOME_TERMINAL_ID)) return;

    tabBarAPI.addTab({ id: HOME_TERMINAL_ID, type: 'terminal', filePath: HOME_TERMINAL_ID, fileName: '\u{1F5A5}\uFE0F ~', isDirty: false, content: '', language: 'terminal' });
    if (!this.terminalTabs.some(t => t.id === HOME_TERMINAL_ID)) {
      this.terminalTabs = [{ id: HOME_TERMINAL_ID, fileName: '\u{1F5A5}\uFE0F ~', workspaceRoot: savedCwd || null }, ...this.terminalTabs];
    }
    this.terminalFileTreeRoots = { ...this.terminalFileTreeRoots, [HOME_TERMINAL_ID]: { cwd: savedCwd || '', overriddenRoot: undefined } };
    this.showWelcome = false;
    this.setActiveTab({ id: HOME_TERMINAL_ID, type: 'terminal' });
    this.syncTerminalInstances();
    console.log('[App] Home terminal tab created', savedCwd ? `with CWD: ${savedCwd}` : '(default home)');
  }

  private saveWorkspaceDebounced = this.debounce(() => this.saveWorkspace(), 1000);

  private async saveWorkspace(): Promise<void> {
    if (!window.api?.workspaceSave) return;
    const keeptabs = await window.api.getSetting<boolean>('keeptabs', true);
    if (!keeptabs) return;

    try {
      const tabBarAPI = (window as any).__tabBarAPI;
      const tabs = tabBarAPI?.getTabs() || [];
      const fileTabs = tabs.filter((t: any) => t.type === 'file');
      const openFiles = fileTabs.map((t: any) => ({ filePath: t.filePath, content: t.content, isDirty: t.isDirty }));
      const activeFileIndex = this.activeTab?.type === 'file' ? fileTabs.findIndex((t: any) => t.id === this.activeTab!.id) : -1;
      const openImages = tabs.filter((t: any) => t.type === 'image').map((t: any) => ({ filePath: t.filePath, fileName: t.fileName }));
      const openTerminals = this.terminalTabs.filter(t => t.id !== HOME_TERMINAL_ID).map(t => ({ id: t.id, name: t.fileName, cwd: this.terminalFileTreeRoots[t.id]?.cwd || '' }));
      const homeTerminalCwd = this.terminalFileTreeRoots[HOME_TERMINAL_ID]?.cwd || '';
      const openNoviPrompts = this.noviPromptTabs.map(t => ({ id: t.id, name: t.fileName }));

      await window.api.workspaceSave({
        workspaceRoot: this.workspaceRoot,
        openFiles, openImages, openTerminals, openNoviPrompts, homeTerminalCwd,
        activeTabId: this.activeTab?.id || null,
        activeTabType: this.activeTab?.type || null,
        activeFileIndex,
        layout: { showGitPanel: this.showGitPanel },
        lastSaved: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[App] Failed to save workspace:', error);
    }
  }

  // ============================================================
  // State change helpers
  // ============================================================

  private setActiveTab(tab: ActiveTab | null): void {
    this.activeTab = tab;
    this.titleBar?.updateConfig({ activeTabType: tab?.type ?? null });
    this.updateContentVisibility();
    this.updateSidebarVisibility();
    this.updateFileTreeDisplayRoot();
    this.syncTerminalActiveState();
    this.syncNoviShellActiveState();
    this.manageImageEditor();
    this.saveWorkspaceDebounced();
  }

  private get currentFileTreeDisplayRoot(): string | null {
    if (this.singleFileTree) return this.workspaceRoot;
    if (this.activeTab?.type === 'terminal') {
      const t = this.terminalFileTreeRoots[this.activeTab.id];
      return t?.overriddenRoot ?? t?.cwd ?? null;
    }
    if (this.activeTab?.type === 'file' || this.activeTab?.type === 'image') {
      return this.fileTabToTreeRoot[this.activeTab.id] || this.workspaceRoot;
    }
    if (this.activeTab?.type === 'novi-prompt' || this.activeTab?.type === 'settings') {
      return this.lastFileTreeRoot || this.workspaceRoot;
    }
    return this.workspaceRoot;
  }

  private updateFileTreeDisplayRoot(): void {
    const root = this.currentFileTreeDisplayRoot;
    if (this.activeTab?.type !== 'novi-prompt' && this.activeTab?.type !== 'settings' && root) {
      this.lastFileTreeRoot = root;
    }
    // Don't update the file tree while it's in loading state —
    // wait for the terminal to report its CWD first.
    if (this.fileTree && !this.fileTree.isLoading) this.fileTree.displayRoot = root;
    if (this.gitPanel && this.gitEnabled) this.gitPanel.workspaceRoot = root || this.workspaceRoot;
  }

  private updateContentVisibility(): void {
    const at = this.activeTab;
    const showW = this.showWelcome;

    // Welcome
    this.welcomeEl.style.display = showW ? 'flex' : 'none';
    if (showW) {
      clearChildren(this.welcomeEl);
      if (!this.monacoReady) {
        this.welcomeEl.appendChild(el('h1', {}, 'Novi'));
        this.welcomeEl.appendChild(el('p', {}, 'Loading editor...'));
      } else {
        this.welcomeEl.appendChild(el('h1', {}, 'Novi'));
        this.welcomeEl.appendChild(el('p', {}, 'Open a file to start editing'));
        this.welcomeEl.appendChild(el('p', { style: 'font-size: 0.85em; opacity: 0.5; margin-top: 20px;' }, 'Right-click for options'));
      }
    }

    // Monaco
    this.monacoContainerEl.style.display = at?.type === 'file' && !showW ? 'flex' : 'none';
    // Image editor
    this.imageEditorContainerEl.style.display = at?.type === 'image' && !showW ? 'flex' : 'none';
    // Settings
    this.settingsContainerEl.style.display = at?.type === 'settings' && !showW ? 'flex' : 'none';
  }

  private updateSidebarVisibility(): void {
    const isNovi = this.activeTab?.type === 'novi-prompt';
    const isSettings = this.activeTab?.type === 'settings';
    this.noviPromptPlaceholderEl.style.display = isNovi && !this.showGitPanel ? 'flex' : 'none';
    this.settingsSidebarContainerEl.style.display = isSettings ? 'flex' : 'none';
    this.fileTreeContainerEl.style.display = (this.showGitPanel || isNovi || isSettings) ? 'none' : 'flex';
    this.gitPanelContainerEl.style.display = this.showGitPanel && !isSettings ? 'flex' : 'none';
  }

  // ============================================================
  // Terminal / NoviShell instance management
  // ============================================================

  private syncTerminalInstances(): void {
    const container = this.terminalContainerEl;
    const currentIds = new Set(this.terminalTabs.map(t => t.id));

    for (const tab of this.terminalTabs) {
      if (!this.terminalInstances.has(tab.id)) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'flex:1;display:none;flex-direction:column;overflow:hidden;background-color:#1e1e1e';
        container.appendChild(wrapper);
        const terminal = new Terminal({
          terminalId: tab.id,
          workspaceRoot: tab.workspaceRoot || undefined,
          onData: (data: string) => { if (window.api?.terminalWrite) window.api.terminalWrite(tab.id, data); },
          onResize: (cols: number, rows: number) => { if (window.api?.terminalResize) window.api.terminalResize(tab.id, cols, rows); },
          onNewTerminal: () => this.actionContext.onNewTerminal?.(),
          fontSize: this.terminalFontSize,
        });
        terminal.mount(wrapper);
        this.terminalInstances.set(tab.id, { instance: terminal, container: wrapper });
      }
    }

    for (const [id, entry] of this.terminalInstances) {
      if (!currentIds.has(id)) {
        entry.instance.destroy();
        entry.container.remove();
        this.terminalInstances.delete(id);
      }
    }

    this.syncTerminalActiveState();
  }

  private syncTerminalActiveState(): void {
    for (const [id, entry] of this.terminalInstances) {
      const isAct = this.activeTab?.id === id;
      entry.container.style.display = isAct ? 'flex' : 'none';
      entry.instance.isActive = isAct;
      entry.instance.fontSizeProp = this.terminalFontSize;
    }
  }

  private syncNoviShellInstances(): void {
    const container = this.noviShellContainerEl;
    const currentIds = new Set(this.noviPromptTabs.map(t => t.id));

    for (const tab of this.noviPromptTabs) {
      if (!this.noviShellInstances.has(tab.id)) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'flex:1;display:none;flex-direction:column;overflow:hidden;background-color:#1e1e1e';
        container.appendChild(wrapper);
        const shell = new NoviShell({
          promptId: tab.id,
          onClose: () => {
            const tabBarAPI = (window as any).__tabBarAPI;
            if (tabBarAPI) tabBarAPI.closeTab(tab.id);
          },
        });
        shell.mount(wrapper);
        this.noviShellInstances.set(tab.id, { instance: shell, container: wrapper });
      }
    }

    for (const [id, entry] of this.noviShellInstances) {
      if (!currentIds.has(id)) {
        entry.instance.destroy();
        entry.container.remove();
        this.noviShellInstances.delete(id);
      }
    }

    this.syncNoviShellActiveState();
  }

  private syncNoviShellActiveState(): void {
    for (const [id, entry] of this.noviShellInstances) {
      const isAct = this.activeTab?.id === id;
      entry.container.style.display = isAct ? 'flex' : 'none';
      entry.instance.isActive = isAct;
    }
  }

  private manageImageEditor(): void {
    const container = this.imageEditorContainerEl;
    let imagePath: string | null = null;
    if (this.activeTab?.type === 'image') {
      if (this.activeTab.filePath) {
        imagePath = this.activeTab.filePath;
      } else {
        const tabBarAPI = (window as any).__tabBarAPI;
        const tabs = tabBarAPI?.getTabs() || [];
        const current = tabs.find((t: any) => t.id === this.activeTab!.id);
        imagePath = current?.filePath || null;
      }
    }

    if (!imagePath) {
      if (this.imageEditorInstance) {
        this.imageEditorInstance.instance.destroy();
        this.imageEditorInstance = null;
        clearChildren(container);
      }
      return;
    }

    if (this.imageEditorInstance?.filePath === imagePath) return;

    if (this.imageEditorInstance) {
      this.imageEditorInstance.instance.destroy();
      clearChildren(container);
    }
    const ie = new ImageEditor(imagePath);
    ie.mount(container);
    this.imageEditorInstance = { instance: ie, filePath: imagePath };
  }

  // ============================================================
  // Tab callbacks
  // ============================================================

  private onTabSwitch(tab: Tab): void {
    this.previousActiveTabId = this.activeTab?.id ?? null;
    console.log('[App] Tab switched to:', tab.fileName, 'type:', tab.type);
    this.setActiveTab({
      id: tab.id,
      type: tab.type,
      filePath: (tab.type === 'file' || tab.type === 'image' || tab.type === 'novi-prompt') ? tab.filePath : undefined,
    });
    this.showWelcome = false;
    this.updateContentVisibility();

    // Show/hide reload banners based on active tab
    const activeNorm = tab.filePath?.replace(/\\/g, '/') || '';
    for (const [path, bannerEl] of this.pendingReloadBanners) {
      bannerEl.style.display = (tab.type === 'file' && path === activeNorm) ? 'flex' : 'none';
    }

    if (tab.type === 'file') {
      if (tab.filePath) window.api?.editorWatchFile?.(tab.filePath);
      const monacoAPI = (window as any).__monacoEditorAPI;
      if (monacoAPI && !monacoAPI.switchToFile(tab.filePath)) {
        monacoAPI.loadFile(tab.filePath, tab.content);
      }
      (window as any).__statusBarAPI?.setStatus(`Editing: ${tab.fileName}`);
    } else if (tab.type === 'image') {
      (window as any).__statusBarAPI?.setStatus(`Viewing: ${tab.fileName}`);
    } else if (tab.type === 'terminal') {
      (window as any).__statusBarAPI?.setStatus(`${this.shellLabel} Terminal: ${tab.fileName}`);
    } else if (tab.type === 'settings') {
      (window as any).__statusBarAPI?.setStatus('Settings');
    }

    requestAnimationFrame(() => requestAnimationFrame(() => this.focusActiveTab()));
  }

  private async onTabClose(tabId: string): Promise<boolean> {
    if (tabId === HOME_TERMINAL_ID) return false;
    if (this.forceCloseTabId === tabId) { this.forceCloseTabId = null; return true; }

    const tabBarAPI = (window as any).__tabBarAPI;
    if (tabBarAPI) {
      const tabs = tabBarAPI.getTabs();
      const tab = tabs.find((t: any) => t.id === tabId);
      if (tab?.type === 'terminal') {
        if (window.api?.terminalKill) await window.api.terminalKill(tab.filePath);
        this.terminalTabs = this.terminalTabs.filter(t => t.id !== tabId);
        const next = { ...this.terminalFileTreeRoots }; delete next[tabId]; this.terminalFileTreeRoots = next;
        this.syncTerminalInstances();
      }
      if (tab?.type === 'novi-prompt') {
        this.noviPromptTabs = this.noviPromptTabs.filter(t => t.id !== tabId);
        this.syncNoviShellInstances();
      }
      if (tab && (tab.type === 'file' || tab.type === 'image')) {
        if (tab.type === 'file' && tab.filePath) window.api?.editorUnwatchFile?.(tab.filePath);
        const next = { ...this.fileTabToTreeRoot }; delete next[tabId]; this.fileTabToTreeRoot = next;
      }
      if (tab?.type === 'file' && tab.isDirty) {
        return new Promise<boolean>((resolve) => {
          this.showSavePrompt(tab.fileName, tabId, resolve);
        });
      }
    }
    return true;
  }

  // ============================================================
  // Save prompt
  // ============================================================

  private showSavePrompt(fileName: string, tabId: string, resolve: (v: boolean) => void): void {
    const callbacks: SavePromptCallbacks = {
      onSave: async () => {
        const monacoAPI = (window as any).__monacoEditorAPI;
        if (monacoAPI && window.api?.saveFile) {
          const fp = monacoAPI.getFilePath();
          if (fp) {
            await window.api.saveFile(fp, monacoAPI.getValue());
            monacoAPI.markAsSaved();
            (window as any).__tabBarAPI?.updateTabDirty(tabId, false);
          }
        }
        resolve(true);
        this.savePromptInst.hide();
      },
      onDiscard: () => { resolve(true); this.savePromptInst.hide(); },
      onCancel: () => { resolve(false); this.savePromptInst.hide(); },
    };
    this.savePromptInst.show(fileName, callbacks);
  }

  // ============================================================
  // FileTree callbacks
  // ============================================================

  private async onFileTreeFileOpen(filePath: string): Promise<void> {
    if (!window.api?.readFile) return;
    try {
      this.showWelcome = false;
      this.updateContentVisibility();
      if (isImageFile(filePath)) {
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
          const tabId = `tab-${Date.now()}`;
          tabBarAPI.addTab({ id: tabId, type: 'image', filePath, fileName, isDirty: false, content: '' });
          const root = this.currentFileTreeDisplayRoot;
          if (root) this.fileTabToTreeRoot = { ...this.fileTabToTreeRoot, [tabId]: root };
          this.setActiveTab({ id: tabId, type: 'image' });
        }
        return;
      }
      const fileData = await window.api.readFile(filePath);
      (window as any).__monacoEditorAPI?.loadFile(filePath, fileData.content);
      const tabBarAPI = (window as any).__tabBarAPI;
      if (tabBarAPI) {
        const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
        const tabId = `tab-${Date.now()}`;
        tabBarAPI.addTab({ id: tabId, type: 'file', filePath, fileName, isDirty: false, content: fileData.content, language: 'typescript' });
        const root = this.currentFileTreeDisplayRoot;
        if (root) this.fileTabToTreeRoot = { ...this.fileTabToTreeRoot, [tabId]: root };
      }
    } catch (error) {
      console.error('[App] Failed to open file from tree:', error);
    }
  }

  private async onFileTreeDirectoryOpen(dirPath: string): Promise<void> {
    if (this.singleFileTree) {
      this.workspaceRoot = dirPath;
    } else if (this.activeTab?.type === 'terminal') {
      this.terminalFileTreeRoots = {
        ...this.terminalFileTreeRoots,
        [this.activeTab.id]: { ...this.terminalFileTreeRoots[this.activeTab.id], cwd: this.terminalFileTreeRoots[this.activeTab.id]?.cwd ?? '', overriddenRoot: dirPath },
      };
    } else if (this.activeTab?.type === 'file' || this.activeTab?.type === 'image') {
      this.fileTabToTreeRoot = { ...this.fileTabToTreeRoot, [this.activeTab.id]: dirPath };
    } else {
      this.workspaceRoot = dirPath;
    }
    this.updateFileTreeDisplayRoot();

    if (this.singleFileTree || !this.activeTab || this.activeTab.type === 'novi-prompt') {
      if (window.api?.gitGetStatus) {
        try {
          const status = await window.api.gitGetStatus(dirPath);
          if (status.isRepo) appState.gitStatus = status;
          else appState.gitStatus = null;
        } catch { appState.gitStatus = null; }
      }
    }
  }

  // ============================================================
  // Action context
  // ============================================================

  private buildActionContext(): void {
    this.actionContext = {
      onOpenFile: async () => {
        if (!window.api?.openFile || !window.api?.readFile) return;
        try {
          const filePath = await window.api.openFile();
          if (!filePath) return;
          this.showWelcome = false;
          this.updateContentVisibility();
          if (isImageFile(filePath)) {
            getMimeType(filePath);
            const tabBarAPI = (window as any).__tabBarAPI;
            if (tabBarAPI) {
              const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
              const tabId = `tab-${Date.now()}`;
              tabBarAPI.addTab({ id: tabId, type: 'image', filePath, fileName, isDirty: false, content: '' });
              this.setActiveTab({ id: tabId, type: 'image', filePath });
            }
            (window as any).__statusBarAPI?.setStatus(`Viewing: ${filePath.split(/[\\/]/).pop()}`);
            return;
          }
          const fileData = await window.api.readFile(filePath);
          (window as any).__monacoEditorAPI?.loadFile(filePath, fileData.content);
          const tabBarAPI = (window as any).__tabBarAPI;
          if (tabBarAPI) {
            const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
            tabBarAPI.addTab({ id: `tab-${Date.now()}`, type: 'file', filePath, fileName, isDirty: false, content: fileData.content, language: 'typescript' });
          }
          (window as any).__statusBarAPI?.setStatus(`Editing: ${filePath.split(/[\\/]/).pop()}`);
        } catch (error) {
          console.error('[App] Failed to open file:', error);
        }
      },
      onSaveFile: async () => {
        if (!window.api?.saveFile) return;
        try {
          const monacoAPI = (window as any).__monacoEditorAPI;
          if (!monacoAPI) return;
          const filePath = monacoAPI.getFilePath();
          if (!filePath) { await this.actionContext.onSaveFileAs?.(); return; }
          const content = monacoAPI.getValue();
          await window.api.saveFile(filePath, content);
          monacoAPI.markAsSaved();
          const tabBarAPI = (window as any).__tabBarAPI;
          const tab = tabBarAPI?.getActiveTab();
          if (tab?.type === 'file' && tab.filePath === filePath) tabBarAPI.updateTabDirty(tab.id, false);
          (window as any).__statusBarAPI?.setStatus(`Saved: ${filePath.split(/[\\/]/).pop()}`);
          setTimeout(() => (window as any).__statusBarAPI?.setStatus('Ready'), 2000);
        } catch (error) {
          console.error('[App] Failed to save file:', error);
          (window as any).__statusBarAPI?.setStatus('Save failed');
        }
      },
      onSaveFileAs: async () => {
        if (!window.api?.saveFileAs) return;
        try {
          const monacoAPI = (window as any).__monacoEditorAPI;
          if (!monacoAPI) return;
          const content = monacoAPI.getValue();
          const result = await window.api.saveFileAs(content);
          if (!result) return;
          monacoAPI.loadFile(result.path, content);
          monacoAPI.markAsSaved();
          const tabBarAPI = (window as any).__tabBarAPI;
          if (tabBarAPI) {
            const fileName = result.path.split(/[\\/]/).pop() || 'untitled';
            const currentTab = tabBarAPI.getActiveTab();
            const isUntitled = currentTab && currentTab.filePath === '';
            if (isUntitled) {
              tabBarAPI.removeTab(currentTab.id);
              tabBarAPI.addTab({ id: currentTab.id, type: 'file', filePath: result.path, fileName, isDirty: false, content, language: 'plaintext' });
              tabBarAPI.updateTabDirty(currentTab.id, false);
            } else {
              const newTabId = `tab-${Date.now()}`;
              tabBarAPI.addTab({ id: newTabId, type: 'file', filePath: result.path, fileName, isDirty: false, content, language: 'plaintext' });
              tabBarAPI.updateTabDirty(newTabId, false);
            }
          }
          (window as any).__fileTreeAPI?.refresh?.();
          (window as any).__statusBarAPI?.setStatus(`Saved as: ${result.path.split(/[\\/]/).pop()}`);
        } catch (error) {
          console.error('[App] Failed to save file as:', error);
          (window as any).__statusBarAPI?.setStatus('Save failed');
        }
      },
      onCloseFile: async () => {
        const tabBarAPI = (window as any).__tabBarAPI;
        const tab = tabBarAPI?.getActiveTab();
        if (tab?.type === 'file') await tabBarAPI.removeTab(tab.id);
      },
      onNoviPrompt: async () => {
        const tabBarAPI = (window as any).__tabBarAPI;
        if (!tabBarAPI) return;
        const existing = tabBarAPI.getTabs?.().find((t: any) => t.type === 'novi-prompt');
        if (existing) {
          tabBarAPI.switchTab(existing.id);
          this.setActiveTab({ id: existing.id, type: 'novi-prompt' });
          this.showWelcome = false;
          this.updateContentVisibility();
          return;
        }
        const promptId = `novi-prompt-${Date.now()}`;
        this.showWelcome = false;
        tabBarAPI.addTab({ id: promptId, type: 'novi-prompt', filePath: promptId, fileName: '\u2699 novi>', isDirty: false, content: '', language: 'plaintext' });
        this.noviPromptTabs = [...this.noviPromptTabs, { id: promptId, fileName: '\u2699 novi>' }];
        this.setActiveTab({ id: promptId, type: 'novi-prompt' });
        this.syncNoviShellInstances();
        this.updateContentVisibility();
        (window as any).__statusBarAPI?.setStatus('Novi Shell ready');
      },
      onNewTerminal: async () => {
        if (!window.api?.terminalCreate) return;
        const terminalId = `terminal-${Date.now()}`;
        this.showWelcome = false;
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          tabBarAPI.addTab({ id: terminalId, type: 'terminal', filePath: terminalId, fileName: '\u{1F4BB} bash', isDirty: false, content: '', language: 'terminal' });
          const currentTab = tabBarAPI.getActiveTab?.();
          const activeCwd = currentTab?.type === 'terminal' && currentTab.id
            ? (this.terminalFileTreeRoots[currentTab.id]?.overriddenRoot ?? this.terminalFileTreeRoots[currentTab.id]?.cwd)
            : null;
          const startCwd = activeCwd || this.workspaceRoot;
          this.terminalTabs = [...this.terminalTabs, { id: terminalId, fileName: '\u{1F4BB} bash', workspaceRoot: startCwd }];
          this.terminalFileTreeRoots = { ...this.terminalFileTreeRoots, [terminalId]: { cwd: startCwd || '', overriddenRoot: undefined } };
          this.setActiveTab({ id: terminalId, type: 'terminal' });
          this.syncTerminalInstances();
          this.updateContentVisibility();
        }
        (window as any).__statusBarAPI?.setStatus(`${this.shellLabel} Terminal`);
      },
      onOpenSettings: async () => {
        const tabBarAPI = (window as any).__tabBarAPI;
        if (!tabBarAPI) return;
        const existing = tabBarAPI.getTabs?.().find((t: any) => t.type === 'settings');
        if (existing) {
          tabBarAPI.switchTab(existing.id);
          this.setActiveTab({ id: existing.id, type: 'settings' });
          this.showWelcome = false;
          this.updateContentVisibility();
          return;
        }
        const settingsId = `settings-${Date.now()}`;
        this.showWelcome = false;
        tabBarAPI.addTab({ id: settingsId, type: 'settings', filePath: '', fileName: '\u2699\uFE0F Settings', isDirty: false, content: '', language: 'plaintext' });
        this.setActiveTab({ id: settingsId, type: 'settings' });
        this.updateContentVisibility();
        (window as any).__statusBarAPI?.setStatus('Settings');
      },
      onFormatDocument: async () => { await (window as any).__monacoEditorAPI?.formatDocument(); },
      onGoToDefinition: async () => { await (window as any).__monacoEditorAPI?.goToDefinition(); },
      onFindReferences: async () => { await (window as any).__monacoEditorAPI?.findReferences(); },
      onRenameSymbol: async () => { await (window as any).__monacoEditorAPI?.renameSymbol(); },
      onRunLinting: () => { (window as any).__monacoEditorAPI?.runLinting(); },
      onGitRefresh: async () => {
        if (!this.workspaceRoot || !window.api?.gitManualRefresh) return;
        try {
          const status = await window.api.gitManualRefresh(this.workspaceRoot);
          appState.gitStatus = status;
          (window as any).__statusBarAPI?.setStatus('Git status refreshed');
          setTimeout(() => (window as any).__statusBarAPI?.setStatus('Ready'), 2000);
        } catch (error) {
          console.error('[App] Failed to refresh git status:', error);
          (window as any).__statusBarAPI?.setStatus('Git refresh failed');
        }
      },
    };
  }

  // ============================================================
  // Menu commands
  // ============================================================

  private async handleMenuCommand(command: string): Promise<void> {
    console.log('[App] Handling menu command:', command);
    switch (command) {
      case 'new-file': {
        const fileName = `Untitled-${this.untitledCounter}`;
        const tabId = `untitled-${this.untitledCounter}-${Date.now()}`;
        this.showWelcome = false;
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          tabBarAPI.addTab({ id: tabId, type: 'file', filePath: '', fileName, isDirty: true, content: '', language: 'plaintext' });
          this.setActiveTab({ id: tabId, type: 'file', filePath: '', fileName });
        }
        this.untitledCounter++;
        this.updateContentVisibility();
        break;
      }
      case 'open-file': await this.actionContext.onOpenFile?.(); break;
      case 'save':
        if (this.activeTab?.type === 'file' || this.activeTab?.type === 'image') {
          await this.actionContext.onSaveFile?.();
        }
        break;
      case 'save-as':
        if (this.activeTab?.type === 'file' || this.activeTab?.type === 'image') {
          await this.actionContext.onSaveFileAs?.();
        }
        break;
      case 'close-file': await this.actionContext.onCloseFile?.(); break;
      case 'close-terminal':
        if (this.activeTab?.type === 'terminal') {
          (window as any).__tabBarAPI?.closeTab(this.activeTab.id);
        }
        break;
      case 'exit': window.api?.quit(); break;
      case 'undo': case 'redo': case 'cut': case 'copy': case 'paste': case 'select-all': break;
      case 'toggle-word-wrap': case 'toggle-line-numbers': break;
      case 'increase-font-size': case 'decrease-font-size': case 'reset-font-size':
        if (this.activeTab?.type === 'novi-prompt') break;
        this.handleFontSizeCommand(command);
        break;
      case 'new-terminal': await this.actionContext.onNewTerminal?.(); break;
      case 'novi-prompt': await this.actionContext.onNoviPrompt?.(); break;
      case 'settings': await this.actionContext.onOpenSettings?.(); break;
      case 'command-palette':
        if (this.activeTab?.type === 'file') {
          (window as any).__monacoEditorAPI?.openCommandPalette();
        }
        break;
      case 'reset-workspace': await this.resetWorkspace(); break;
      case 'find': case 'replace': break;
      case 'toggle-fullscreen': window.api?.toggleFullScreen?.(); break;
      case 'zoom-in': window.api?.zoomIn?.(); break;
      case 'zoom-out': window.api?.zoomOut?.(); break;
      case 'zoom-reset': window.api?.zoomReset?.(); break;
      case 'toggle-devtools': window.api?.toggleDevTools?.(); break;
      case 'about': this.showAboutDialog(); break;
      case 'documentation': window.open('https://lyric-lang.org/novi.html', '_blank'); break;
      case 'check-updates': this.showCheckUpdatesDialog(); break;
      default: console.warn('[App] Unknown menu command:', command);
    }
  }

  private handleFontSizeCommand(command: string): void {
    const tabBarAPI = (window as any).__tabBarAPI;
    const current = tabBarAPI?.getActiveTab();
    if (current?.type === 'file') {
      const step = 2, min = 10, max = 24;
      let next = this.editorFontSize;
      if (command === 'increase-font-size') next = Math.min(max, this.editorFontSize + step);
      else if (command === 'decrease-font-size') next = Math.max(min, this.editorFontSize - step);
      else next = 14;
      if (next !== this.editorFontSize) {
        this.editorFontSize = next;
        this.monacoEditor.fontSize = next;
        window.api?.setSetting?.('fontSize', next);
      }
    } else if (current?.type === 'terminal') {
      const step = 2, min = 10, max = 24;
      let next = this.terminalFontSize;
      if (command === 'increase-font-size') next = Math.min(max, this.terminalFontSize + step);
      else if (command === 'decrease-font-size') next = Math.max(min, this.terminalFontSize - step);
      else next = 14;
      if (next !== this.terminalFontSize) {
        this.terminalFontSize = next;
        this.syncTerminalActiveState();
        window.api?.setSetting?.('terminalFontSize', next);
      }
    }
  }

  private async resetWorkspace(): Promise<void> {
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const allTabs = tabBarAPI.getTabs();
    const dirtyTabs = allTabs.filter((t: any) => t.type === 'file' && t.isDirty);
    for (const tab of dirtyTabs) {
      const shouldSave = await new Promise<boolean>((resolve) => this.showSavePrompt(tab.fileName, tab.id, resolve));
      if (shouldSave) {
        const monacoAPI = (window as any).__monacoEditorAPI;
        if (monacoAPI && tab.filePath) {
          await window.api?.writeFile(tab.filePath, monacoAPI.getValue());
        }
      }
    }
    for (const tab of allTabs) {
      if (tab.type === 'terminal' && tab.id !== HOME_TERMINAL_ID) {
        try { await window.api?.terminalKill?.(tab.id); } catch { /* */ }
      }
    }
    for (const tab of allTabs) {
      if (tab.id !== HOME_TERMINAL_ID) tabBarAPI.removeTab(tab.id);
    }
    this.terminalTabs = this.terminalTabs.filter(t => t.id === HOME_TERMINAL_ID);
    this.noviPromptTabs = [];
    this.showGitPanel = false;
    this.setActiveTab({ id: HOME_TERMINAL_ID, type: 'terminal' });
    this.syncTerminalInstances();
    this.syncNoviShellInstances();
    this.updateSidebarVisibility();
    this.updateContentVisibility();
  }

  // ============================================================
  // Dialogs
  // ============================================================

  private showAboutDialog(): void {
    if (this.aboutOverlay) return;
    const overlay = el('div', {
      style: 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001;',
    });
    const dialog = el('div', {
      style: 'background-color: #252526; border: 1px solid #3e3e42; border-radius: 8px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); min-width: 400px; text-align: center;',
    });
    dialog.appendChild(el('h2', { style: 'margin: 0 0 16px 0; color: #cccccc; font-size: 24px;' }, 'Novi Terminal Environment'));
    dialog.appendChild(el('p', { style: 'margin: 8px 0; color: #cccccc; font-size: 14px;' }, `Version ${this.appVersion}`));
    dialog.appendChild(el('p', { style: 'margin: 16px 0 24px 0; color: #999; font-size: 12px;' }, '\u00A9 2026 MiraNova Studios'));
    const btn = el('button', {
      style: "background-color: #007acc; border: none; border-radius: 4px; padding: 8px 24px; color: #ffffff; cursor: pointer; font-size: 14px; font-family: 'Segoe UI', sans-serif;",
    }, 'OK');
    btn.addEventListener('click', () => this.hideAboutDialog());
    btn.addEventListener('mouseenter', () => btn.style.backgroundColor = '#005a9e');
    btn.addEventListener('mouseleave', () => btn.style.backgroundColor = '#007acc');
    dialog.appendChild(btn);
    dialog.addEventListener('click', (e) => e.stopPropagation());
    overlay.appendChild(dialog);
    overlay.addEventListener('click', () => this.hideAboutDialog());
    document.body.appendChild(overlay);
    this.aboutOverlay = overlay;
  }

  private hideAboutDialog(): void {
    if (this.aboutOverlay) { this.aboutOverlay.remove(); this.aboutOverlay = null; }
  }

  private showCheckUpdatesDialog(): void {
    if (this.checkUpdatesOverlay) return;
    const overlay = el('div', {
      style: 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10001;',
    });
    const dialog = el('div', {
      style: 'background-color: #252526; border: 1px solid #3e3e42; border-radius: 8px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); min-width: 400px; text-align: center;',
    });
    dialog.appendChild(el('h2', { style: 'margin: 0 0 16px 0; color: #cccccc; font-size: 20px;' }, 'Check for Updates'));
    dialog.appendChild(el('p', { style: 'margin: 16px 0 24px 0; color: #cccccc; font-size: 14px;' }, 'This feature is not yet implemented.'));
    const btn = el('button', {
      style: "background-color: #007acc; border: none; border-radius: 4px; padding: 8px 24px; color: #ffffff; cursor: pointer; font-size: 14px; font-family: 'Segoe UI', sans-serif;",
    }, 'OK');
    btn.addEventListener('click', () => this.hideCheckUpdatesDialog());
    btn.addEventListener('mouseenter', () => btn.style.backgroundColor = '#005a9e');
    btn.addEventListener('mouseleave', () => btn.style.backgroundColor = '#007acc');
    dialog.appendChild(btn);
    dialog.addEventListener('click', (e) => e.stopPropagation());
    overlay.appendChild(dialog);
    overlay.addEventListener('click', () => this.hideCheckUpdatesDialog());
    document.body.appendChild(overlay);
    this.checkUpdatesOverlay = overlay;
  }

  private hideCheckUpdatesDialog(): void {
    if (this.checkUpdatesOverlay) { this.checkUpdatesOverlay.remove(); this.checkUpdatesOverlay = null; }
  }

  private showWelcomeContextMenu(e: MouseEvent): void {
    e.preventDefault();
    this.hideWelcomeContextMenu();
    const itemStyle = "padding: 8px 16px; cursor: pointer; color: #cccccc; font-size: 13px; font-family: 'Segoe UI', sans-serif;";
    const menu = el('div', {
      style: `position: fixed; left: ${e.clientX}px; top: ${e.clientY}px; background-color: #252526; border: 1px solid #3e3e42; border-radius: 4px; padding: 4px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10000; min-width: 180px;`,
    });

    const addItem = (label: string, handler: () => void) => {
      const item = el('div', { style: itemStyle }, label);
      item.addEventListener('click', () => { handler(); this.hideWelcomeContextMenu(); });
      item.addEventListener('mouseenter', () => item.style.backgroundColor = '#2a2d2e');
      item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
      menu.appendChild(item);
    };

    addItem('\u{1F4C1} Open File', () => this.actionContext.onOpenFile?.());
    addItem('\u{1F4BB} New Terminal', () => this.actionContext.onNewTerminal?.());
    addItem('\u25B6\uFE0F Novi Shell', () => this.actionContext.onNoviPrompt?.());
    addItem('\u2699\uFE0F Settings', () => this.actionContext.onOpenSettings?.());
    menu.appendChild(el('div', { style: 'height: 1px; background-color: #3e3e42; margin: 4px 0;' }));
    addItem('\u{1F6AA} Quit', () => window.api?.quit?.());

    document.body.appendChild(menu);
    this.welcomeContextMenuEl = menu;

    const close = () => { this.hideWelcomeContextMenu(); document.removeEventListener('click', close); };
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  private hideWelcomeContextMenu(): void {
    if (this.welcomeContextMenuEl) { this.welcomeContextMenuEl.remove(); this.welcomeContextMenuEl = null; }
  }

  // ============================================================
  // Utility
  // ============================================================

  private focusActiveTab(): void {
    if (!this.activeTab) return;
    if (this.activeTab.type === 'file') {
      (window as any).__monacoEditorAPI?.focus?.();
    } else if (this.activeTab.type === 'terminal') {
      (window as any).__terminalAPI?.[this.activeTab.id]?.focus?.();
    } else if (this.activeTab.type === 'novi-prompt') {
      (window as any).__noviShellAPI?.[this.activeTab.id]?.focus?.();
    }
  }

  private cycleTab(backward: boolean): void {
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const tabs = tabBarAPI.getTabs();
    if (tabs.length <= 1) return;
    const currentIndex = tabs.findIndex((t: any) => t.id === this.activeTab?.id);
    const nextIndex = backward
      ? (currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1)
      : (currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1);
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      this.setActiveTab({ id: nextTab.id, type: nextTab.type, filePath: (nextTab.type === 'image' || nextTab.type === 'novi-prompt') ? nextTab.filePath : undefined });
      tabBarAPI.setActiveTab(nextTab.id);
    }
  }

  private reloadFileFromDisk(): void {
    const monacoAPI = (window as any).__monacoEditorAPI;
    if (!monacoAPI || !window.api?.readFile) return;
    const filePath = monacoAPI.getFilePath();
    if (!filePath) return;
    window.api.readFile(filePath).then((fileData) => {
      monacoAPI.loadFile(filePath, fileData.content);
      monacoAPI.markAsSaved();
      const tabBarAPI = (window as any).__tabBarAPI;
      const tabs = tabBarAPI?.getTabs();
      const match = tabs?.find((t: any) => t.filePath === filePath);
      if (match) {
        tabBarAPI.updateTabContent(match.id, fileData.content);
        tabBarAPI.updateTabDirty(match.id, false);
      }
      (window as any).__statusBarAPI?.setStatus('File reloaded');
      setTimeout(() => (window as any).__statusBarAPI?.setStatus(`Editing: ${filePath.split(/[\\/]/).pop()}`), 2000);
    }).catch(() => {
      (window as any).__statusBarAPI?.setStatus('Reload failed');
    });
  }

  private handleExternalFileChange(changedPath: string): void {
    const normalized = changedPath.replace(/\\/g, '/');
    if (this.pendingReloadBanners.has(normalized)) return;

    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const tabs = tabBarAPI.getTabs();
    const match = tabs?.find((t: any) =>
      t.type === 'file' && t.filePath && t.filePath.replace(/\\/g, '/') === normalized
    );
    if (!match) return;

    const fileName = normalized.split('/').pop() || 'file';
    const monacoAPI = (window as any).__monacoEditorAPI;
    const isDirty = monacoAPI?.getFilePath?.()?.replace(/\\/g, '/') === normalized && monacoAPI.isDirty();

    const banner = document.createElement('div');
    Object.assign(banner.style, {
      display: 'none', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 12px', backgroundColor: '#063b49', color: '#cccccc',
      fontSize: '13px', fontFamily: "'Segoe UI', sans-serif",
      borderBottom: '1px solid #007acc', zIndex: '100',
    });
    banner.textContent = isDirty
      ? `${fileName} has been changed on disk. You have unsaved changes.`
      : `${fileName} has been changed on disk.`;

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, { display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: '0' });

    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Reload';
    Object.assign(reloadBtn.style, {
      padding: '3px 10px', fontSize: '12px', cursor: 'pointer',
      backgroundColor: '#0e639c', color: '#ffffff', border: 'none', borderRadius: '2px',
    });

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Ignore';
    Object.assign(dismissBtn.style, {
      padding: '3px 10px', fontSize: '12px', cursor: 'pointer',
      backgroundColor: '#3e3e42', color: '#cccccc', border: 'none', borderRadius: '2px',
    });

    const removeBanner = () => {
      banner.remove();
      this.pendingReloadBanners.delete(normalized);
    };

    reloadBtn.addEventListener('click', () => {
      removeBanner();
      if (!window.api?.readFile) return;
      window.api.readFile(changedPath).then((fileData) => {
        const api = (window as any).__monacoEditorAPI;
        if (api?.getFilePath?.()?.replace(/\\/g, '/') === normalized) {
          api.loadFile(changedPath, fileData.content);
          api.markAsSaved();
        }
        tabBarAPI.updateTabContent(match.id, fileData.content);
        tabBarAPI.updateTabDirty(match.id, false);
        (window as any).__statusBarAPI?.setStatus('File reloaded from disk');
        setTimeout(() => (window as any).__statusBarAPI?.setStatus(`Editing: ${fileName}`), 2000);
      }).catch(() => {
        (window as any).__statusBarAPI?.setStatus('Reload failed');
      });
    });

    dismissBtn.addEventListener('click', removeBanner);

    btnContainer.appendChild(reloadBtn);
    btnContainer.appendChild(dismissBtn);
    banner.appendChild(btnContainer);
    this.pendingReloadBanners.set(normalized, banner);
    this.monacoContainerEl.prepend(banner);

    // Show immediately if this file's tab is currently active
    const activeFilePath = this.activeTab?.filePath?.replace(/\\/g, '/');
    if (this.activeTab?.type === 'file' && activeFilePath === normalized) {
      banner.style.display = 'flex';
    }
  }

  private checkMonaco(): void {
    if (typeof (window as any).monaco !== 'undefined') {
      this.monacoReady = true;
      this.updateContentVisibility();
    }
  }

  private startResize(): void {
    this.isResizing = true;
    this.dividerEl.style.backgroundColor = '#007acc';
    this.dividerEl.style.transition = 'none';

    const onMove = (e: MouseEvent) => {
      this.sidebarWidth = Math.max(150, Math.min(600, e.clientX));
      this.sidebarEl.style.width = `${this.sidebarWidth}px`;
    };
    const onUp = () => {
      this.isResizing = false;
      this.dividerEl.style.backgroundColor = 'transparent';
      this.dividerEl.style.transition = 'background-color 0.2s';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private debounce(fn: () => void, ms: number): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }
}
