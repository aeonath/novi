/**
 * Build script for renderer process using esbuild
 * Bundles React + TypeScript for browser consumption
 */

const esbuild = require('esbuild');
const path = require('path');

async function build() {
  try {
    console.log('[build-renderer] Starting renderer build...');
    
    const fs = require('fs');
    
    await esbuild.build({
      entryPoints: ['src/renderer/index.tsx'],
      bundle: true,
      outfile: 'dist/renderer/index.js',
      platform: 'browser',
      target: 'es2020',
      format: 'iife',
      sourcemap: true,
      external: ['electron'],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.css': 'css',
      },
      jsx: 'automatic',
      jsxImportSource: 'react',
    });
    
    // Copy xterm.css to dist
    const xtermCssSource = path.join(__dirname, '..', 'node_modules', '@xterm', 'xterm', 'css', 'xterm.css');
    const xtermCssDest = path.join(__dirname, '..', 'dist', 'renderer', 'xterm.css');
    
    if (fs.existsSync(xtermCssSource)) {
      fs.copyFileSync(xtermCssSource, xtermCssDest);
      console.log('[build-renderer] ✓ xterm.css copied');
    }

    console.log('[build-renderer] ✓ Renderer bundle created successfully');
  } catch (error) {
    console.error('[build-renderer] Build failed:', error);
    process.exit(1);
  }
}

build();

