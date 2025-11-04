/**
 * App - Root React component
 * Main layout structure for Nova IDE
 */

import React, { useEffect, useState } from 'react';
import { AppProvider } from '../contexts/AppContext.js';
import { TitleBar } from './TitleBar.js';
import { StatusBar } from './StatusBar.js';
import { TabBar } from './TabBar.js';
import { MonacoEditor } from './MonacoEditor.js';
import { FileTree } from './FileTree.js';
import { ActionHUD } from './ActionHUD.js';
import { SettingsPanel } from './SettingsPanel.js';
import { DiagnosticsPanel } from './DiagnosticsPanel.js';
import { RecoveryDialog } from './RecoveryDialog.js';

export const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [monacoReady, setMonacoReady] = useState(false);

  useEffect(() => {
    // Wait for Monaco to load
    const checkMonaco = () => {
      if (typeof (window as any).monaco !== 'undefined') {
        setMonacoReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkMonaco()) {
      return;
    }

    // Poll if not ready
    const interval = setInterval(() => {
      if (checkMonaco()) {
        clearInterval(interval);
        clearTimeout(timeout);
      }
    }, 50);
    
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.warn('[App] Monaco failed to load after 10s');
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AppProvider>
      <div className="nova-layout" style={styles.layout}>
        <TitleBar />
        
        <div style={styles.mainContent}>
          <aside style={styles.sidebar}>
            <FileTree onFileOpen={() => setShowWelcome(false)} />
          </aside>
          
          <main style={styles.editorArea}>
            <TabBar />
            
            {showWelcome && !monacoReady ? (
              <div style={styles.welcome}>
                <h1>Nova</h1>
                <p>Loading editor...</p>
              </div>
            ) : showWelcome ? (
              <div style={styles.welcome}>
                <h1>Nova</h1>
                <p>Open a file to start editing</p>
                <p style={{ fontSize: '0.9em', opacity: 0.7 }}>
                  Press <kbd>Ctrl+K</kbd> or <kbd>Ctrl+Space</kbd> for commands
                </p>
              </div>
            ) : (
              <MonacoEditor />
            )}
          </main>
        </div>
        
        <StatusBar />
        
        {/* Modal components */}
        <ActionHUD />
        <SettingsPanel />
        <DiagnosticsPanel />
        <RecoveryDialog />
      </div>
    </AppProvider>
  );
};

const styles = {
  layout: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
    color: '#cccccc',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#252526',
    borderRight: '1px solid #3e3e42',
    overflow: 'auto',
  },
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2em',
    textAlign: 'center' as const,
  },
};

