/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Terminal - Integrated terminal component using xterm.js
 * Displays terminal output and handles user input
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
// Note: xterm.css is loaded in index.html

export interface TerminalProps {
  terminalId: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  isActive?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ terminalId, onData, onResize, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      console.error('[Terminal] Container ref not available');
      return;
    }

    console.log('[Terminal] Initializing xterm for:', terminalId);

    // Create xterm instance
    const terminal = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(0, 122, 204, 0.3)',
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
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
      cursorBlink: true,
      cursorStyle: 'block',
      lineHeight: 1.2,
      letterSpacing: 0,
      scrollback: 1000,
      // Disable local echo - PTY will echo characters back
      disableStdin: false,
      convertEol: false,
    });

    // Create fit addon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // Mount terminal to container
    try {
      terminal.open(containerRef.current);
      console.log('[Terminal] Terminal opened successfully');
      
      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      
      // Fit terminal to container and notify about resize
      setTimeout(() => {
        fitAddon.fit();
        const cols = terminal.cols;
        const rows = terminal.rows;
        console.log('[Terminal] Terminal fitted:', cols, 'x', rows);
        
        // Notify parent about the actual terminal size
        if (onResize && cols && rows) {
          onResize(cols, rows);
        }
      }, 100); // Give it a bit more time to render

      setIsReady(true);

      // Handle input
      terminal.onData((data) => {
        onData?.(data);
      });
    } catch (error) {
      console.error('[Terminal] Failed to open terminal:', error);
    }

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const dimensions = terminalRef.current?.cols && terminalRef.current?.rows
          ? { cols: terminalRef.current.cols, rows: terminalRef.current.rows }
          : null;
        if (dimensions) {
          onResize?.(dimensions.cols, dimensions.rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalId, onData, onResize]);

  // Expose write and focus methods for incoming data and tab switching
  useEffect(() => {
    if (terminalRef.current && isReady) {
      console.log('[Terminal] Registering terminal API for:', terminalId);
      (window as any).__terminalAPI = (window as any).__terminalAPI || {};
      (window as any).__terminalAPI[terminalId] = {
        write: (data: string) => {
          console.log('[Terminal] write() called for:', terminalId, 'data length:', data.length);
          if (terminalRef.current) {
            terminalRef.current.write(data);
          }
        },
        clear: () => {
          if (terminalRef.current) {
            terminalRef.current.clear();
          }
        },
        focus: () => {
          if (terminalRef.current) {
            terminalRef.current.focus();
          }
        },
      };
      console.log('[Terminal] Terminal API registered. Available APIs:', Object.keys((window as any).__terminalAPI));
    }

    return () => {
      if ((window as any).__terminalAPI) {
        console.log('[Terminal] Unregistering terminal API for:', terminalId);
        delete (window as any).__terminalAPI[terminalId];
      }
    };
  }, [terminalId, isReady]);

  // Refit and focus when terminal becomes active (visible)
  useEffect(() => {
    if (isActive && isReady && fitAddonRef.current && terminalRef.current) {
      console.log('[Terminal] Terminal became active, refitting and focusing:', terminalId);
      // Small delay to ensure display:flex has taken effect
      setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit();
          const cols = terminalRef.current.cols;
          const rows = terminalRef.current.rows;
          console.log('[Terminal] Refitted to:', cols, 'x', rows);
          
          // Notify parent about new size
          if (onResize && cols && rows) {
            onResize(cols, rows);
          }
          
          // Focus the terminal
          terminalRef.current.focus();
        }
      }, 50);
    }
  }, [isActive, isReady, terminalId, onResize]);

  // Handle copy from terminal
  const handleCopy = useCallback(() => {
    if (terminalRef.current) {
      const selection = terminalRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection).then(() => {
          console.log('[Terminal] Copied to clipboard:', selection.length, 'chars');
        }).catch((err) => {
          console.error('[Terminal] Failed to copy:', err);
        });
      }
    }
    setContextMenu(null);
  }, []);

  // Handle paste to terminal
  const handlePaste = useCallback(() => {
    if (terminalRef.current) {
      navigator.clipboard.readText().then((text) => {
        console.log('[Terminal] Pasting:', text.length, 'chars');
        if (onData) {
          onData(text);
        }
      }).catch((err) => {
        console.error('[Terminal] Failed to paste:', err);
      });
    }
    setContextMenu(null);
  }, [onData]);

  // Handle right-click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => setContextMenu(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1e1e1e',
          padding: '4px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
        data-terminal-id={terminalId}
      />
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: '#252526',
            border: '1px solid #3e3e42',
            borderRadius: '4px',
            padding: '4px 0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 10000,
            minWidth: '150px',
          }}
        >
          <div
            onClick={handleCopy}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#cccccc',
              fontSize: '13px',
              fontFamily: "'Segoe UI', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2d2e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Copy
          </div>
          <div
            onClick={handlePaste}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#cccccc',
              fontSize: '13px',
              fontFamily: "'Segoe UI', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2d2e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Paste
          </div>
        </div>
      )}
    </>
  );
};

