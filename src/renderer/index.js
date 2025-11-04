/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMenuAction = handleMenuAction;
// Renderer process entry point
document.addEventListener('DOMContentLoaded', async () => {
    const versionElement = document.getElementById('version');
    if (versionElement && window.electronAPI) {
        try {
            const version = await window.electronAPI.getVersion();
            versionElement.textContent = `Version: ${version}`;
        }
        catch (error) {
            console.error('Failed to get version:', error);
            versionElement.textContent = 'Version: Unknown';
        }
    }
    // Example of listening to menu actions
    // If preload is not exposing API yet, skip gracefully
});
// Example function that could be called from the main process
function handleMenuAction(action) {
    console.log('Handling menu action:', action);
    // Add your menu action handling logic here
}
