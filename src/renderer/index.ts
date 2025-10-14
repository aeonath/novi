// Renderer process entry point
document.addEventListener('DOMContentLoaded', async () => {
  const versionElement = document.getElementById('version');
  
  if (versionElement && window.electronAPI) {
    try {
      const version = await window.electronAPI.getVersion();
      versionElement.textContent = `Version: ${version}`;
    } catch (error) {
      console.error('Failed to get version:', error);
      versionElement.textContent = 'Version: Unknown';
    }
  }
  
  // Example of listening to menu actions
  // If preload is not exposing API yet, skip gracefully
});

// Example function that could be called from the main process
export function handleMenuAction(action: string): void {
  console.log('Handling menu action:', action);
  // Add your menu action handling logic here
}
