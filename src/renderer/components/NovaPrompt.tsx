/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * NovaPrompt - Nova's custom command-line interface
 * Provides a simple REPL for Nova-specific commands
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export interface NovaPromptProps {
  promptId: string;
  isActive?: boolean;
}

export const NovaPrompt: React.FC<NovaPromptProps> = ({ promptId, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Initialize xterm when component mounts
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) {
      return;
    }

    console.log(`[NovaPrompt] Initializing xterm for prompt: ${promptId}`);

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
      terminal.writeln('Nova Prompt v0.4.0');
      terminal.writeln('Type "help" for available commands');
      terminal.writeln('');
      writePrompt(terminal);

      // Handle keyboard input
      terminal.onData((data) => {
        handleInput(terminal, data);
      });

      console.log('[NovaPrompt] Prompt initialized successfully');
    } catch (error) {
      console.error('[NovaPrompt] Failed to initialize:', error);
    }

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current && containerRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (error) {
          console.error('[NovaPrompt] Resize failed:', error);
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
          console.error('[NovaPrompt] Fit failed:', error);
        }
      }, 100);
    }
  }, [isActive]);

  const writePrompt = (terminal: XTerm) => {
    terminal.write('\r\n\x1b[36mnova>\x1b[0m ');
  };

  const handleInput = (terminal: XTerm, data: string) => {
    const char = data.charCodeAt(0);

    // Handle Enter key
    if (char === 13) {
      const command = currentLineRef.current.trim();
      terminal.write('\r\n');
      
      if (command) {
        executeCommand(terminal, command);
      }
      
      currentLineRef.current = '';
      writePrompt(terminal);
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
    console.log(`[NovaPrompt] Executing command: ${command}`);

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

        case 'open':
          await commandOpen(terminal);
          break;

        case 'save':
          await commandSave(terminal);
          break;

        case 'list':
          commandList(terminal);
          break;

        case 'clear':
          terminal.clear();
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

  const commandHelp = (terminal: XTerm) => {
    terminal.writeln('Available Commands:');
    terminal.writeln('');
    terminal.writeln('  \x1b[33mversion\x1b[0m      - Display Nova version information');
    terminal.writeln('  \x1b[33mopen\x1b[0m         - Open file dialog');
    terminal.writeln('  \x1b[33msave\x1b[0m         - Save current file');
    terminal.writeln('  \x1b[33mlist\x1b[0m         - List all open tabs');
    terminal.writeln('  \x1b[33mclear\x1b[0m        - Clear the screen');
    terminal.writeln('  \x1b[33mhelp\x1b[0m         - Show this help message');
    terminal.writeln('');
    terminal.writeln('Keyboard Shortcuts:');
    terminal.writeln('  Ctrl+C       - Cancel current input');
    terminal.writeln('  Ctrl+L       - Clear the screen');
  };

  const commandVersion = (terminal: XTerm) => {
    terminal.writeln('Nova IDE v0.4.0');
    terminal.writeln('Integration Layer - Sprint 4');
    terminal.writeln('');
    terminal.writeln('© 2025 MiraNova Studios');
    terminal.writeln('Build: Sprint4-Task6');
  };

  const commandOpen = async (terminal: XTerm) => {
    try {
      terminal.writeln('Opening file dialog...');
      const result = await window.api.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'TypeScript', extensions: ['ts', 'tsx'] },
          { name: 'JavaScript', extensions: ['js', 'jsx'] },
          { name: 'Text', extensions: ['txt', 'md'] },
        ],
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        terminal.writeln(`\x1b[32mOpening: ${filePath}\x1b[0m`);
        
        // Read and open the file
        const fileData = await window.api.readFile(filePath);
        const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
        
        // Load into Monaco editor
        if ((window as any).__monacoEditorAPI) {
          (window as any).__monacoEditorAPI.loadFile(filePath, fileData.content);
        }
        
        // Add tab
        if ((window as any).__tabBarAPI) {
          (window as any).__tabBarAPI.addTab({
            id: `tab-${Date.now()}`,
            type: 'file',
            filePath: filePath,
            fileName: fileName,
            isDirty: false,
            content: fileData.content,
            language: 'typescript',
          });
        }
        
        terminal.writeln('\x1b[32mFile opened successfully\x1b[0m');
      } else {
        terminal.writeln('\x1b[33mFile open cancelled\x1b[0m');
      }
    } catch (error) {
      terminal.writeln(`\x1b[31mError opening file: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
    }
  };

  const commandSave = async (terminal: XTerm) => {
    try {
      const activeTab = (window as any).__tabBarAPI?.getActiveTab();
      
      if (!activeTab) {
        terminal.writeln('\x1b[33mNo file is currently open\x1b[0m');
        return;
      }

      if (activeTab.type !== 'file') {
        terminal.writeln('\x1b[33mActive tab is not a file\x1b[0m');
        return;
      }

      terminal.writeln(`Saving: ${activeTab.fileName}`);

      // Get current content from Monaco
      const content = (window as any).__monacoEditorAPI?.getValue() || activeTab.content;

      // Write to file
      await window.api.writeFile(activeTab.filePath, content);

      // Mark as not dirty
      if ((window as any).__tabBarAPI) {
        (window as any).__tabBarAPI.updateTabDirty(activeTab.id, false);
      }

      terminal.writeln('\x1b[32mFile saved successfully\x1b[0m');
    } catch (error) {
      terminal.writeln(`\x1b[31mError saving file: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
    }
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
      const typeIcon = tab.type === 'terminal' ? '💻' : tab.type === 'nova-prompt' ? '>' : '📄';
      
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
    window.dispatchEvent(new CustomEvent('nova-close-context-menus'));
  };

  const handleCopy = async () => {
    if (terminalRef.current) {
      const selection = terminalRef.current.getSelection();
      if (selection) {
        try {
          await window.api.clipboardWriteText(selection);
          console.log('[NovaPrompt] Copied to clipboard');
        } catch (error) {
          console.error('[NovaPrompt] Copy failed:', error);
        }
      }
    }
    setContextMenu(null);
  };

  const handlePaste = async () => {
    if (terminalRef.current) {
      try {
        const text = await window.api.clipboardReadText();
        if (text) {
          // Add to current line and display
          currentLineRef.current += text;
          terminalRef.current.write(text);
          console.log('[NovaPrompt] Pasted from clipboard');
        }
      } catch (error) {
        console.error('[NovaPrompt] Paste failed:', error);
      }
    }
    setContextMenu(null);
  };

  const handleClear = () => {
    if (terminalRef.current) {
      terminalRef.current.clear();
      writePrompt(terminalRef.current);
    }
    setContextMenu(null);
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleGlobalClose = () => setContextMenu(null);
    
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('nova-close-context-menus', handleGlobalClose);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('nova-close-context-menus', handleGlobalClose);
    };
  }, []);

  return (
    <div style={styles.container}>
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
          <div style={styles.menuItem} onClick={handleClear}>
            Clear Screen
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

