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
  onPwd?: (dirName: string) => void; // Callback when PWD is detected (passes directory name)
  isActive?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ terminalId, workspaceRoot, onData, onResize, onPwd, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [ptyCreated, setPtyCreated] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const hasInitialFitRef = useRef(false); // Track if initial fit has completed
  const terminalBufferRef = useRef<string>(''); // Accumulate terminal output for PWD detection
  const lastPwdRef = useRef<string>(''); // Track last detected PWD to avoid duplicate updates
  
  // Store callbacks in refs to prevent useEffect re-runs when they change
  // CRITICAL: This prevents periodic redraws caused by parent component re-renders
  const onDataRef = useRef(onData);
  const onResizeRef = useRef(onResize);
  const onPwdRef = useRef(onPwd);
  
  // Update refs when callbacks change
  useEffect(() => {
    onDataRef.current = onData;
    onResizeRef.current = onResize;
    onPwdRef.current = onPwd;
  }, [onData, onResize, onPwd]);

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

      // Use ResizeObserver to wait for container to be sized
      const container = containerRef.current;
      await new Promise<void>((resolve) => {
        const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
              observer.disconnect();
              resolve();
            }
          }
        });
        observer.observe(container);
      });

      // Create a temporary xterm just to measure dimensions
      // IMPORTANT: Create without padding to get raw dimensions
      const tempTerminal = new XTerm({ 
        convertEol: true,
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
        lineHeight: 1.2,
      });
      const tempFitAddon = new FitAddon();
      tempTerminal.loadAddon(tempFitAddon);

      try {
        // Open temporarily to measure
        tempTerminal.open(containerRef.current);
        
        // Wait for xterm to render using requestAnimationFrame
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Fit to get accurate dimensions
        tempFitAddon.fit();
        
        const cols = tempTerminal.cols;
        const rows = tempTerminal.rows;
        
        console.log(`[Terminal] Measured dimensions: ${cols}x${rows}`);

        // Close temp terminal
        tempTerminal.dispose();

        // Validate dimensions before creating PTY
        if (cols < 40 || rows < 10) {
          console.warn(`[Terminal] Measured dimensions seem invalid (${cols}x${rows}), using safe defaults`);
          await (window as any).api?.terminalCreate(workspaceRoot, 100, 30, terminalId);
        } else {
          // Create PTY with the EXACT measured dimensions
          // These will match the real terminal since we're using same font/size config
          console.log(`[Terminal] Creating PTY ${terminalId} with measured dimensions: ${cols}x${rows}`);
          await (window as any).api?.terminalCreate(workspaceRoot, cols, rows, terminalId);
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
  // This should only run ONCE when the PTY is ready
  useEffect(() => {
    if (!containerRef.current || !ptyCreated || terminalRef.current) {
      return; // Don't recreate if terminal already exists
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
      cursorBlink: false, // No blinking
      cursorStyle: 'underline', // Changed from 'block' to 'underline'
      cursorWidth: 2, // Make it bold/thick
      lineHeight: 1.2,
      letterSpacing: 0,
      scrollback: 50000, // Increased to 50k lines for huge buffer
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
      
      // Simple approach: fit immediately using RAF, then scroll to bottom
      requestAnimationFrame(() => {
        fitAddon.fit();
        const cols = terminal.cols;
        const rows = terminal.rows;
        console.log('[Terminal] Terminal fit:', cols, 'x', rows);
        
        // Sync PTY dimensions
        if (onResizeRef.current) {
          onResizeRef.current(cols, rows);
        }
        
        // CRITICAL: Scroll to bottom after initial fit to show full prompt
        requestAnimationFrame(() => {
          terminal.scrollToBottom();
          console.log('[Terminal] Initial scroll to bottom completed');
        });
        
        // Mark as ready
        hasInitialFitRef.current = true;
        setIsReady(true);
        
        // Focus if active
        if (isActive) {
          terminal.focus();
        }
      });

      // Handle input
      terminal.onData((data) => {
        onDataRef.current?.(data);
      });
    } catch (error) {
      console.error('[Terminal] Failed to open terminal:', error);
    }

    // Handle resize using ResizeObserver instead of timeout debounce
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        const dimensions = terminalRef.current?.cols && terminalRef.current?.rows
          ? { cols: terminalRef.current.cols, rows: terminalRef.current.rows }
          : null;
        if (dimensions) {
          onResizeRef.current?.(dimensions.cols, dimensions.rows);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup - CRITICAL: Only disconnect observer, DON'T dispose terminal
    // Terminal must persist across tab switches to preserve history
    return () => {
      console.log('[Terminal] Cleanup: Disconnecting resize observer (terminal persists)');
      resizeObserver.disconnect();
      // DO NOT dispose terminal here - it should persist
    };
  }, [terminalId, ptyCreated, isActive]); // Keep isActive to handle focus

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
            
            // Accumulate data in buffer for PWD detection
            terminalBufferRef.current += data;
            
            // Keep buffer manageable (last 5000 chars should be enough to catch prompts)
            if (terminalBufferRef.current.length > 5000) {
              terminalBufferRef.current = terminalBufferRef.current.slice(-5000);
            }
            
            // Try to extract PWD from the accumulated buffer
            // Strip ANSI codes first for cleaner matching
            const cleanBuffer = terminalBufferRef.current.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
            
            // Debug: Show the last 200 chars of clean buffer
            const debugBuffer = cleanBuffer.slice(-200);
            console.log('[Terminal] Clean buffer (last 200 chars):', JSON.stringify(debugBuffer));
            
            // Look for Git Bash prompt pattern: "user@host MINGW64 {path}"
            // The path can be absolute (/c/Work/nova) or relative (Work/, nova/)
            // Match everything after MINGW64 until we hit a newline or prompt character
            const pwdMatch = cleanBuffer.match(/MINGW64\s+([^\r\n]+?)(?:\s+\(|$)/);
            
            console.log('[Terminal] PWD regex match:', pwdMatch ? pwdMatch[0] : 'NO MATCH');
            
            if (pwdMatch && onPwdRef.current) {
              let pwd = pwdMatch[1].trim();
              
              console.log('[Terminal] Raw PWD from match:', JSON.stringify(pwd));
              
              // Remove trailing slash if present
              if (pwd.endsWith('/')) {
                pwd = pwd.slice(0, -1);
              }
              
              // Extract just the directory name (last segment)
              const segments = pwd.split('/').filter(Boolean);
              const dirName = segments[segments.length - 1] || pwd;
              
              console.log('[Terminal] Extracted dirName:', JSON.stringify(dirName), 'lastPwd:', JSON.stringify(lastPwdRef.current));
              
              // Only update if the directory name has changed
              if (dirName && dirName !== '~' && dirName !== lastPwdRef.current) {
                console.log('[Terminal] PWD CHANGED from', JSON.stringify(lastPwdRef.current), 'to', JSON.stringify(dirName));
                lastPwdRef.current = dirName;
                onPwdRef.current(dirName);
              } else {
                console.log('[Terminal] PWD unchanged, skipping update');
              }
            }
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

  // Refit and scroll to bottom when terminal becomes active AFTER initial mount (tab switching)
  useEffect(() => {
    // Skip if this is the initial mount (hasInitialFitRef is still false)
    // This prevents double-fitting and flashing on terminal creation
    if (!hasInitialFitRef.current) {
      return;
    }
    
    if (isActive && isReady && fitAddonRef.current && terminalRef.current && containerRef.current) {
      // Use ResizeObserver to detect when container becomes visible and sized
      // This replaces setTimeout - we wait for actual layout change, not arbitrary delay
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          // Check if container has non-zero dimensions (is visible)
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            if (fitAddonRef.current && terminalRef.current) {
              // Get dimensions before fit
              const oldCols = terminalRef.current.cols;
              const oldRows = terminalRef.current.rows;
              
              // Refit to container
              fitAddonRef.current.fit();
              const newCols = terminalRef.current.cols;
              const newRows = terminalRef.current.rows;
              
              // Only notify if dimensions actually changed (avoids unnecessary PTY updates)
              if (onResizeRef.current && (newCols !== oldCols || newRows !== oldRows) && newCols > 0 && newRows > 0) {
                onResizeRef.current(newCols, newRows);
              }
              
              // CRITICAL: Always scroll to bottom when switching to this terminal
              // This ensures the prompt is always visible and not cut off
              terminalRef.current.scrollToBottom();
              console.log('[Terminal] Tab switched - scrolled to bottom');
              
              // Focus the terminal without flashing
              terminalRef.current.focus();
              
              // Disconnect observer after first successful fit
              resizeObserver.disconnect();
            }
          }
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => resizeObserver.disconnect();
    }
  }, [isActive, isReady, terminalId]);

  // Handle copy from terminal
  const handleCopy = useCallback(async () => {
    if (terminalRef.current) {
      const selection = terminalRef.current.getSelection();
      if (selection) {
        const api = (window as any).api;
        if (api && api.clipboardWriteText) {
          try {
            await api.clipboardWriteText(selection);
            console.log('[Terminal] Copied to clipboard:', selection.length, 'chars');
          } catch (error) {
            console.error('[Terminal] Failed to copy:', error);
          }
        } else {
          console.error('[Terminal] Clipboard API not available');
        }
      } else {
        console.log('[Terminal] No text selected');
      }
    }
    setContextMenu(null);
  }, []);

  // Handle paste to terminal
  const handlePaste = useCallback(async () => {
    console.log('[Terminal] Paste triggered');
    if (terminalRef.current) {
      const api = (window as any).api;
      if (!api || !api.clipboardReadText) {
        console.error('[Terminal] Clipboard API not available');
        setContextMenu(null);
        return;
      }
      
      try {
        const text = await api.clipboardReadText();
        console.log('[Terminal] Read from clipboard:', text ? text.length : 0, 'chars');
        
        if (text) {
          console.log('[Terminal] Pasting to terminal via onData');
          if (onData) {
            onData(text);
          } else {
            console.warn('[Terminal] onData callback not available');
          }
        } else {
          console.warn('[Terminal] No text in clipboard');
        }
      } catch (error) {
        console.error('[Terminal] Failed to paste:', error);
      }
    }
    setContextMenu(null);
  }, [onData]);

  // Handle right-click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Notify other components to close their context menus
    window.dispatchEvent(new CustomEvent('nova-close-context-menus', { detail: { source: 'Terminal' } }));
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

  // Close context menu when another component opens its menu
  useEffect(() => {
    const handleCloseContextMenus = (e: CustomEvent) => {
      if (e.detail.source !== 'Terminal') {
        setContextMenu(null);
      }
    };
    window.addEventListener('nova-close-context-menus', handleCloseContextMenus as EventListener);
    return () => window.removeEventListener('nova-close-context-menus', handleCloseContextMenus as EventListener);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1e1e1e',
          boxSizing: 'border-box',
          overflow: 'hidden',
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.2s ease-in',
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
            📋 Copy
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
            📄 Paste
          </div>
          <div
            style={{
              height: '1px',
              backgroundColor: '#3e3e42',
              margin: '4px 0',
            }}
          />
          <div
            onClick={() => {
              setContextMenu(null);
              onNewTerminal?.();
            }}
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
            💻 New Terminal
          </div>
        </div>
      )}
    </>
  );
};

