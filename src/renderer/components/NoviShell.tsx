/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * NoviShell - Novi's command-line interface for settings and commands
 * Provides a simple REPL for Novi-specific commands (e.g. set vimode)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export interface NoviShellProps {
  promptId: string;
  isActive?: boolean;
  onClose?: () => void;
}

export const NoviShell: React.FC<NoviShellProps> = ({ promptId, isActive, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const handleCopyRef = useRef<() => Promise<void>>(async () => {});
  const handlePasteRef = useRef<() => Promise<void>>(async () => {});

  // Initialize xterm when component mounts
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) {
      return;
    }

    console.log(`[NoviShell] Initializing for: ${promptId}`);

    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: 'rgba(0, 122, 204, 0.3)',
        selectionForeground: undefined,
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      convertEol: true,
      scrollback: 1000,
      windowsMode: false,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    try {
      terminal.open(containerRef.current);
      fitAddon.fit();
      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Display welcome message and prompt
      terminal.writeln('Novi Shell v0.6.6-dev');
      terminal.writeln('Type "help" for available commands');
      terminal.writeln('');
      writePrompt(terminal);

      // Handle keyboard input
      terminal.onData((data) => {
        handleInput(terminal, data);
      });

      console.log('[NoviShell] Initialized successfully');
    } catch (error) {
      console.error('[NoviShell] Failed to initialize:', error);
    }

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current && containerRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (error) {
          console.error('[NoviShell] Resize failed:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
    };
  }, [promptId]);

  // Fit terminal when it becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch (error) {
          console.error('[NoviShell] Fit failed:', error);
        }
      }, 100);
    }
  }, [isActive]);

  const writePrompt = (terminal: XTerm) => {
    terminal.write('\r\n\x1b[36mnovi>\x1b[0m ');
  };

  const handleInput = (terminal: XTerm, data: string) => {
    const char = data.charCodeAt(0);

    // Handle Enter key
    if (char === 13) {
      const command = currentLineRef.current.trim();
      terminal.write('\r\n');

      if (command) {
        executeCommand(terminal, command).then(() => {
          currentLineRef.current = '';
          writePrompt(terminal);
        });
      } else {
        currentLineRef.current = '';
        writePrompt(terminal);
      }
      return;
    }

    // Handle Backspace
    if (char === 127 || char === 8) {
      if (currentLineRef.current.length > 0) {
        currentLineRef.current = currentLineRef.current.slice(0, -1);
        terminal.write('\b \b');
      }
      return;
    }

    // Handle Ctrl+C
    if (char === 3) {
      terminal.write('^C');
      currentLineRef.current = '';
      writePrompt(terminal);
      return;
    }

    // Handle Ctrl+L (clear screen)
    if (char === 12) {
      terminal.clear();
      writePrompt(terminal);
      return;
    }

    // Handle printable characters
    if (char >= 32 && char < 127) {
      currentLineRef.current += data;
      terminal.write(data);
    }
  };

  const executeCommand = async (terminal: XTerm, command: string) => {
    console.log(`[NoviShell] Executing command: ${command}`);

    const parts = command.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'help':
          commandHelp(terminal);
          break;

        case 'version':
          commandVersion(terminal);
          break;

        case 'list':
          commandList(terminal);
          break;

        case 'clear':
          terminal.clear();
          break;

        case 'exit':
          onClose?.();
          return;
        case 'set':
          await commandSet(terminal, args);
          break;

        case '':
          // Empty command, do nothing
          break;

        default:
          terminal.writeln(`\x1b[31mUnknown command: ${cmd}\x1b[0m`);
          terminal.writeln('Type "help" for available commands');
          break;
      }
    } catch (error) {
      terminal.writeln(`\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
    }
  };

  const commandSet = async (terminal: XTerm, args: string[]) => {
    if (args.length === 0) {
      try {
        const vimode = await window.api.getSetting<boolean>('vimode', false);
        const compat = await window.api.getSetting<boolean>('compat', false);
        const singlefiletree = await window.api.getSetting<boolean>('singlefiletree', false);
        terminal.writeln('\x1b[36mCurrent settings:\x1b[0m');
        terminal.writeln(`  vimode         ${vimode ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
        terminal.writeln(`  compat         ${compat ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
        terminal.writeln(`  singlefiletree ${singlefiletree ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m'}`);
      } catch (e) {
        terminal.writeln('\x1b[31mFailed to read settings\x1b[0m');
      }
      return;
    }
    const option = args[0].toLowerCase();
    const value = args[1]?.toLowerCase();

    if (option !== 'vimode' && option !== 'compat' && option !== 'singlefiletree') {
      terminal.writeln(`\x1b[31mUnknown option: ${option}\x1b[0m`);
      terminal.writeln('Supported: vimode, compat, singlefiletree');
      return;
    }

    if (value === undefined || value === '') {
      try {
        if (option === 'vimode') {
          const on = await window.api.getSetting<boolean>('vimode', false);
          terminal.writeln(on ? '\x1b[32mvimode is on\x1b[0m' : '\x1b[33mvimode is off\x1b[0m');
        } else if (option === 'compat') {
          const on = await window.api.getSetting<boolean>('compat', false);
          terminal.writeln(on ? '\x1b[32mcompat is on\x1b[0m' : '\x1b[33mcompat is off\x1b[0m');
        } else {
          const on = await window.api.getSetting<boolean>('singlefiletree', false);
          terminal.writeln(on ? '\x1b[32msinglefiletree is on\x1b[0m' : '\x1b[33msinglefiletree is off\x1b[0m');
        }
      } catch (e) {
        terminal.writeln('\x1b[31mFailed to read setting\x1b[0m');
      }
      return;
    }

    if (value !== 'on' && value !== 'off') {
      terminal.writeln(`\x1b[31mExpected "on" or "off", got: ${value}\x1b[0m`);
      return;
    }

    if (option === 'vimode') {
      try {
        await window.api.setSetting('vimode', value === 'on');
        window.dispatchEvent(new CustomEvent('novi-vimode-changed', { detail: { enabled: value === 'on' } }));
        terminal.writeln(value === 'on' ? '\x1b[32mvimode on\x1b[0m' : '\x1b[33mvimode off\x1b[0m');
      } catch (e) {
        terminal.writeln('\x1b[31mFailed to set vimode\x1b[0m');
      }
      return;
    }

    if (option === 'compat') {
      try {
        await window.api.setSetting('compat', value === 'on');
        terminal.writeln(value === 'on' ? '\x1b[32mcompat on\x1b[0m' : '\x1b[33mcompat off\x1b[0m');
      } catch (e) {
        terminal.writeln('\x1b[31mFailed to set compat\x1b[0m');
      }
      return;
    }

    if (option === 'singlefiletree') {
      try {
        await window.api.setSetting('singlefiletree', value === 'on');
        window.dispatchEvent(new CustomEvent('novi-singlefiletree-changed'));
        terminal.writeln(value === 'on' ? '\x1b[32msinglefiletree on\x1b[0m' : '\x1b[33msinglefiletree off\x1b[0m');
      } catch (e) {
        terminal.writeln('\x1b[31mFailed to set singlefiletree\x1b[0m');
      }
    }
  };

  const commandHelp = (terminal: XTerm) => {
    terminal.writeln('Available Commands:');
    terminal.writeln('');
    terminal.writeln('  \x1b[33mversion\x1b[0m      - Display Novi version information');
    terminal.writeln('  \x1b[33mlist\x1b[0m         - List all open tabs');
    terminal.writeln('  \x1b[33mclear\x1b[0m        - Clear the screen');
    terminal.writeln('  \x1b[33mexit\x1b[0m         - Close this Novi Shell tab');
    terminal.writeln('  \x1b[33mset\x1b[0m          - Set options (e.g. set vimode on|off); set with no args shows all');
    terminal.writeln('  \x1b[33mhelp\x1b[0m         - Show this help message');
    terminal.writeln('');
    terminal.writeln('Keyboard Shortcuts:');
    terminal.writeln('  Ctrl+C       - Cancel current input');
    terminal.writeln('  Ctrl+L       - Clear the screen');
  };

  const commandVersion = (terminal: XTerm) => {
    terminal.writeln('Novi Editor v0.6.6-dev');
    terminal.writeln('');
    terminal.writeln('© 2026 MiraNova Studios');
  };

  const commandList = (terminal: XTerm) => {
    const tabs = (window as any).__tabBarAPI?.getTabs() || [];
    const activeTab = (window as any).__tabBarAPI?.getActiveTab();

    if (tabs.length === 0) {
      terminal.writeln('\x1b[33mNo tabs open\x1b[0m');
      return;
    }

    terminal.writeln(`Open Tabs (${tabs.length}):`);
    terminal.writeln('');

    tabs.forEach((tab: any, index: number) => {
      const isActive = activeTab && activeTab.id === tab.id;
      const marker = isActive ? '\x1b[32m*\x1b[0m' : ' ';
      const dirtyMarker = tab.isDirty ? '\x1b[33m●\x1b[0m' : ' ';
      const typeIcon = tab.type === 'terminal' ? '💻' : tab.type === 'novi-prompt' ? '⚙' : '📄';

      terminal.writeln(`  ${marker} ${typeIcon} ${tab.fileName} ${dirtyMarker}`);
    });

    terminal.writeln('');
    terminal.writeln('Legend: \x1b[32m*\x1b[0m = active, \x1b[33m●\x1b[0m = unsaved changes');
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });

    // Close other context menus
    window.dispatchEvent(new CustomEvent('novi-close-context-menus'));
  };

  const handleCopy = useCallback(async () => {
    if (terminalRef.current) {
      const selection = terminalRef.current.getSelection();
      if (selection) {
        try {
          await window.api.clipboardWriteText(selection);
          console.log('[NoviShell] Copied to clipboard');
        } catch (error) {
          console.error('[NoviShell] Copy failed:', error);
        }
      }
    }
    setContextMenu(null);
  }, []);
  handleCopyRef.current = handleCopy;

  const handlePaste = useCallback(async () => {
    if (terminalRef.current) {
      try {
        const text = await window.api.clipboardReadText();
        if (text) {
          // Add to current line and display
          currentLineRef.current += text;
          terminalRef.current.write(text);
          console.log('[NoviShell] Pasted from clipboard');
        }
      } catch (error) {
        console.error('[NoviShell] Paste failed:', error);
      }
    }
    setContextMenu(null);
  }, []);
  handlePasteRef.current = handlePaste;

  const handleClear = () => {
    if (terminalRef.current) {
      terminalRef.current.clear();
      writePrompt(terminalRef.current);
    }
    setContextMenu(null);
  };

  // Register Copy/Paste so TabBar context menu (on the tab) can invoke them when Novi Shell is active
  useEffect(() => {
    if (!isActive) return;
    (window as any).__noviShellCopy = () => handleCopyRef.current?.();
    (window as any).__noviShellPaste = () => handlePasteRef.current?.();
    return () => {
      delete (window as any).__noviShellCopy;
      delete (window as any).__noviShellPaste;
    };
  }, [isActive]);

  // Expose focus so App can focus this shell when its tab becomes active
  useEffect(() => {
    (window as any).__noviShellAPI = (window as any).__noviShellAPI || {};
    (window as any).__noviShellAPI[promptId] = {
      focus: () => terminalRef.current?.focus(),
    };
    return () => {
      delete (window as any).__noviShellAPI?.[promptId];
    };
  }, [promptId]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleGlobalClose = () => setContextMenu(null);

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('novi-close-context-menus', handleGlobalClose);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('novi-close-context-menus', handleGlobalClose);
    };
  }, []);

  return (
    <div style={styles.container} onContextMenu={handleContextMenu}>
      <div
        ref={containerRef}
        style={styles.terminal}
        onContextMenu={handleContextMenu}
      />

      {contextMenu && (
        <div
          style={{
            ...styles.contextMenu,
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.menuItem} onClick={handleCopy}>
            Copy
          </div>
          <div style={styles.menuItem} onClick={handlePaste}>
            Paste
          </div>
          <div style={styles.menuSeparator} />
          <div
            style={styles.menuItem}
            onClick={() => {
              setContextMenu(null);
              onClose?.();
            }}
          >
            Close
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#1e1e1e',
  },
  terminal: {
    flex: 1,
    height: '100%',
  },
  contextMenu: {
    position: 'fixed' as const,
    backgroundColor: '#252526',
    border: '1px solid #3e3e42',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    zIndex: 10000,
    minWidth: '150px',
    padding: '4px 0',
  },
  menuItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#cccccc',
    userSelect: 'none' as const,
    transition: 'background-color 0.1s',
  },
  menuSeparator: {
    height: '1px',
    backgroundColor: '#3e3e42',
    margin: '4px 0',
  },
};
