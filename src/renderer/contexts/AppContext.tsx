/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * AppContext - Global application state
 * Provides shared state for theme, active file, git status, and agent mode
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { GitStatus } from '../../types/global';

export interface Theme {
  name: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
}

export interface AppState {
  // Theme
  theme: Theme | null;
  setTheme: (theme: Theme) => void;
  
  // Active file
  activeFilePath: string | null;
  setActiveFilePath: (path: string | null) => void;
  
  // Git status
  gitStatus: GitStatus | null;
  setGitStatus: (status: GitStatus | null) => void;
  
  // Agent mode (future use)
  agentMode: boolean;
  setAgentMode: (enabled: boolean) => void;
  
  // Workspace root
  workspaceRoot: string | null;
  setWorkspaceRoot: (path: string | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [agentMode, setAgentMode] = useState<boolean>(false);
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);

  const value: AppState = {
    theme,
    setTheme: useCallback((t: Theme) => setTheme(t), []),
    activeFilePath,
    setActiveFilePath: useCallback((p: string | null) => setActiveFilePath(p), []),
    gitStatus,
    setGitStatus: useCallback((s: GitStatus | null) => setGitStatus(s), []),
    agentMode,
    setAgentMode: useCallback((enabled: boolean) => setAgentMode(enabled), []),
    workspaceRoot,
    setWorkspaceRoot: useCallback((p: string | null) => setWorkspaceRoot(p), []),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppState => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

