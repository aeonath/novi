/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Nova IDE - Main Renderer Entry (React)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App.js';

console.log('[Nova] Initializing Nova IDE v0.4.0 with React...');

// Wait for Monaco to load before initializing
const waitForMonaco = async (): Promise<boolean> => {
  const maxAttempts = 200; // 10 seconds total
  let attempts = 0;

  return new Promise((resolve) => {
    const checkMonaco = () => {
      if (typeof (window as any).monaco !== 'undefined') {
        console.log(`[Nova] Monaco loaded successfully after ${attempts * 50}ms`);
        resolve(true);
        return true;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.warn('[Nova] Monaco failed to load after 10 seconds');
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
      console.error('[Nova] Proceeding without Monaco editor');
    }

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('[Nova] Root element not found');
    }

    // Render React app
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log('[Nova] React app rendered successfully');

    // Ensure document is always focusable and receives keyboard events
    const ensureFocus = () => {
      console.log('[Renderer] Ensuring keyboard focus');
      // Ensure body is focusable
      if (!document.body.hasAttribute('tabindex')) {
        document.body.setAttribute('tabindex', '-1');
      }
      // Focus body immediately and again after a short delay
      document.body.focus();
      setTimeout(() => {
        document.body.focus();
        console.log('[Renderer] Body focused, Ctrl+K should work now');
      }, 50);
    };
    
    // Focus on window gaining focus
    window.addEventListener('focus', ensureFocus);
    
    // Focus on window becoming visible (after minimize/restore)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[Renderer] Window became visible');
        ensureFocus();
      }
    });

    // Trigger focus handler immediately on startup
    ensureFocus();

    // Setup error handlers
    window.addEventListener('error', (ev) => {
      // Ignore Monaco-related errors
      if (
        ev.message?.includes('monaco') ||
        ev.message?.includes('vs/') ||
        ev.filename?.includes('monaco') ||
        ev.filename?.includes('vs/')
      ) {
        console.warn('[Nova] Monaco internal error (handled):', ev.message);
        return;
      }

      console.error('[Nova] Unhandled error:', ev.error);
    });

    window.addEventListener('unhandledrejection', (ev) => {
      // Ignore Monaco-related rejections
      if (
        ev.reason?.message?.includes('monaco') ||
        ev.reason?.message?.includes('vs/')
      ) {
        console.warn('[Nova] Monaco rejection (handled):', ev.reason);
        return;
      }

      console.error('[Nova] Unhandled rejection:', ev.reason);
    });

    console.log('[Nova] Initialization complete');
  } catch (error) {
    console.error('[Nova] Fatal initialization error:', error);
  }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void initializeApp());
} else {
  void initializeApp();
}

