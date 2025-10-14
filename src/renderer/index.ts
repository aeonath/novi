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

// Intentionally no exports so this compiles to a plain browser script (no CommonJS wrapper)
