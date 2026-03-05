/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

// VS Code / Cursor set ELECTRON_RUN_AS_NODE=1 which causes Electron to run as
// plain Node.js. Remove it before spawning the real Electron process.
delete process.env.ELECTRON_RUN_AS_NODE;
delete process.env.ELECTRON_NO_ASAR;

const { spawnSync } = require('child_process');
const electronPath = require('electron');

const result = spawnSync(electronPath, ['./dist/main/main.js'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
