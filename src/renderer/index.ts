// Renderer process entry point
document.addEventListener('DOMContentLoaded', async () => {
  const versionElement = document.getElementById('version');
  
  if (versionElement && window.api) {
    try {
      const version = await window.api.getVersion();
      versionElement.textContent = `Version: ${version}`;
    } catch (error) {
      console.error('Failed to get version:', error);
      versionElement.textContent = 'Version: Unknown';
    }
  }
  if (window.api) {
    const pong = await window.api.ping();
    console.log('ping ->', pong);
  }
  
  // Example of listening to menu actions
  // If preload is not exposing API yet, skip gracefully
});

// Renderer error handling: log to main and notify user
window.addEventListener('error', (ev) => {
  if (window.api) {
    window.api.reportError(ev.message ?? 'Unknown renderer error', ev.error?.stack);
  }
  alert('A renderer error occurred. Please check logs for details.');
});

window.addEventListener('unhandledrejection', (ev) => {
  if (window.api) {
    const reason = ev.reason instanceof Error ? `${ev.reason.message}\n${ev.reason.stack}` : String(ev.reason);
    window.api.reportError('Unhandled rejection', reason);
  }
  alert('An unexpected error occurred. Please check logs for details.');
});

// Intentionally no exports so this compiles to a plain browser script (no CommonJS wrapper)
