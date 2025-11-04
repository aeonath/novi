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

