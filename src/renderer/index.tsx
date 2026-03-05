/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Novi Terminal Environment - Main Renderer Entry (React)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App.js';

// Debug logging gate — when debug is off, console.log and console.info become no-ops.
// console.warn and console.error are always active.
const _origLog = console.log.bind(console);
const _origInfo = console.info.bind(console);
const _noop = () => {};

function applyDebugMode(enabled: boolean) {
  console.log = enabled ? _origLog : _noop;
  console.info = enabled ? _origInfo : _noop;
}

// Load debug setting immediately (before React renders)
(async () => {
  try {
    const debug = await window.api.getSetting<boolean>('debug', false);
    applyDebugMode(!!debug);
  } catch {
    // Default: debug off in production
    applyDebugMode(false);
  }
})();

// React to runtime changes from `set debug on/off`
window.addEventListener('novi-debug-changed', ((e: CustomEvent) => {
  applyDebugMode(!!e.detail?.enabled);
}) as EventListener);

_origLog('[Novi] Initializing Novi Terminal Environment v0.7.8...');

// Wait for Monaco to load before initializing
const waitForMonaco = async (): Promise<boolean> => {
  const maxAttempts = 200; // 10 seconds total
  let attempts = 0;

  return new Promise((resolve) => {
    const checkMonaco = () => {
      if (typeof (window as any).monaco !== 'undefined') {
        console.log(`[Novi] Monaco loaded successfully after ${attempts * 50}ms`);
        resolve(true);
        return true;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.warn('[Novi] Monaco failed to load after 10 seconds');
        resolve(false);
        return false;
      }

      return false;
    };

    // Check immediately
    if (!checkMonaco()) {
      const interval = setInterval(() => {
        if (checkMonaco()) {
          clearInterval(interval);
        }
      }, 50);
    }
  });
};

// Initialize app
async function initializeApp() {
  try {
    // Wait for Monaco
    const monacoLoaded = await waitForMonaco();
    if (!monacoLoaded) {
      console.error('[Novi] Proceeding without Monaco editor');
    }

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('[Novi] Root element not found');
    }

    // Render React app
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <App />
    );

    console.log('[Novi] React app rendered successfully');

    // Track last focus time to debounce rapid focus events
    let lastFocusTime = 0;
    
    // Ensure document is always focusable and receives keyboard events
    const ensureFocus = () => {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTime;
      
      // Debounce: Don't process focus events more than once every 200ms
      if (timeSinceLastFocus < 200) {
        console.log('[Renderer] Focus event debounced (too soon)');
        return;
      }
      
      lastFocusTime = now;
      console.log('[Renderer] Window gained focus, focusing active tab');
      
      // Try to focus the active tab (Monaco editor or terminal)
      const tabBarAPI = (window as any).__tabBarAPI;
      const monacoAPI = (window as any).__monacoEditorAPI;
      const terminalAPI = (window as any).__terminalAPI;
      
      if (tabBarAPI) {
        const activeTab = tabBarAPI.getActiveTab();
        if (activeTab) {
          // If it's a terminal tab, focus the terminal
          if (activeTab.type === 'terminal' && terminalAPI && terminalAPI[activeTab.id]) {
            console.log('[Renderer] Focusing terminal:', activeTab.id);
            // Use requestAnimationFrame instead of setTimeout for smoother focus
            requestAnimationFrame(() => {
              if (terminalAPI[activeTab.id]) {
                terminalAPI[activeTab.id].focus();
              }
            });
            return;
          }
          // If it's a file tab, focus Monaco editor
          else if (activeTab.type === 'file' && monacoAPI && monacoAPI.focus) {
            console.log('[Renderer] Focusing Monaco editor');
            // Use requestAnimationFrame instead of setTimeout for smoother focus
            requestAnimationFrame(() => {
              if (monacoAPI && monacoAPI.focus) {
                monacoAPI.focus();
              }
            });
            return;
          }
          // For image and nova-prompt tabs, try to focus Monaco or body as fallback
          else if (activeTab.type === 'image' || activeTab.type === 'novi-prompt') {
            console.log('[Renderer] Active tab is', activeTab.type, '- focusing Monaco or body');
            // Try Monaco first as it may still be visible
            if (monacoAPI && monacoAPI.focus) {
              requestAnimationFrame(() => {
                if (monacoAPI && monacoAPI.focus) {
                  monacoAPI.focus();
                }
              });
              return;
            }
          }
        }
      }
      
      // Fallback: focus body if no active tab
      console.log('[Renderer] No active tab, focusing body');
      if (!document.body.hasAttribute('tabindex')) {
        document.body.setAttribute('tabindex', '-1');
      }
      document.body.focus();
    };
    
    // Focus on window gaining focus (Alt+Tab back)
    window.addEventListener('focus', ensureFocus);
    
    // Focus on window becoming visible (after minimize/restore)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[Renderer] Window became visible');
        ensureFocus();
      }
    });

    // Setup error handlers
    window.addEventListener('error', (ev) => {
      // Ignore Monaco-related errors
      if (
        ev.message?.includes('monaco') ||
        ev.message?.includes('vs/') ||
        ev.filename?.includes('monaco') ||
        ev.filename?.includes('vs/')
      ) {
        console.warn('[Novi] Monaco internal error (handled):', ev.message);
        return;
      }

      console.error('[Novi] Unhandled error:', ev.error);
    });

    window.addEventListener('unhandledrejection', (ev) => {
      // Ignore Monaco-related rejections (including \"Model not found\" from internal worker logic)
      const msg = ev.reason?.message || String(ev.reason || '');
      if (
        msg.includes('monaco') ||
        msg.includes('vs/') ||
        msg.includes('Model not found')
      ) {
        console.warn('[Novi] Monaco rejection (handled):', msg);
        ev.preventDefault?.();
        return;
      }

      console.error('[Novi] Unhandled rejection:', ev.reason);
    });

    console.log('[Novi] Initialization complete');
  } catch (error) {
    console.error('[Novi] Fatal initialization error:', error);
  }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void initializeApp());
} else {
  void initializeApp();
}

