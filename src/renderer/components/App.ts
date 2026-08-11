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
import { SettingsTab } from './SettingsTab.js';
import type { SettingsSection } from './SettingsTab.js';
import { SettingsSidebar } from './SettingsSidebar.js';
import { DiagnosticsPanel } from './DiagnosticsPanel.js';
import { RecoveryDialog } from './RecoveryDialog.js';
import { SavePrompt, type SavePromptCallbacks } from './SavePrompt.js';
import type { ActionContext } from './actions.js';
import { ensureReady, waitForMultipleReady } from '../utils/ready-events.js';
import { isImageFile, getMimeType } from '../../core/image/image-utils.js';
import {
  computeEffectiveAccelerator, acceleratorFromKeyboardEvent, normalizeAccelerator,
  defaultKeyboardShortcutsSettings, mergeKeyboardShortcutsSettings,
  NOVI_SHORTCUTS, EDITOR_TERMINAL_SHORTCUTS, EDITOR_SHORTCUTS,
} from '../../core/shortcuts/shortcut-registry.js';
import type { KeyboardShortcutsSettings } from '../../core/shortcuts/shortcut-registry.js';


interface ActiveTab {
  id: string;
  type: 'file' | 'image' | 'terminal' | 'settings';
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
  private untitledCounter = 1;
  private sidebarWidth = 250;
  private isResizing = false;
  private editorFontSize = 14;
  private terminalFontSize = 14;
  private editorFontFamily = 'DejaVu Sans Mono';
  private terminalFontFamily = 'DejaVu Sans Mono';
  private editorWordWrap = false;
  private editorLineNumbers = true;
  private vimModeEnabled = false;
  private preserveNoviKeybindingsInVim = false;
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
  private lastGitRoot: string | null = null;
  private welcomeContextMenu: { x: number; y: number } | null = null;
  private shellLabel = 'Git Bash';
  private keyboardShortcutsSettings: KeyboardShortcutsSettings = defaultKeyboardShortcutsSettings();
  // restartingTerminalId tracked via (window as any).__restartingTerminalId

  // ---- DOM refs ----
  private sidebarEl!: HTMLElement;
  private dividerEl!: HTMLElement;
  private editorAreaEl!: HTMLElement;
  private welcomeEl!: HTMLElement;
  private monacoContainerEl!: HTMLElement;
  private imageEditorContainerEl!: HTMLElement;
  private terminalContainerEl!: HTMLElement;
  private fileTreeContainerEl!: HTMLElement;
  private gitPanelContainerEl!: HTMLElement;
  private statusBarContainerEl!: HTMLElement;
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
    this.fileTreeContainerEl = el('div', { style: 'display: flex; flex-direction: column; height: 100%;' });
    this.gitPanelContainerEl = el('div', { style: 'display: none; flex-direction: column; height: 100%;' });
    this.settingsSidebarContainerEl = el('div', { style: 'display: none; flex-direction: column; height: 100%;' });
    this.sidebarEl = el('div', { style: `background-color: #252526; border-right: 1px solid #3e3e42; overflow: auto; width: ${this.sidebarWidth}px; flex-shrink: 0;` },
      this.fileTreeContainerEl,
      this.gitPanelContainerEl,
      this.settingsSidebarContainerEl,
    );

    // Resize divider — invisible, only shows col-resize cursor
    this.dividerEl = el('div', { style: 'width: 0; padding: 0 2px; cursor: col-resize; background-color: transparent; margin: 0 -2px; position: relative; z-index: 1;' });
    this.dividerEl.addEventListener('mousedown', (e) => { e.preventDefault(); this.startResize(); });

    // Editor area
    const tabBarContainer = el('div', { style: 'display: contents;' });

    this.welcomeEl = el('div', { style: 'flex: 1; display: none; flex-direction: column; align-items: center; justify-content: center; font-size: 1.2em; text-align: center; outline: none;' });
    this.welcomeEl.addEventListener('contextmenu', (e) => this.showWelcomeContextMenu(e));

    this.terminalContainerEl = el('div', { style: 'display: contents;' });
    this.monacoContainerEl = el('div', { style: 'flex: 1; display: none; flex-direction: column; overflow: hidden;' });
    this.imageEditorContainerEl = el('div', { style: 'flex: 1; display: none; overflow: hidden;' });
    this.settingsContainerEl = el('div', { style: 'flex: 1; display: none; flex-direction: column; overflow: hidden;' });

    const contentArea = el('div', { style: 'flex: 1; display: flex; flex-direction: column; overflow: hidden;' },
      this.welcomeEl,
      this.terminalContainerEl,
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
      getPreferredNextTabId: () => this.previousActiveTabId,
      onAllTabsClosed: () => {
        this.showWelcome = true;
        this.setActiveTab(null);
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
      this.showWelcome = true;
      this.setActiveTab(null);
    };

    // FileTree
    this.fileTree = new FileTree({
      onFileOpen: (fp) => this.onFileTreeFileOpen(fp),
      onDirectoryOpen: (dp) => this.onFileTreeDirectoryOpen(dp),
      onToggleGit: () => { if (this.gitEnabled) { this.showGitPanel = !this.showGitPanel; this.updateSidebarVisibility(); } },
      onNewTerminal: () => this.actionContext.onNewTerminal?.(),
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
        if (!this.gitEnabled || !gitRoot || !window.api?.gitGetStatus) return;
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
      fontFamily: this.editorFontFamily,
      wordWrap: this.editorWordWrap,
      lineNumbers: this.editorLineNumbers,
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
   * Destroy and recreate the first open terminal from scratch.
   * Used when switching shells — ensures a truly fresh PTY with the new shell.
   */
  async recreateHomeTerminal(): Promise<void> {
    const firstTerminal = this.terminalTabs[0];
    if (!firstTerminal) return;
    const terminalId = firstTerminal.id;
    // Suppress exit handler tab-close for the deliberate kill
    (window as any).__restartingTerminalId = terminalId;
    await window.api?.terminalKill?.(terminalId);
    this.earlyTerminalData.delete(terminalId);
    if ((window as any).__terminalAPI) {
      delete (window as any).__terminalAPI[terminalId];
    }
    const old = this.terminalInstances.get(terminalId);
    if (old) {
      old.instance.destroy();
      old.container.remove();
      this.terminalInstances.delete(terminalId);
    }
    // syncTerminalInstances creates a fresh Terminal for the existing tab entry
    this.syncTerminalInstances();
  }

  /** Discard buffered terminal data (e.g. stale prompt before a resize) */
  clearEarlyTerminalData(terminalId: string): void {
    this.earlyTerminalData.delete(terminalId);
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
      window.api.terminalOnExit(async (terminalId: string, exitCode: number) => {
        console.log('[App] Terminal', terminalId, 'exited with code', exitCode);
        const inst = this.terminalInstances.get(terminalId);
        if (inst) inst.instance.markPtyExited();
        if ((window as any).__restartingTerminalId === terminalId) {
          (window as any).__restartingTerminalId = null;
          // Deliberate restart — do NOT close the tab.
          return;
        }
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          // closeTab (TabBar.removeTab) is async — it awaits onTabClose (which
          // itself awaits the terminalKill IPC round-trip) before it actually
          // mutates its internal tab list and fires onTabSwitch/onAllTabsClosed.
          // Must await here too, otherwise this handler used to read stale tab
          // state before TabBar had removed the exited tab.
          await tabBarAPI.closeTab(terminalId);
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
        // Refreshes appState.gitStatus itself if this pwd change moved the
        // active tab's effective git root — no separate gitGetStatus call
        // needed here. A second, independent call for the same `pwd` used
        // to live in this handler and raced this one: gitService's status
        // fetch is a single global slot that cancels whichever request is
        // still in flight when a newer one starts, and the loser's `.then`
        // unconditionally wrote `null` — so the two calls could clobber
        // each other on every single `cd`, sometimes leaving the tree
        // uncolored even though the newer fetch had the correct data.
        this.updateFileTreeDisplayRoot();
        const tabBarAPI = (window as any).__tabBarAPI;
        if (tabBarAPI) {
          tabBarAPI.updateTabFileName(terminalId, this.deriveTerminalTabName(pwd));
        }
      });
      this.addCleanup(() => window.api?.terminalRemovePwdListener?.());
    }

    // Terminal SSH title — user@host derived from an `ssh <alias>` invocation typed
    // into the terminal; null means "revert to the normal cwd-based title"
    if (window.api?.terminalOnSshTitle && window.api?.terminalRemoveSshTitleListener) {
      window.api.terminalRemoveSshTitleListener();
      window.api.terminalOnSshTitle((terminalId: string, title: string | null) => {
        const tabBarAPI = (window as any).__tabBarAPI;
        if (!tabBarAPI) return;
        const icon = '\u{1F4BB}';
        if (title) {
          tabBarAPI.updateTabFileName(terminalId, `${icon} ${title}`);
          return;
        }
        const cwd = this.terminalFileTreeRoots[terminalId]?.cwd;
        if (cwd) tabBarAPI.updateTabFileName(terminalId, this.deriveTerminalTabName(cwd));
      });
      this.addCleanup(() => window.api?.terminalRemoveSshTitleListener?.());
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

    // CLI open commands (from novi CLI tool or startup flags)
    if (window.api?.onOpenFromCli) {
      window.api.onOpenFromCli((payload) => {
        if (payload.filePath) void this.openFileFromPath(payload.filePath);
        else if (payload.openTerminal) void this.createTerminalTab(payload.cwd);
        else if (payload.newFile) this.createNewFileTab();
      });
      this.addCleanup(() => window.api?.removeOpenFromCliListener?.());
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

    // showhiddenfiles setting changes
    const shfHandler = () => {
      const ftApi = (window as any).__fileTreeAPI;
      if (ftApi?.refresh) ftApi.refresh();
    };
    window.addEventListener('novi-showhiddenfiles-changed', shfHandler);
    this.addCleanup(() => window.removeEventListener('novi-showhiddenfiles-changed', shfHandler));

    // gitenabled setting changes — must take effect immediately, with no restart:
    // stop any active .git watcher and drop cached status so nothing keeps running
    // in the background once the user turns git support off.
    const geHandler = () => {
      window.api?.getSetting<boolean>('gitenabled', true).then((v) => {
        this.gitEnabled = v !== false;
        this.fileTree.setShowGitToggle(this.gitEnabled);
        if (!this.gitEnabled) {
          if (this.showGitPanel) {
            this.showGitPanel = false;
            this.updateSidebarVisibility();
          }
          window.api?.gitStopWatching?.().catch(() => {});
          appState.gitStatus = null;
        }
      });
    };
    window.addEventListener('novi-gitenabled-changed', geHandler);
    this.addCleanup(() => window.removeEventListener('novi-gitenabled-changed', geHandler));

    // wordwrap setting changes from Settings' Editor section — the View menu's
    // own Toggle Word Wrap checkbox already applies live via handleMenuCommand.
    const wwHandler = () => {
      window.api?.getSetting<boolean>('wordwrap', false).then((v) => {
        this.editorWordWrap = !!v;
        this.monacoEditor.wordWrap = this.editorWordWrap;
      });
    };
    window.addEventListener('novi-wordwrap-changed', wwHandler);
    this.addCleanup(() => window.removeEventListener('novi-wordwrap-changed', wwHandler));

    // Default font size/family changes from Settings' Editor and Terminal sections —
    // the View menu's Increase/Decrease/Reset Font Size shortcuts already apply live
    // by updating these same fields (and the same 'fontSize'/'terminalFontSize' keys)
    // directly in handleFontSizeCommand(), without needing an event round-trip.
    const efsHandler = () => {
      window.api?.getSetting<number>('fontSize', 14).then((v) => {
        this.editorFontSize = v ?? 14;
        this.monacoEditor.fontSize = this.editorFontSize;
      });
    };
    window.addEventListener('novi-fontsize-changed', efsHandler);
    this.addCleanup(() => window.removeEventListener('novi-fontsize-changed', efsHandler));

    const tfsHandler = () => {
      window.api?.getSetting<number>('terminalFontSize', 14).then((v) => {
        this.terminalFontSize = v ?? 14;
        this.syncTerminalActiveState();
      });
    };
    window.addEventListener('novi-terminalfontsize-changed', tfsHandler);
    this.addCleanup(() => window.removeEventListener('novi-terminalfontsize-changed', tfsHandler));

    const effHandler = () => {
      window.api?.getSetting<string>('editorFontFamily', 'DejaVu Sans Mono').then((v) => {
        this.editorFontFamily = v ?? 'DejaVu Sans Mono';
        this.monacoEditor.fontFamily = this.editorFontFamily;
      });
    };
    window.addEventListener('novi-editorfontfamily-changed', effHandler);
    this.addCleanup(() => window.removeEventListener('novi-editorfontfamily-changed', effHandler));

    const tffHandler = () => {
      window.api?.getSetting<string>('terminalFontFamily', 'DejaVu Sans Mono').then((v) => {
        this.terminalFontFamily = v ?? 'DejaVu Sans Mono';
        this.syncTerminalActiveState();
      });
    };
    window.addEventListener('novi-terminalfontfamily-changed', tffHandler);
    this.addCleanup(() => window.removeEventListener('novi-terminalfontfamily-changed', tffHandler));

    // vimode / preserveNoviKeybindingsInVim: both feed shouldForceNoviDispatch(),
    // which decides whether Novi shortcuts (New File, Open File, ...) need to
    // pre-empt monaco-vim in the capture-phase listener in setupKeyboardShortcuts().
    const vmHandler = (e: CustomEvent<{ enabled: boolean }>) => {
      this.vimModeEnabled = e.detail?.enabled ?? false;
    };
    window.addEventListener('novi-vimode-changed', vmHandler as EventListener);
    this.addCleanup(() => window.removeEventListener('novi-vimode-changed', vmHandler as EventListener));

    const pnkHandler = () => {
      window.api?.getSetting<boolean>('preserveNoviKeybindingsInVim', false).then((v) => {
        this.preserveNoviKeybindingsInVim = !!v;
      });
    };
    window.addEventListener('novi-preservenovikeybindingsinvim-changed', pnkHandler);
    this.addCleanup(() => window.removeEventListener('novi-preservenovikeybindingsinvim-changed', pnkHandler));

    // keyboardShortcuts setting changes from Options -> Keyboard Shortcuts —
    // the Novi (Electron menu) side applies itself via a main-process menu
    // rebuild; this keeps setupKeyboardShortcuts()'s in-renderer copy (used
    // for the handful of Novi shortcuts that have no menu item) in sync.
    const ksHandler = () => { void this.reloadKeyboardShortcutsSettings(); };
    window.addEventListener('novi-keyboardshortcuts-changed', ksHandler);
    this.addCleanup(() => window.removeEventListener('novi-keyboardshortcuts-changed', ksHandler));

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

  /** Novi-category commands with no Electron menu item of their own — the
   * only ones that need matching here off their customizable accelerator.
   * Menu-backed Novi commands (New File, Settings, etc.) apply through
   * the native OS accelerator via menu.ts instead — dispatchNoviShortcut()
   * falls back to handleMenuCommand() for those. */
  private static readonly APP_ONLY_NOVI_ACTIONS: Record<string, (self: App) => void> = {
    'git-refresh': (self) => void self.actionContext.onGitRefresh?.(),
    'cycle-tab-next': (self) => self.cycleTab(false),
    'cycle-tab-prev': (self) => self.cycleTab(true),
  };

  /** Editor-category ids that have a real handleMenuCommand case. The rest
   * of the Editor category is Monaco's own built-in commands (Fold, Rename
   * Symbol, ...), which apply entirely through Monaco's internal keybinding
   * service (MonacoEditor.ts's applyKeyboardShortcutOverrides) and need no
   * dispatch here — Monaco handles them itself while the editor has focus. */
  private static readonly APP_DISPATCHED_EDITOR_IDS = new Set([
    'save', 'save-as', 'close-file', 'reload-file', 'undo', 'redo', 'find', 'replace',
  ]);

  private dispatchNoviShortcut(id: string): void {
    const action = App.APP_ONLY_NOVI_ACTIONS[id];
    if (action) action(this);
    else void this.handleMenuCommand(id);
  }

  /**
   * True while the currently-focused context would otherwise consume/
   * preventDefault a Novi shortcut's keystroke itself before this component
   * ever saw it: a terminal tab (xterm sends real control bytes for many
   * Ctrl+letter combos — Ctrl+N/Ctrl+O previously vanished as SO/SI with
   * no effect) or a vim-mode editor tab with "Preserve Novi Keybindings"
   * turned on (monaco-vim treats almost every keystroke as a vim command —
   * Ctrl+N/Ctrl+O are real vim navigation bindings, which is why this is
   * opt-in rather than always overriding vim). Drives the capture-phase
   * listener in setupKeyboardShortcuts(), which must pre-empt those two
   * cases; everywhere else (non-vim editing, Settings, file tree, Welcome)
   * nothing swallows the keystroke, so the bubble-phase listener below (or
   * the native OS accelerator) already handles it fine, unchanged.
   */
  private shouldForceNoviDispatch(): boolean {
    if (this.activeTab?.type === 'terminal') return true;
    if (this.activeTab?.type === 'file' && this.vimModeEnabled && this.preserveNoviKeybindingsInVim) return true;
    return false;
  }

  private setupKeyboardShortcuts(): void {
    // Capture phase: fires before xterm's or monaco-vim's own keydown
    // handling (both live on DOM nodes inside document, so a capture-phase
    // listener registered here always runs first). Only forces a Novi
    // shortcut through when shouldForceNoviDispatch() says the underlying
    // context would otherwise swallow it — everywhere else this no-ops and
    // the event proceeds untouched to its normal handling.
    this.listen(document, 'keydown', (e: Event) => {
      if (!this.shouldForceNoviDispatch()) return;
      const ke = e as KeyboardEvent;
      const pressed = acceleratorFromKeyboardEvent(ke);
      if (!pressed) return;
      const normalizedPressed = normalizeAccelerator(pressed);
      for (const def of NOVI_SHORTCUTS) {
        const effective = computeEffectiveAccelerator(def, this.keyboardShortcutsSettings);
        if (effective && normalizeAccelerator(effective) === normalizedPressed) {
          ke.preventDefault();
          ke.stopPropagation();
          this.dispatchNoviShortcut(def.id);
          return;
        }
      }
    }, { capture: true });

    this.listen(document, 'keydown', (e: Event) => {
      const ke = e as KeyboardEvent;

      const pressed = acceleratorFromKeyboardEvent(ke);
      if (pressed) {
        const normalizedPressed = normalizeAccelerator(pressed);

        // Novi (app-level) shortcuts: defensive bubble-phase dispatch,
        // reached whenever nothing upstream already consumed the key (plain
        // editing, Settings, file tree, Welcome, ...) — both honoring the
        // native OS accelerator (menu.ts) and covering contexts where it
        // doesn't fire reliably. The capture-phase listener above already
        // handled + stopped propagation for the terminal/vim-preserve
        // cases, so this never double-fires for those.
        for (const def of NOVI_SHORTCUTS) {
          const effective = computeEffectiveAccelerator(def, this.keyboardShortcutsSettings);
          if (effective && normalizeAccelerator(effective) === normalizedPressed) {
            ke.preventDefault();
            this.dispatchNoviShortcut(def.id);
            return;
          }
        }

        // Terminal+Editor shortcuts (Copy, Select All, font size, ...):
        // genuinely apply to both contexts, so these always dispatch —
        // handleMenuCommand does the activeTab-based editor-vs-terminal
        // routing itself, reused here rather than duplicated.
        for (const def of EDITOR_TERMINAL_SHORTCUTS) {
          const effective = computeEffectiveAccelerator(def, this.keyboardShortcutsSettings);
          if (effective && normalizeAccelerator(effective) === normalizedPressed) {
            ke.preventDefault();
            void this.handleMenuCommand(def.id);
            return;
          }
        }

        // Editor-only shortcuts (Save, Undo, Find, Close File, Reload...):
        // only fire while a file/image tab is actually focused. If some
        // other tab (or none) is focused, deliberately skip entirely —
        // don't preventDefault, don't dispatch — so e.g. a terminal keeps
        // its native behavior for the same keys (Ctrl+S = XOFF, Ctrl+Z =
        // SIGTSTP) instead of the app silently swallowing them.
        const isEditorContext = this.activeTab?.type === 'file' || this.activeTab?.type === 'image';
        if (isEditorContext) {
          for (const def of EDITOR_SHORTCUTS) {
            if (!App.APP_DISPATCHED_EDITOR_IDS.has(def.id)) continue;
            const effective = computeEffectiveAccelerator(def, this.keyboardShortcutsSettings);
            if (effective && normalizeAccelerator(effective) === normalizedPressed) {
              ke.preventDefault();
              void this.handleMenuCommand(def.id);
              return;
            }
          }
        }
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
      const eff = await window.api?.getSetting<string>('editorFontFamily', 'DejaVu Sans Mono');
      const tff = await window.api?.getSetting<string>('terminalFontFamily', 'DejaVu Sans Mono');
      this.editorFontFamily = eff ?? 'DejaVu Sans Mono';
      this.terminalFontFamily = tff ?? 'DejaVu Sans Mono';
      this.monacoEditor.fontFamily = this.editorFontFamily;
      const ww = await window.api?.getSetting<boolean>('wordwrap', false);
      const ln = await window.api?.getSetting<boolean>('linenumbers', true);
      this.editorWordWrap = ww ?? false;
      this.editorLineNumbers = ln ?? true;
      this.monacoEditor.wordWrap = this.editorWordWrap;
      this.monacoEditor.lineNumbers = this.editorLineNumbers;
      const vm = await window.api?.getSetting<boolean>('vimode', false);
      const pnk = await window.api?.getSetting<boolean>('preserveNoviKeybindingsInVim', false);
      this.vimModeEnabled = !!vm;
      this.preserveNoviKeybindingsInVim = !!pnk;
      const v = await window.api?.getVersion?.();
      this.appVersion = v ?? 'unknown';
      const ge = await window.api?.getSetting<boolean>('gitenabled', true);
      this.gitEnabled = ge !== false;
      this.fileTree.setShowGitToggle(this.gitEnabled);
      // Ask terminalService directly for the shell it's actually configured
      // to use, rather than re-deriving/guessing it from settings — it's
      // the single source of truth and already accounts for the
      // git-bash-not-found-so-fell-back-to-PowerShell case.
      const shellType = await window.api?.getShellType?.();
      this.shellLabel = this.shellTypeToLabel(shellType);
      await this.reloadKeyboardShortcutsSettings();
    } catch { /* ignore */ }
  }

  private async reloadKeyboardShortcutsSettings(): Promise<void> {
    const stored = await window.api?.getSetting<Partial<KeyboardShortcutsSettings>>('keyboardShortcuts');
    this.keyboardShortcutsSettings = mergeKeyboardShortcutsSettings(stored);
  }

  private shellTypeToLabel(shellType?: string | null): string {
    switch (shellType) {
      case 'cmd': return 'cmd.exe';
      case 'powershell': return 'PowerShell';
      case 'wsl': return 'WSL';
      case 'linux': return 'Linux Terminal';
      case 'gitbash': return 'Git Bash';
      default: return 'Git Bash';
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
        this.createInitialTerminal();
      }).catch(() => {});
      return;
    }

    const args = await window.api.getCommandLineArgs();
    const keeptabs = await window.api.getSetting<boolean>('keeptabs', true);
    if (args.includes('--clean') || !keeptabs) {
      console.log('[App] Skipping workspace restoration');
      await ensureReady('tabbar-ready');
      this.createInitialTerminal();
      return;
    }

    try {
      const workspace = await window.api.workspaceLoad();
      if (!workspace) {
        await ensureReady('tabbar-ready');
        this.createInitialTerminal();
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

      // Only create an initial terminal if there are no saved terminals to restore
      if (!workspace.openTerminals?.length) {
        this.createInitialTerminal();
      }

      // Restore files
      if (workspace.openFiles?.length) {
        waitForMultipleReady(['monaco-ready', 'tabbar-ready']).then(async () => {
          const monacoAPI = (window as any).__monacoEditorAPI;
          const tabBarAPI = (window as any).__tabBarAPI;
          if (!monacoAPI || !tabBarAPI || !window.api?.readFile) return;
          let count = 0;
          const restoreFailures: string[] = [];
          for (let i = 0; i < workspace.openFiles.length; i++) {
            const file = workspace.openFiles[i];
            if (!file?.filePath) continue;
            try {
              const fileData = await window.api.readFile(file.filePath);
              const fileName = file.filePath.split(/[\\/]/).pop() || 'untitled';
              tabBarAPI.addTab({ id: `tab-${Date.now()}-${i}`, type: 'file', filePath: file.filePath, fileName, isDirty: false, content: fileData.content, language: 'typescript' });
              count++;
            } catch (error) {
              console.error(`[App] Failed to restore file: ${file.filePath}`, error);
              restoreFailures.push(this.describeFileOpenError(error, file.filePath));
            }
          }
          if (restoreFailures.length) {
            (window as any).__statusBarAPI?.setStatus(
              restoreFailures.length === 1 ? restoreFailures[0] : `${restoreFailures.length} files could not be restored`
            );
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

      // Restore terminals — build a map from old saved IDs to new IDs
      const oldToNewTabId: Record<string, string> = {};
      if (workspace.openTerminals?.length) {
        const tabBarAPI = (window as any).__tabBarAPI;
        for (let i = 0; i < workspace.openTerminals.length; i++) {
          const ti = workspace.openTerminals[i];
          const tid = `terminal-${Date.now()}-restore-${i}`;
          oldToNewTabId[ti.id] = tid;
          const cwd = ti.cwd || workspace.workspaceRoot || '';
          // A restored tab's PTY is created lazily — only once its tab
          // actually becomes active — so terminalOnPwd (the only thing that
          // normally renames a tab from its cwd) may never fire for it if
          // the workspace's last-active tab was a file, not a terminal.
          // Derive the name from the saved cwd upfront so it shows the
          // right label immediately instead of a stale/generic one.
          const restoredName = cwd ? this.deriveTerminalTabName(cwd) : (ti.name || '\u{1F4BB} bash');
          tabBarAPI.addTab({ id: tid, type: 'terminal', filePath: tid, fileName: restoredName, isDirty: false, content: '', language: 'terminal' });
          this.terminalTabs = [...this.terminalTabs, { id: tid, fileName: restoredName, workspaceRoot: cwd || this.workspaceRoot }];
          this.terminalFileTreeRoots = { ...this.terminalFileTreeRoots, [tid]: { cwd, overriddenRoot: undefined } };
        }
        this.syncTerminalInstances();
      }

      // Focus the first restored terminal, or let file restoration handle focus
      if (workspace.openTerminals?.length) {
        const firstNewId = Object.values(oldToNewTabId)[0];
        if (firstNewId) {
          this.setActiveTab({ id: firstNewId, type: 'terminal' });
          const tabBarAPI2 = (window as any).__tabBarAPI;
          if (tabBarAPI2) tabBarAPI2.switchTab(firstNewId);
        }
      }
      setTimeout(() => this.focusActiveTab(), 300);

    } catch (error) {
      console.error('[App] Failed to load workspace:', error);
      this.createInitialTerminal();
    }
  }

  private createInitialTerminal(): void {
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const tid = `terminal-${Date.now()}`;
    tabBarAPI.addTab({ id: tid, type: 'terminal', filePath: tid, fileName: '\u{1F4BB} ~', isDirty: false, content: '', language: 'terminal' });
    this.terminalTabs = [{ id: tid, fileName: '\u{1F4BB} ~', workspaceRoot: null }, ...this.terminalTabs];
    this.terminalFileTreeRoots = { ...this.terminalFileTreeRoots, [tid]: { cwd: '', overriddenRoot: undefined } };
    this.showWelcome = false;
    this.setActiveTab({ id: tid, type: 'terminal' });
    this.syncTerminalInstances();
    console.log('[App] Initial terminal tab created');
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
      const openTerminals = this.terminalTabs.map(t => ({ id: t.id, name: t.fileName, cwd: this.terminalFileTreeRoots[t.id]?.cwd || '' }));

      await window.api.workspaceSave({
        workspaceRoot: this.workspaceRoot,
        openFiles, openImages, openTerminals, homeTerminalCwd: '',
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
    if (this.activeTab?.type === 'settings') {
      return this.lastFileTreeRoot || this.workspaceRoot;
    }
    return this.workspaceRoot;
  }

  private updateFileTreeDisplayRoot(): void {
    const root = this.currentFileTreeDisplayRoot;
    if (this.activeTab?.type !== 'settings' && root) {
      this.lastFileTreeRoot = root;
    }
    if (this.fileTree) {
      // "loading" only means anything while we're genuinely waiting on the
      // active terminal's PTY to report its cwd via OSC7 (terminalOnPwd is
      // the only other place that clears it in multi-tree mode) — that's
      // the sole case where `root` isn't already known synchronously. For
      // any other active tab type (file, image, settings, none) we already
      // have a valid root here, so don't gate on it: a workspace restored
      // with a non-terminal tab active never activates any terminal (PTYs
      // are lazy, only the active tab's spins up), so terminalOnPwd would
      // never fire and this flag would otherwise stay stuck true forever,
      // permanently blocking displayRoot below and leaving the sidebar
      // spinning indefinitely.
      if (this.activeTab?.type !== 'terminal') this.fileTree.loading = false;
      if (!this.fileTree.isLoading) this.fileTree.displayRoot = root;
    }
    if (this.gitPanel && this.gitEnabled) {
      const effectiveGitRoot = root || this.workspaceRoot;
      if (effectiveGitRoot !== this.lastGitRoot) {
        // The displayed repo root just changed (tab switch, cd, workspace
        // load...). GitPanel.workspaceRoot's setter clears its own internal
        // status on this transition, but appState.gitStatus is shared across
        // every tab's FileTree coloring — without clearing it here too, the
        // previous root's (or even a previous session's restored root's)
        // status stays plastered on the new tree until some fetch happens to
        // land. Clear immediately so colors never reflect a foreign root,
        // then fetch fresh for the new one directly — don't rely solely on
        // GitPanel's own ~100ms-delayed startWatching() cascade, since that
        // requires GitPanel to independently reach the same conclusion.
        this.lastGitRoot = effectiveGitRoot;
        appState.gitStatus = null;
        if (effectiveGitRoot && window.api?.gitGetStatus) {
          window.api.gitGetStatus(effectiveGitRoot).then((status) => {
            if (this.lastGitRoot !== effectiveGitRoot) return; // superseded by a newer root change
            appState.gitStatus = status.isRepo ? status : null;
          }).catch(() => {});
        }
      }
      this.gitPanel.workspaceRoot = effectiveGitRoot;
    }
  }

  /** Renders a terminal tab's display name from a cwd, e.g. "/home/user/novi" -> "💻 novi/". */
  private deriveTerminalTabName(cwd: string): string {
    const segments = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
    const dirName = segments[segments.length - 1] || cwd;
    return `\u{1F4BB} ${dirName}/`;
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
        this.welcomeEl.appendChild(el('p', {}, 'Open a terminal or file to get started'));
        this.welcomeEl.appendChild(el('p', { style: 'font-size: 0.85em; opacity: 0.5; margin-top: 20px;' }, 'Right-click for options'));
      }
    }

    // Monaco
    this.monacoContainerEl.style.display = at?.type === 'file' && !showW ? 'flex' : 'none';
    // Image editor
    this.imageEditorContainerEl.style.display = at?.type === 'image' && !showW ? 'flex' : 'none';
    // Settings
    const showSettings = at?.type === 'settings' && !showW;
    this.settingsContainerEl.style.display = showSettings ? 'flex' : 'none';
    if (showSettings) this.settingsTab?.notifyShown();
  }

  private updateSidebarVisibility(): void {
    const isSettings = this.activeTab?.type === 'settings';
    this.settingsSidebarContainerEl.style.display = isSettings ? 'flex' : 'none';
    this.fileTreeContainerEl.style.display = (this.showGitPanel || isSettings) ? 'none' : 'flex';
    this.gitPanelContainerEl.style.display = this.showGitPanel && !isSettings ? 'flex' : 'none';
    this.titleBar?.updateConfig({ showGitPanel: this.showGitPanel });
  }

  // ============================================================
  // Terminal instance management
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
          fontFamily: this.terminalFontFamily,
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
      entry.instance.fontFamilyProp = this.terminalFontFamily;
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
      filePath: (tab.type === 'file' || tab.type === 'image') ? tab.filePath : undefined,
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
      (window as any).__statusBarAPI?.removeItem?.('editor-position');
      (window as any).__statusBarAPI?.setStatus(`Viewing: ${tab.fileName}`);
    } else if (tab.type === 'terminal') {
      (window as any).__statusBarAPI?.removeItem?.('editor-position');
      (window as any).__statusBarAPI?.setStatus(`${this.shellLabel}: ${tab.fileName}`);
    } else if (tab.type === 'settings') {
      (window as any).__statusBarAPI?.removeItem?.('editor-position');
      (window as any).__statusBarAPI?.setStatus('Settings');
    }

    requestAnimationFrame(() => requestAnimationFrame(() => this.focusActiveTab()));
  }

  private async onTabClose(tabId: string): Promise<boolean> {
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

  /**
   * Turns a failed window.api.readFile() rejection into a short, user-facing
   * status-bar message. Previously these failures only reached
   * console.error (or, for session restore, nowhere at all) — a file the
   * user can't open (e.g. a permission-denied Windows junction like
   * `C:\Users\<name>\Application Data`) looked like nothing happened.
   */
  private describeFileOpenError(error: unknown, filePath: string): string {
    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    const code = (error as { code?: string } | null | undefined)?.code;
    if (code === 'EPERM' || code === 'EACCES') return `Permission denied: ${fileName}`;
    if (code === 'ENOENT') return `File not found: ${fileName}`;
    if (code === 'EISDIR') return `${fileName} is a directory`;
    return `Failed to open ${fileName}`;
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
      (window as any).__statusBarAPI?.setStatus(this.describeFileOpenError(error, filePath));
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

    if (this.singleFileTree || !this.activeTab) {
      if (this.gitEnabled && window.api?.gitGetStatus) {
        try {
          const status = await window.api.gitGetStatus(dirPath);
          if (status.isRepo) appState.gitStatus = status;
          else appState.gitStatus = null;
        } catch { appState.gitStatus = null; }
      }
    }
  }

  // ============================================================
  // CLI commands
  // ============================================================

  private async openFileFromPath(filePath: string): Promise<void> {
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    // Switch to existing tab rather than opening a duplicate
    const existing = tabBarAPI.getTabs?.().find((t: any) => t.filePath === filePath);
    if (existing) {
      tabBarAPI.switchTab(existing.id);
      this.setActiveTab({ id: existing.id, type: existing.type });
      this.showWelcome = false;
      this.updateContentVisibility();
      return;
    }
    this.showWelcome = false;
    this.updateContentVisibility();
    if (isImageFile(filePath)) {
      const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
      const tabId = `tab-${Date.now()}`;
      tabBarAPI.addTab({ id: tabId, type: 'image', filePath, fileName, isDirty: false, content: '' });
      const root = this.currentFileTreeDisplayRoot;
      if (root) this.fileTabToTreeRoot = { ...this.fileTabToTreeRoot, [tabId]: root };
      this.setActiveTab({ id: tabId, type: 'image' });
      return;
    }
    try {
      const fileData = await window.api.readFile(filePath);
      (window as any).__monacoEditorAPI?.loadFile(filePath, fileData.content);
      const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
      const tabId = `tab-${Date.now()}`;
      tabBarAPI.addTab({ id: tabId, type: 'file', filePath, fileName, isDirty: false, content: fileData.content, language: 'typescript' });
      const root = this.currentFileTreeDisplayRoot;
      if (root) this.fileTabToTreeRoot = { ...this.fileTabToTreeRoot, [tabId]: root };
      this.setActiveTab({ id: tabId, type: 'file' });
    } catch (error) {
      console.error('[App] Failed to open file from CLI:', error);
      (window as any).__statusBarAPI?.setStatus(this.describeFileOpenError(error, filePath));
    }
  }

  async createTerminalTab(cwd?: string): Promise<void> {
    if (!window.api?.terminalCreate) return;
    const terminalId = `terminal-${Date.now()}`;
    this.showWelcome = false;
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    tabBarAPI.addTab({ id: terminalId, type: 'terminal', filePath: terminalId, fileName: '\u{1F4BB} bash', isDirty: false, content: '', language: 'terminal' });
    // Use the provided cwd if given; otherwise inherit from the active terminal or workspace root
    let startCwd: string | null | undefined = cwd;
    if (!startCwd) {
      const currentTab = tabBarAPI.getActiveTab?.();
      const activeCwd = currentTab?.type === 'terminal' && currentTab.id
        ? (this.terminalFileTreeRoots[currentTab.id]?.overriddenRoot ?? this.terminalFileTreeRoots[currentTab.id]?.cwd)
        : null;
      startCwd = activeCwd || this.workspaceRoot;
    }
    this.terminalTabs = [...this.terminalTabs, { id: terminalId, fileName: '\u{1F4BB} bash', workspaceRoot: startCwd }];
    this.terminalFileTreeRoots = { ...this.terminalFileTreeRoots, [terminalId]: { cwd: startCwd || '', overriddenRoot: undefined } };
    this.setActiveTab({ id: terminalId, type: 'terminal' });
    this.syncTerminalInstances();
    this.updateContentVisibility();
    (window as any).__statusBarAPI?.setStatus(`${this.shellLabel}`);
  }

  createNewFileTab(): void {
    const tabBarAPI = (window as any).__tabBarAPI;
    if (!tabBarAPI) return;
    const fileName = `Untitled-${this.untitledCounter}`;
    const tabId = `untitled-${this.untitledCounter}-${Date.now()}`;
    this.showWelcome = false;
    tabBarAPI.addTab({ id: tabId, type: 'file', filePath: '', fileName, isDirty: true, content: '', language: 'plaintext' });
    this.setActiveTab({ id: tabId, type: 'file', filePath: '', fileName });
    this.untitledCounter++;
    this.updateContentVisibility();
  }

  // ============================================================
  // Action context
  // ============================================================

  private buildActionContext(): void {
    this.actionContext = {
      onOpenFile: async () => {
        if (!window.api?.openFile || !window.api?.readFile) return;
        let filePath: string | null | undefined;
        try {
          filePath = await window.api.openFile();
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
          (window as any).__statusBarAPI?.setStatus(filePath ? this.describeFileOpenError(error, filePath) : 'Failed to open file');
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
              this.forceCloseTabId = currentTab.id;
              await tabBarAPI.removeTab(currentTab.id);
              tabBarAPI.addTab({ id: currentTab.id, type: 'file', filePath: result.path, fileName, isDirty: false, content, language: 'plaintext' });
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
      onNewTerminal: async () => { void this.createTerminalTab(); },
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
        this.createNewFileTab();
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
      case 'undo':
        if (this.activeTab?.type === 'file') (window as any).__monacoEditorAPI?.undo();
        break;
      case 'redo':
        if (this.activeTab?.type === 'file') (window as any).__monacoEditorAPI?.redo();
        break;
      case 'cut':
        if (this.activeTab?.type === 'file') (window as any).__monacoEditorAPI?.cut();
        break;
      case 'copy':
        if (this.activeTab?.type === 'file') (window as any).__monacoEditorAPI?.copy();
        else if (this.activeTab?.type === 'terminal') (window as any).__terminalAPI?.[this.activeTab.id]?.copy?.();
        break;
      case 'paste':
        if (this.activeTab?.type === 'file') (window as any).__monacoEditorAPI?.paste();
        else if (this.activeTab?.type === 'terminal') (window as any).__terminalAPI?.[this.activeTab.id]?.paste?.();
        break;
      case 'select-all':
        if (this.activeTab?.type === 'file') (window as any).__monacoEditorAPI?.selectAll();
        else if (this.activeTab?.type === 'terminal') (window as any).__terminalAPI?.[this.activeTab.id]?.selectAll?.();
        break;
      case 'toggle-word-wrap':
        if (this.activeTab?.type === 'file') {
          // TitleBar's checkbox click already flipped and persisted the
          // setting before dispatching this command — read the fresh value
          // rather than independently re-deriving a toggle here.
          const ww = await window.api?.getSetting<boolean>('wordwrap', false);
          this.editorWordWrap = ww ?? false;
          this.monacoEditor.wordWrap = this.editorWordWrap;
        }
        break;
      case 'toggle-line-numbers':
        if (this.activeTab?.type === 'file') {
          const ln = await window.api?.getSetting<boolean>('linenumbers', true);
          this.editorLineNumbers = ln ?? true;
          this.monacoEditor.lineNumbers = this.editorLineNumbers;
        }
        break;
      case 'increase-font-size': case 'decrease-font-size': case 'reset-font-size':
        this.handleFontSizeCommand(command);
        break;
      case 'new-terminal': await this.actionContext.onNewTerminal?.(); break;
      case 'settings': await this.actionContext.onOpenSettings?.(); break;
      case 'command-palette':
        if (this.activeTab?.type === 'file') {
          (window as any).__monacoEditorAPI?.openCommandPalette();
        }
        break;
      case 'reset-workspace': await this.resetWorkspace(); break;
      case 'find':
        if (this.activeTab?.type === 'file') (window as any).__monacoEditorAPI?.openFind();
        break;
      case 'replace':
        if (this.activeTab?.type === 'file') (window as any).__monacoEditorAPI?.openReplace();
        break;
      case 'toggle-fullscreen': window.api?.toggleFullScreen?.(); break;
      case 'zoom-in': window.api?.zoomIn?.(); break;
      case 'zoom-out': window.api?.zoomOut?.(); break;
      case 'zoom-reset': window.api?.zoomReset?.(); break;
      case 'toggle-devtools': window.api?.toggleDevTools?.(); break;
      case 'show-hidden-files':
        window.dispatchEvent(new CustomEvent('novi-showhiddenfiles-changed'));
        break;
      case 'about': this.showAboutDialog(); break;
      case 'documentation': window.open('https://miranova.studio/projects/novi.html', '_blank'); break;
      case 'report-issue': window.open('https://miranova.studio/contact.html', '_blank'); break;
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
      if (tab.type === 'terminal') {
        try { await window.api?.terminalKill?.(tab.id); } catch { /* */ }
      }
    }
    for (const tab of allTabs) {
      tabBarAPI.removeTab(tab.id);
    }
    this.terminalTabs = [];
    this.showGitPanel = false;
    this.showWelcome = true;
    this.setActiveTab(null);
    this.syncTerminalInstances();
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
      this.setActiveTab({ id: nextTab.id, type: nextTab.type, filePath: nextTab.type === 'image' ? nextTab.filePath : undefined });
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

    const onMove = (e: MouseEvent) => {
      this.sidebarWidth = Math.max(150, Math.min(600, e.clientX));
      this.sidebarEl.style.width = `${this.sidebarWidth}px`;
    };
    const onUp = () => {
      this.isResizing = false;
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
