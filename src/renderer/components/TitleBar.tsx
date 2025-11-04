/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * TitleBar - Custom title bar with window controls (React)
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title = 'Nova IDE' }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  useEffect(() => {
    // Get initial maximize state
    const updateMaximizeState = async () => {
      if (window.api?.windowIsMaximized) {
        try {
          const maximized = await window.api.windowIsMaximized();
          setIsMaximized(maximized);
        } catch (error) {
          console.error('[TitleBar] Failed to get maximize state:', error);
        }
      }
    };

    void updateMaximizeState();
  }, []);

  const handleMinimize = useCallback(() => {
    if (window.api?.windowMinimize) {
      window.api.windowMinimize();
    }
  }, []);

  const handleMaximize = useCallback(async () => {
    if (window.api?.windowMaximize) {
      window.api.windowMaximize();
      setIsMaximized(!isMaximized);
      
      // Update actual state after window manager processes the request
      setTimeout(async () => {
        if (window.api?.windowIsMaximized) {
          try {
            const maximized = await window.api.windowIsMaximized();
            setIsMaximized(maximized);
          } catch (error) {
            console.error('[TitleBar] Failed to update maximize state:', error);
          }
        }
      }, 100);
    }
  }, [isMaximized]);

  const handleClose = useCallback(() => {
    if (window.api?.windowClose) {
      window.api.windowClose();
    }
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.leftSection}>
        <div style={styles.title}>{title}</div>
      </div>

      <div style={styles.controls}>
        <div
          className="window-btn window-btn-minimize"
          style={{
            ...styles.button,
            ...(hoveredButton === 'minimize' ? styles.buttonHover : {}),
            ...(activeButton === 'minimize' ? styles.buttonActive : {}),
          }}
          onMouseEnter={() => setHoveredButton('minimize')}
          onMouseLeave={() => setHoveredButton(null)}
          onMouseDown={() => setActiveButton('minimize')}
          onMouseUp={() => setActiveButton(null)}
          onClick={handleMinimize}
          role="button"
          aria-label="Minimize"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleMinimize();
            }
          }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="10" height="1" fill="#cccccc"/>
          </svg>
        </div>

        <div
          className="window-btn window-btn-maximize"
          style={{
            ...styles.button,
            ...(hoveredButton === 'maximize' ? styles.buttonHover : {}),
            ...(activeButton === 'maximize' ? styles.buttonActive : {}),
          }}
          onMouseEnter={() => setHoveredButton('maximize')}
          onMouseLeave={() => setHoveredButton(null)}
          onMouseDown={() => setActiveButton('maximize')}
          onMouseUp={() => setActiveButton(null)}
          onClick={handleMaximize}
          role="button"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              void handleMaximize();
            }
          }}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2V0H10V8H8V10H0V2H2ZM8 2H2V8H8V2Z" fill="#cccccc"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="10" height="10" stroke="#cccccc" strokeWidth="1" fill="none"/>
            </svg>
          )}
        </div>

        <div
          className="window-btn window-btn-close"
          style={{
            ...styles.button,
            ...(hoveredButton === 'close' ? styles.buttonHoverClose : {}),
            ...(activeButton === 'close' ? styles.buttonActiveClose : {}),
          }}
          onMouseEnter={() => setHoveredButton('close')}
          onMouseLeave={() => setHoveredButton(null)}
          onMouseDown={() => setActiveButton('close')}
          onMouseUp={() => setActiveButton(null)}
          onClick={handleClose}
          role="button"
          aria-label="Close"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClose();
            }
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.5 0L0 0.5L4.5 5L0 9.5L0.5 10L5 5.5L9.5 10L10 9.5L5.5 5L10 0.5L9.5 0L5 4.5L0.5 0Z" fill="#cccccc"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '32px',
    backgroundColor: '#1e1e1e',
    color: '#cccccc',
    // WebKit-specific property for window dragging
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    WebkitAppRegion: 'drag',
    userSelect: 'none' as const,
    borderBottom: '1px solid #3e3e42',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#cccccc',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#1e1e1e',
    // WebKit-specific property
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
  },
  button: {
    width: '46px',
    height: '32px',
    border: 'none',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'background-color 0.15s ease, color 0.15s ease',
    outline: 'none',
  } as React.CSSProperties,
  buttonHover: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
  } as React.CSSProperties,
  buttonActive: {
    backgroundColor: '#333',
  } as React.CSSProperties,
  buttonHoverClose: {
    backgroundColor: '#e81123',
    color: '#fff',
  } as React.CSSProperties,
  buttonActiveClose: {
    backgroundColor: '#c50f1f',
  } as React.CSSProperties,
};

