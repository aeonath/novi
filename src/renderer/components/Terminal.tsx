/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Terminal - Integrated terminal component using xterm.js
 * Displays terminal output and handles user input
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
// Note: xterm.css is loaded in index.html

export interface TerminalProps {
  terminalId: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ terminalId, onData, onResize }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);

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

  return (
    <div
      ref={containerRef}
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
  );
};

