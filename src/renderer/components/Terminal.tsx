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
  workspaceRoot?: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  isActive?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ terminalId, workspaceRoot, onData, onResize, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [ptyCreated, setPtyCreated] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const hasInitialFitRef = useRef(false); // Track if initial fit has completed

  // PHASE 1: Create PTY with measured dimensions BEFORE opening xterm
  useEffect(() => {
    if (!containerRef.current || ptyCreated) {
      return;
    }

    // CRITICAL: Only measure and create PTY when container is actually visible (isActive)
    // Otherwise we measure a hidden container and get wrong dimensions
    if (!isActive) {
      console.log('[Terminal] Waiting for container to become active before measuring...');
      return;
    }

    console.log('[Terminal] PHASE 1: Container is active, measuring and creating PTY...');

    // Measure container to get actual dimensions
    const measureAndCreatePTY = async () => {
      if (!containerRef.current) return;

      // Wait for the container to be fully rendered, visible, and measured by the browser
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create a temporary xterm just to measure dimensions
      const tempTerminal = new XTerm({ convertEol: true });
      const tempFitAddon = new FitAddon();
      tempTerminal.loadAddon(tempFitAddon);

      try {
        // Open temporarily to measure
        tempTerminal.open(containerRef.current);
        
        // Wait for xterm to render and layout
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Fit multiple times to ensure accurate measurement
        tempFitAddon.fit();
        await new Promise(resolve => setTimeout(resolve, 50));
        tempFitAddon.fit();
        await new Promise(resolve => setTimeout(resolve, 50));
        tempFitAddon.fit();
        
        const cols = tempTerminal.cols;
        const rows = tempTerminal.rows;
        
        console.log(`[Terminal] Measured dimensions: ${cols}x${rows}`);

        // Close temp terminal
        tempTerminal.dispose();

        // Validate dimensions before creating PTY
        if (cols < 40 || rows < 10) {
          console.warn(`[Terminal] Measured dimensions seem invalid (${cols}x${rows}), using safe defaults`);
          await window.api.terminalCreate(workspaceRoot, 100, 30, terminalId);
        } else {
          // Create PTY with the EXACT measured dimensions
          console.log(`[Terminal] Creating PTY ${terminalId} with measured dimensions: ${cols}x${rows}`);
          await window.api.terminalCreate(workspaceRoot, cols, rows, terminalId);
        }
        
        setPtyCreated(true);
        console.log(`[Terminal] PTY ${terminalId} created successfully`);
      } catch (error) {
        console.error('[Terminal] Failed to measure and create PTY:', error);
        tempTerminal.dispose();
      }
    };

    measureAndCreatePTY();
  }, [terminalId, workspaceRoot, ptyCreated, isActive]);

  // PHASE 2: Open xterm AFTER PTY is created with correct dimensions
  useEffect(() => {
    if (!containerRef.current || !ptyCreated) {
      return;
    }

    console.log('[Terminal] PHASE 2: Opening xterm for display...');

    console.log('[Terminal] Initializing xterm for:', terminalId);

    // Create xterm instance with proper terminal emulation settings
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
      // Critical: windowsMode MUST be false for vim and other TUI apps
      // to work correctly. This ensures proper handling of control sequences.
      windowsMode: false,
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
      
      // Fit terminal to container - PTY already created with correct dimensions
      setTimeout(() => {
        // Fit to actual container dimensions
        fitAddon.fit();
        const cols = terminal.cols;
        const rows = terminal.rows;
        console.log('[Terminal] Initial xterm fit:', cols, 'x', rows);
        
        // DO NOT send resize - PTY was created with these exact dimensions
        // Sending resize causes visible export commands and is unnecessary
        // The shell already knows the correct dimensions from PTY creation
        console.log('[Terminal] Skipping resize - PTY already has correct dimensions from creation');
        
        // Focus the terminal if it's active
        if (isActive) {
          terminal.focus();
        }
        
        // Mark as ready and initial fit as complete
        hasInitialFitRef.current = true;
        setIsReady(true);
      }, 100); // Short delay since PTY is ready

      // Handle input
      terminal.onData((data) => {
        onData?.(data);
      });
    } catch (error) {
      console.error('[Terminal] Failed to open terminal:', error);
    }

    // Handle resize with debouncing to prevent flickering
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      // Clear any pending resize
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      // Debounce resize to prevent flickering
      resizeTimeout = setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit();
          const dimensions = terminalRef.current?.cols && terminalRef.current?.rows
            ? { cols: terminalRef.current.cols, rows: terminalRef.current.rows }
            : null;
          if (dimensions) {
            onResize?.(dimensions.cols, dimensions.rows);
          }
        }
        resizeTimeout = null;
      }, 100); // 100ms debounce
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalId, ptyCreated, onData, onResize, isActive]);

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

  // Refit and focus when terminal becomes active AFTER initial mount (tab switching)
  useEffect(() => {
    // Skip if this is the initial mount (hasInitialFitRef is still false)
    // This prevents double-fitting and flashing on terminal creation
    if (!hasInitialFitRef.current) {
      return;
    }
    
    if (isActive && isReady && fitAddonRef.current && terminalRef.current) {
      // Small delay to ensure display:flex has taken effect
      const timeout = setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          // Get dimensions before fit
          const oldCols = terminalRef.current.cols;
          const oldRows = terminalRef.current.rows;
          
          // Refit to container
          fitAddonRef.current.fit();
          const newCols = terminalRef.current.cols;
          const newRows = terminalRef.current.rows;
          
          // Only notify if dimensions actually changed (avoids unnecessary PTY updates)
          if (onResize && (newCols !== oldCols || newRows !== oldRows) && newCols > 0 && newRows > 0) {
            onResize(newCols, newRows);
          }
          
          // Focus the terminal without flashing
          terminalRef.current.focus();
        }
      }, 50);
      
      return () => clearTimeout(timeout);
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

