/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * SavePrompt - Dialog for unsaved changes confirmation
 */

import React from 'react';

export interface SavePromptProps {
  fileName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const SavePrompt: React.FC<SavePromptProps> = ({ fileName, onSave, onDiscard, onCancel }) => {
  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.header}>
          <h3 style={styles.title}>Unsaved Changes</h3>
        </div>
        
        <div style={styles.content}>
          <p style={styles.message}>
            Do you want to save the changes to <strong>{fileName}</strong>?
          </p>
          <p style={styles.subtitle}>
            Your changes will be lost if you don't save them.
          </p>
        </div>
        
        <div style={styles.buttonContainer}>
          <button
            style={styles.buttonSecondary}
            onClick={onCancel}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3e3e42';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2d2d30';
            }}
          >
            Cancel
          </button>
          <button
            style={styles.buttonDanger}
            onClick={onDiscard}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#c72e2e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#a01c1c';
            }}
          >
            Don't Save
          </button>
          <button
            style={styles.buttonPrimary}
            onClick={onSave}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0e639c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0e7aca';
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
  },
  dialog: {
    backgroundColor: '#252526',
    border: '1px solid #454545',
    borderRadius: '6px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
    minWidth: '400px',
    maxWidth: '500px',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #3e3e42',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#cccccc',
  },
  content: {
    padding: '20px',
  },
  message: {
    margin: 0,
    fontSize: '13px',
    color: '#cccccc',
    lineHeight: '1.5',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#858585',
    lineHeight: '1.5',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 20px',
    borderTop: '1px solid #3e3e42',
  },
  buttonPrimary: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#0e7aca',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    outline: 'none',
  },
  buttonDanger: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#a01c1c',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    outline: 'none',
  },
  buttonSecondary: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#cccccc',
    backgroundColor: '#2d2d30',
    border: '1px solid #454545',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    outline: 'none',
  },
};

