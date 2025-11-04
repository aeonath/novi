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
        <button
          style={{
            ...styles.button,
            ...(hoveredButton === 'minimize' ? styles.buttonHover : {}),
          }}
          onMouseEnter={() => setHoveredButton('minimize')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          −
        </button>

        <button
          style={{
            ...styles.button,
            ...(hoveredButton === 'maximize' ? styles.buttonHover : {}),
          }}
          onMouseEnter={() => setHoveredButton('maximize')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? '❐' : '□'}
        </button>

        <button
          style={{
            ...styles.button,
            fontSize: '20px',
            ...(hoveredButton === 'close' ? styles.buttonHoverClose : {}),
          }}
          onMouseEnter={() => setHoveredButton('close')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '32px',
    backgroundColor: '#2d2d30',
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
    color: '#cccccc',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'background-color 0.15s ease',
  },
  buttonHover: {
    backgroundColor: '#3e3e42',
  },
  buttonHoverClose: {
    backgroundColor: '#e81123',
    color: '#ffffff',
  },
};

