/**
 * Copy Monaco Editor assets and workers to dist directory
 * This script runs during the build process
 */

const fs = require('fs');
const path = require('path');

// Source and destination paths
const monacoSrc = path.join(__dirname, '../node_modules/monaco-editor/min/vs');
const monacoDest = path.join(__dirname, '../dist/renderer/vs');

console.log('[copy-monaco] Copying Monaco Editor assets...');
console.log('[copy-monaco] Source:', monacoSrc);
console.log('[copy-monaco] Destination:', monacoDest);

// Recursive copy function
function copyRecursive(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyRecursive(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Copy Monaco files
  copyRecursive(monacoSrc, monacoDest);
  console.log('[copy-monaco] ✓ Monaco Editor assets copied successfully');
} catch (error) {
  console.error('[copy-monaco] ✗ Error copying Monaco assets:', error);
  process.exit(1);
}

