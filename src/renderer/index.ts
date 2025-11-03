// Renderer process entry point
import { ActionHUD } from './components/action-hud';
import { createDefaultActions, ActionContext } from './components/actions';

document.addEventListener('DOMContentLoaded', (): void => {
  void (async (): Promise<void> => {
    const versionElement = document.getElementById('version');

    if (versionElement && window.api) {
      try {
        const version = await window.api.getVersion();
        versionElement.textContent = `Version: ${version}`;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to get version:', error);
        versionElement.textContent = 'Version: Unknown';
      }
    }
    if (window.api) {
      const pong = await window.api.ping();
      // eslint-disable-next-line no-console
      console.log('ping ->', pong);
    }

    // Initialize Action HUD
    const actionContext: ActionContext = {
      onOpenFile: () => {
        // eslint-disable-next-line no-console
        console.log('Open File action - will be implemented in Task 6');
      },
      onToggleTheme: () => {
        // eslint-disable-next-line no-console
        console.log('Toggle Theme action - will be implemented in Task 5');
      },
      onOpenSettings: () => {
        // eslint-disable-next-line no-console
        console.log('Settings action - will be implemented in Task 3');
      },
    };

    const actions = createDefaultActions(actionContext);
    // Initialize Action HUD (stored for potential future programmatic access)
    new ActionHUD(actions);

    // Copy Diagnostics button
    const copyDiagnosticsBtn = document.getElementById('copy-diagnostics');
    if (copyDiagnosticsBtn && window.api) {
      copyDiagnosticsBtn.style.display = 'block';
      copyDiagnosticsBtn.addEventListener('click', () => {
        void (async (): Promise<void> => {
          try {
            await window.api.copyDiagnostics();
            // Show feedback
            const originalText = copyDiagnosticsBtn.textContent;
            copyDiagnosticsBtn.textContent = 'Copied!';
            copyDiagnosticsBtn.style.background = '#00cc00';
            setTimeout(() => {
              copyDiagnosticsBtn.textContent = originalText;
              copyDiagnosticsBtn.style.background = '#00d4ff';
            }, 2000);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to copy diagnostics:', error);
          }
        })();
      });
    }
  })();
});

// Renderer error handling: log to main and notify user
window.addEventListener('error', (ev) => {
  if (window.api) {
    const stack = ev.error instanceof Error ? ev.error.stack : undefined;
    window.api.reportError(ev.message ?? 'Unknown renderer error', stack);
  }
  alert('A renderer error occurred. Please check logs for details.');
});

window.addEventListener('unhandledrejection', (ev) => {
  if (window.api) {
    const reason =
      ev.reason instanceof Error ? `${ev.reason.message}\n${ev.reason.stack}` : String(ev.reason);
    window.api.reportError('Unhandled rejection', reason);
  }
  alert('An unexpected error occurred. Please check logs for details.');
});

// Intentionally no exports so this compiles to a plain browser script (no CommonJS wrapper)
