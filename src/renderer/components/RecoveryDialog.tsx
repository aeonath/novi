/**
 * RecoveryDialog - File recovery UI (React)
 */

import React, { useState, useEffect, useCallback } from 'react';

interface RecoveryFileLocal {
  id: string;
  filePath: string;
  savedAt: number;
}

export const RecoveryDialog: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [files, setFiles] = useState<RecoveryFileLocal[]>([]);

  const checkRecoveryFiles = useCallback(async () => {
    if (!window.api?.getRecoveryFiles) return;

    try {
      const recoveryFiles = await window.api.getRecoveryFiles();
      if (recoveryFiles.length > 0) {
        const localFiles: RecoveryFileLocal[] = recoveryFiles.map(f => ({
          id: f.id,
          filePath: f.originalPath || 'Unknown',
          savedAt: f.timestamp,
        }));
        setFiles(localFiles);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('[RecoveryDialog] Failed to check recovery files:', error);
    }
  }, []);

  const restoreFile = useCallback(async (id: string) => {
    if (!window.api?.deleteRecoveryFile) return;

    try {
      await window.api.deleteRecoveryFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      if (files.length <= 1) {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('[RecoveryDialog] Failed to restore file:', error);
    }
  }, [files.length]);

  const discardAll = useCallback(async () => {
    if (!window.api?.clearRecoveryFiles) return;

    try {
      await window.api.clearRecoveryFiles();
      setFiles([]);
      setIsVisible(false);
    } catch (error) {
      console.error('[RecoveryDialog] Failed to discard all:', error);
    }
  }, []);

  // Check for recovery files on mount
  useEffect(() => {
    void checkRecoveryFiles();
  }, [checkRecoveryFiles]);

  if (!isVisible || files.length === 0) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.header}>
          <h2 style={styles.title}>Recover Unsaved Files</h2>
        </div>

        <div style={styles.content}>
          <p style={styles.message}>
            Nova found {files.length} unsaved file(s) from a previous session.
          </p>

          <div style={styles.fileList}>
            {files.map((file) => (
              <div key={file.id} style={styles.fileRow}>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{file.filePath}</div>
                  <div style={styles.fileTime}>
                    {new Date(file.savedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  style={styles.restoreButton}
                  onClick={() => restoreFile(file.id)}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.discardButton} onClick={discardAll}>
            Discard All
          </button>
          <button style={styles.closeButton} onClick={() => setIsVisible(false)}>
            Close
          </button>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  dialog: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #3e3e42',
    borderRadius: '8px',
    width: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #3e3e42',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#cccccc',
  },
  content: {
    padding: '20px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  message: {
    margin: '0 0 16px 0',
    color: '#cccccc',
    fontSize: '14px',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  fileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#252526',
    borderRadius: '4px',
    border: '1px solid #3e3e42',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#cccccc',
    fontSize: '14px',
    marginBottom: '4px',
  },
  fileTime: {
    color: '#858585',
    fontSize: '12px',
  },
  restoreButton: {
    padding: '6px 16px',
    backgroundColor: '#0e639c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #3e3e42',
  },
  discardButton: {
    padding: '8px 16px',
    backgroundColor: '#d13438',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  closeButton: {
    padding: '8px 16px',
    backgroundColor: '#3e3e42',
    color: '#cccccc',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
};

