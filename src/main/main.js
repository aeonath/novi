/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = require("node:path");
// Set NODE_ENV for development (not used for branching, kept for future use)
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: (0, node_path_1.join)(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    // Always load local built HTML file
    mainWindow.loadFile((0, node_path_1.join)(__dirname, '../renderer/index.html'));
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
