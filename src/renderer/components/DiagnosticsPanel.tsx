/**
 * DiagnosticsPanel - Environment diagnostics (React)
 */

import React, { useState, useEffect, useCallback } from 'react';

export const DiagnosticsPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});

  const loadDiagnostics = useCallback(async () => {
    if (!window.api) return;

    try {
      // Get environment information
      const electronVersion = (process as any).versions?.electron ?? 'unknown';
      const nodeVersion = (process as any).versions?.node ?? 'unknown';
      const chromeVersion = (process as any).versions?.chrome ?? 'unknown';
      const appVersion = await window.api.getVersion();
      
      setDiagnostics({
        'Electron': electronVersion,
        'Node.js': nodeVersion,
        'Chrome': chromeVersion,
        'Nova Version': appVersion,
        'Platform': navigator.platform,
        'User Agent': navigator.userAgent,
      });
    } catch (error) {
      console.error('[DiagnosticsPanel] Failed to load diagnostics:', error);
    }
  }, []);

  const show = useCallback(async () => {
    await loadDiagnostics();
    setIsVisible(true);
  }, [loadDiagnostics]);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Expose methods
  useEffect(() => {
    (window as any).__diagnosticsPanelAPI = { show, hide };
    return () => {
      delete (window as any).__diagnosticsPanelAPI;
    };
  }, [show, hide]);

  if (!isVisible) return null;

  return (
    <div style={styles.overlay} onClick={hide}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Diagnostics</h2>
          <button style={styles.closeButton} onClick={hide}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {Object.entries(diagnostics).map(([key, value]) => (
            <div key={key} style={styles.row}>
              <span style={styles.key}>{key}:</span>
              <span style={styles.value}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  panel: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #3e3e42',
    borderRadius: '8px',
    width: '600px',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #3e3e42',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#cccccc',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#cccccc',
    fontSize: '24px',
    cursor: 'pointer',
    padding: 0,
    width: '30px',
    height: '30px',
  },
  content: {
    padding: '20px',
    overflowY: 'auto' as const,
  },
  row: {
    display: 'flex',
    marginBottom: '12px',
    fontSize: '14px',
  },
  key: {
    color: '#858585',
    minWidth: '150px',
    fontWeight: 'bold' as const,
  },
  value: {
    color: '#cccccc',
    flex: 1,
  },
};

