/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * GitPanel - Git source control panel (React)
 * Shows Git status, staged/unstaged files, and commit/push/pull controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { GitStatus, GitFileStatus } from '../../types/global';

// Debug flag - set to true to enable verbose git operation logging
const DEBUG_GIT_OPERATIONS = false;

export interface GitPanelProps {
  workspaceRoot: string | null;
  onRefreshStatus?: () => void;
  onToggleFiles?: () => void;
}

export const GitPanel: React.FC<GitPanelProps> = ({ workspaceRoot, onRefreshStatus, onToggleFiles }) => {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsCredentials, setNeedsCredentials] = useState(false);
  const [credentialInput, setCredentialInput] = useState('');
  const [credentialPrompt, setCredentialPrompt] = useState('');
  const [currentCredentialRequest, setCurrentCredentialRequest] = useState<any>(null);

  const refreshStatus = useCallback(async () => {
    if (!workspaceRoot || !window.api?.gitManualRefresh) return;

    try {
      // Quietly fetch git status - event-driven updates happen frequently
      const status = await window.api.gitManualRefresh(workspaceRoot);
      setGitStatus(status);
      setError(null);
      onRefreshStatus?.();
    } catch (err) {
      console.error('[GitPanel] Failed to get status:', err);
      setError('Failed to get Git status');
    }
  }, [workspaceRoot, onRefreshStatus]);

  // Event-driven git monitoring - NO POLLING
  useEffect(() => {
    if (!workspaceRoot || !window.api?.gitStartWatching || !window.api?.gitOnChange) return;
    // Don't start git watch at drive root (C:\, D:\) - not a repo and causes EPERM
    const normalized = workspaceRoot.replace(/\\/g, '/');
    if (/^[A-Za-z]:\/?$/.test(normalized)) return;

    if (DEBUG_GIT_OPERATIONS) {
      console.log('[GitPanel] Starting event-driven Git monitoring for:', workspaceRoot);
    }
    
    // Defer git watcher initialization slightly to avoid flash on startup
    // This ensures all components are fully mounted before we start watching
    const initTimer = setTimeout(() => {
      // Start watching the repository for file changes
      window.api.gitStartWatching(workspaceRoot).catch((err) => {
        console.error('[GitPanel] Failed to start git watcher:', err);
      });
      
      // Initial status fetch
      refreshStatus();
    }, 100); // Small delay to ensure smooth startup
    
    // Listen for file change events
    const handleGitChange = (event: { type: string; path: string }) => {
      if (DEBUG_GIT_OPERATIONS) {
        console.log('[GitPanel] Change detected:', event.type, '-', event.path);
      }
      // Call refreshStatus directly to avoid closure issues
      if (workspaceRoot && window.api?.gitManualRefresh) {
        window.api.gitManualRefresh(workspaceRoot)
          .then(status => {
            setGitStatus(status);
            setError(null);
            onRefreshStatus?.();
          })
          .catch(err => {
            console.error('[GitPanel] Failed to get status:', err);
            setError('Failed to get Git status');
          });
      }
    };
    
    window.api.gitOnChange(handleGitChange);
    
    return () => {
      clearTimeout(initTimer);
      if (DEBUG_GIT_OPERATIONS) {
        console.log('[GitPanel] Cleaning up Git watcher');
      }
      window.api?.gitRemoveChangeListener?.();
      window.api?.gitStopWatching?.().catch((err) => {
        console.error('[GitPanel] Failed to stop git watcher:', err);
      });
    };
    // Only depend on workspaceRoot to prevent re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceRoot]);

  // Listen for credential requests from git operations
  useEffect(() => {
    if (!window.api?.gitOnCredentialRequest || !window.api?.gitRemoveCredentialListener) return;

    const handleCredentialRequest = (request: any) => {
      console.log('[GitPanel] Credential request received:', request);
      setCurrentCredentialRequest(request);
      setCredentialPrompt(request.prompt);
      setNeedsCredentials(true);
      setCredentialInput('');
      setError(null);
      setSuccess(null);
    };

    window.api.gitOnCredentialRequest(handleCredentialRequest);

    return () => {
      window.api?.gitRemoveCredentialListener?.();
    };
  }, []);

  // Handle credential submission
  const handleCredentialSubmit = useCallback(async () => {
    if (!credentialInput.trim() || !window.api?.gitProvideCredentials) return;

    const response = {
      password: credentialInput,
      cancelled: false,
    };

    try {
      await window.api.gitProvideCredentials(response);
      console.log('[GitPanel] Credentials submitted');
    } catch (err) {
      console.error('[GitPanel] Failed to submit credentials:', err);
    }

    // Clear the form
    setNeedsCredentials(false);
    setCredentialInput('');
    setCurrentCredentialRequest(null);
  }, [credentialInput]);

  // Handle credential cancellation
  const handleCredentialCancel = useCallback(async () => {
    if (!window.api?.gitProvideCredentials) return;

    const response = {
      cancelled: true,
    };

    try {
      await window.api.gitProvideCredentials(response);
      console.log('[GitPanel] Credentials cancelled');
    } catch (err) {
      console.error('[GitPanel] Failed to cancel credentials:', err);
    }

    setNeedsCredentials(false);
    setCredentialInput('');
    setCurrentCredentialRequest(null);
    setError('Authentication cancelled');
    setTimeout(() => setError(null), 3000);
  }, []);

  const handleStageFile = useCallback(async (filePath: string) => {
    if (!workspaceRoot || !window.api?.gitStageFile) return;

    try {
      await window.api.gitStageFile(workspaceRoot, filePath);
      await refreshStatus();
    } catch (err) {
      console.error('[GitPanel] Failed to stage file:', err);
      setError('Failed to stage file');
    }
  }, [workspaceRoot, refreshStatus]);

  const handleUnstageFile = useCallback(async (filePath: string) => {
    if (!workspaceRoot || !window.api?.gitUnstageFile) return;

    try {
      await window.api.gitUnstageFile(workspaceRoot, filePath);
      await refreshStatus();
    } catch (err) {
      console.error('[GitPanel] Failed to unstage file:', err);
      setError('Failed to unstage file');
    }
  }, [workspaceRoot, refreshStatus]);

  const handleCommit = useCallback(async () => {
    if (!workspaceRoot || !window.api?.gitCommit) return;

    setIsCommitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Commit message is optional - use empty string if not provided
      const message = commitMessage.trim();
      const result = await window.api.gitCommit(workspaceRoot, message);
      if (result.success) {
        setSuccess('Committed successfully');
        setCommitMessage('');
        await refreshStatus();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Commit failed');
      }
    } catch (err) {
      console.error('[GitPanel] Failed to commit:', err);
      setError('Failed to commit changes');
    } finally {
      setIsCommitting(false);
    }
  }, [workspaceRoot, commitMessage, refreshStatus]);

  const handlePush = useCallback(async () => {
    if (!workspaceRoot || !window.api?.gitPush) return;

    setIsPushing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.api.gitPush(workspaceRoot);
      if (result.success) {
        setSuccess('Pushed successfully');
        // Force refresh to update ahead/behind counts
        await refreshStatus();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Push failed');
      }
    } catch (err) {
      console.error('[GitPanel] Failed to push:', err);
      setError('Failed to push changes');
    } finally {
      setIsPushing(false);
    }
  }, [workspaceRoot, refreshStatus]);

  const handlePull = useCallback(async () => {
    if (!workspaceRoot || !window.api?.gitPull) return;

    setIsPulling(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.api.gitPull(workspaceRoot);
      if (result.success) {
        setSuccess('Pulled successfully');
        // Force refresh to update ahead/behind counts
        await refreshStatus();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Pull failed');
      }
    } catch (err) {
      console.error('[GitPanel] Failed to pull:', err);
      setError('Failed to pull changes');
    } finally {
      setIsPulling(false);
    }
  }, [workspaceRoot, refreshStatus]);

  if (!workspaceRoot) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p>No workspace open</p>
          <p style={styles.subtitle}>Open a folder to see Git status</p>
        </div>
      </div>
    );
  }

  if (!gitStatus) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p>Loading Git status...</p>
        </div>
      </div>
    );
  }

  if (!gitStatus.isRepo) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p>Not a Git repository</p>
          <p style={styles.subtitle}>Initialize Git to track changes</p>
        </div>
      </div>
    );
  }

  const stagedFiles = gitStatus.files.filter((f) => f.staged);
  const unstagedFiles = gitStatus.files.filter((f) => !f.staged);

  return (
    <div style={styles.container}>
      {/* Header with branch info */}
      <div style={styles.header}>
        <div style={styles.branchInfo}>
          <span style={styles.branchIcon}>⎇</span>
          <span style={styles.branchName}>{gitStatus.branch || 'detached'}</span>
          {gitStatus.ahead > 0 && <span style={styles.badge}>↑{gitStatus.ahead}</span>}
          {gitStatus.behind > 0 && <span style={styles.badge}>↓{gitStatus.behind}</span>}
        </div>
        <div style={styles.headerButtons}>
          <button style={styles.refreshButton} onClick={refreshStatus} title="Refresh">
            ⟳
          </button>
          {onToggleFiles && (
            <button style={styles.refreshButton} onClick={onToggleFiles} title="Show Files">
              ←
            </button>
          )}
        </div>
      </div>

      {/* Commit section */}
      <div style={styles.commitSection}>
        <textarea
          style={styles.commitInput}
          placeholder="Commit message (optional)..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          disabled={isCommitting || stagedFiles.length === 0}
        />
        <div style={styles.commitActions}>
          <button
            style={{
              ...styles.button,
              ...styles.commitButton,
              ...(isCommitting || stagedFiles.length === 0
                ? styles.buttonDisabled
                : {}),
            }}
            onClick={handleCommit}
            disabled={isCommitting || stagedFiles.length === 0}
          >
            {isCommitting ? 'Committing...' : `Commit (${stagedFiles.length})`}
          </button>
          <button
            style={{
              ...styles.button,
              ...(isPushing || gitStatus.ahead === 0 ? styles.buttonDisabled : {}),
            }}
            onClick={handlePush}
            disabled={isPushing || gitStatus.ahead === 0}
            title={gitStatus.ahead === 0 ? 'No commits to push' : 'Push'}
          >
            {isPushing ? '...' : `↑ Push${gitStatus.ahead > 0 ? ` (${gitStatus.ahead})` : ''}`}
          </button>
          <button
            style={{
              ...styles.button,
              ...(isPulling || gitStatus.behind === 0 ? styles.buttonDisabled : {}),
            }}
            onClick={handlePull}
            disabled={isPulling || gitStatus.behind === 0}
            title={gitStatus.behind === 0 ? 'No commits to pull' : 'Pull'}
          >
            {isPulling ? '...' : `↓ Pull${gitStatus.behind > 0 ? ` (${gitStatus.behind})` : ''}`}
          </button>
        </div>
        
        {/* Status messages - Fixed position below commit actions */}
        <div style={styles.statusMessageContainer}>
          {needsCredentials ? (
            <div style={styles.credentialInputContainer}>
              <div style={styles.credentialPrompt}>{credentialPrompt}</div>
              <input
                type="password"
                style={styles.credentialInput}
                placeholder="Password or Personal Access Token"
                value={credentialInput}
                onChange={(e) => setCredentialInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleCredentialSubmit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCredentialCancel();
                  }
                }}
                autoFocus
              />
              <div style={styles.credentialHint}>Press Enter to submit, Escape to cancel</div>
            </div>
          ) : error ? (
            <div style={styles.errorMessage}>{error}</div>
          ) : success ? (
            <div style={styles.successMessage}>{success}</div>
          ) : (
            <div style={styles.placeholder}>&nbsp;</div>
          )}
        </div>
      </div>

      {/* Files list */}
      <div style={styles.filesList}>
        {stagedFiles.length > 0 && (
          <div style={styles.fileSection}>
            <div style={styles.sectionTitle}>STAGED CHANGES ({stagedFiles.length})</div>
            {stagedFiles.map((file) => (
              <GitFileItem
                key={file.path}
                file={file}
                onAction={() => handleUnstageFile(file.path)}
                actionLabel="−"
                actionTitle="Unstage"
              />
            ))}
          </div>
        )}

        {unstagedFiles.length > 0 && (
          <div style={styles.fileSection}>
            <div style={styles.sectionTitle}>CHANGES ({unstagedFiles.length})</div>
            {unstagedFiles.map((file) => (
              <GitFileItem
                key={file.path}
                file={file}
                onAction={() => handleStageFile(file.path)}
                actionLabel="+"
                actionTitle="Stage"
              />
            ))}
          </div>
        )}

        {gitStatus.files.length === 0 && (
          <div style={styles.noChanges}>
            <p>No changes</p>
            <p style={styles.subtitle}>Working tree is clean</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface GitFileItemProps {
  file: GitFileStatus;
  onAction: () => void;
  actionLabel: string;
  actionTitle: string;
}

const GitFileItem: React.FC<GitFileItemProps> = ({ file, onAction, actionLabel, actionTitle }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusIcon = (status: GitFileStatus['status']) => {
    switch (status) {
      case 'modified':
        return 'M';
      case 'added':
        return 'A';
      case 'deleted':
        return 'D';
      case 'renamed':
        return 'R';
      case 'untracked':
        return 'U';
      default:
        return '?';
    }
  };

  const getStatusColor = (status: GitFileStatus['status']) => {
    switch (status) {
      case 'modified':
        return '#e2c08d';
      case 'added':
        return '#73c991';
      case 'deleted':
        return '#f48771';
      case 'renamed':
        return '#4fc1ff';
      case 'untracked':
        return '#808080';
      default:
        return '#cccccc';
    }
  };

  return (
    <div
        style={{
          ...styles.fileItem,
          backgroundColor: isHovered ? '#2a2d2e' : 'transparent',
        }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={{ ...styles.statusIcon, color: getStatusColor(file.status) }}>
        {getStatusIcon(file.status)}
      </span>
      <span style={styles.fileName}>{file.path}</span>
      <button style={styles.actionButton} onClick={onAction} title={actionTitle}>
        {actionLabel}
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#252526',
    color: '#cccccc',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '35px',
    padding: '0 12px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3e3e42',
  },
  branchInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
  },
  headerButtons: {
    display: 'flex',
    gap: '4px',
  },
  branchIcon: {
    fontSize: '14px',
  },
  branchName: {
    fontWeight: 600,
  },
  badge: {
    padding: '2px 6px',
    backgroundColor: '#3e3e42',
    borderRadius: '10px',
    fontSize: '11px',
  },
  refreshButton: {
    background: 'none',
    border: 'none',
    color: '#cccccc',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '20px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '12px',
    color: '#808080',
    marginTop: '8px',
  },
  commitSection: {
    padding: '16px',
    paddingTop: '20px',
    borderBottom: '1px solid #3e3e42',
  },
  commitInput: {
    width: '100%',
    minHeight: '60px',
    padding: '10px',
    backgroundColor: '#1e1e1e',
    color: '#cccccc',
    border: '1px solid #3e3e42',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'inherit',
    resize: 'none' as const,
    marginBottom: '8px',
    marginTop: '4px',
    boxSizing: 'border-box' as const,
  },
  commitActions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  button: {
    padding: '6px 12px',
    backgroundColor: '#0e639c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  commitButton: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  statusMessageContainer: {
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
  },
  errorMessage: {
    width: '100%',
    padding: '8px 0',
    backgroundColor: '#5a1d1d',
    color: '#f48771',
    fontSize: '12px',
    textAlign: 'center' as const,
  },
  successMessage: {
    width: '100%',
    padding: '8px 0',
    backgroundColor: '#1e5c1e',
    color: '#73c991',
    fontSize: '12px',
    textAlign: 'center' as const,
  },
  placeholder: {
    width: '100%',
    padding: '8px 0',
    fontSize: '12px',
    visibility: 'hidden' as const,
  },
  credentialInputContainer: {
    width: '100%',
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  credentialPrompt: {
    fontSize: '11px',
    color: '#cccccc',
    textAlign: 'center' as const,
  },
  credentialInput: {
    width: '100%',
    padding: '6px 8px',
    backgroundColor: '#1e1e1e',
    color: '#cccccc',
    border: '1px solid #007acc',
    borderRadius: '3px',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  credentialHint: {
    fontSize: '10px',
    color: '#808080',
    textAlign: 'center' as const,
  },
  filesList: {
    flex: 1,
    overflow: 'auto',
  } as React.CSSProperties & { WebkitOverflowScrolling?: string },
  fileSection: {
    marginTop: '12px',
  },
  sectionTitle: {
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#808080',
    textTransform: 'uppercase' as const,
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  statusIcon: {
    width: '20px',
    fontWeight: 600,
    marginRight: '8px',
  },
  fileName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  actionButton: {
    background: 'none',
    border: 'none',
    color: '#cccccc',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '2px 8px',
    opacity: 0.7,
  },
  noChanges: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center' as const,
  },
};

