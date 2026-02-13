/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Monaco Editor AMD Loader Configuration
 * This file must load BEFORE Monaco's loader.js
 * Sets up both AMD baseUrl and MonacoEnvironment for workers
 */

(function () {
  // Use page location so lazy-loaded language chunks (vs/shell-*.js, vs/markdown-*.js) resolve correctly
  var baseUrl = typeof location !== 'undefined' ? location.href.replace(/\/[^/]*$/, '/') : '';
  window.require = {
    baseUrl: baseUrl,
    paths: { 'vs': 'vs' }
  };
  
  // Set up Monaco environment for web workers BEFORE Monaco loads
  // Required for TypeScript, JavaScript, JSON, HTML, CSS syntax highlighting in Electron
  var workerPaths = {
    json: './vs/assets/json.worker-DghZTZS7.js',
    css: './vs/assets/css.worker-cO8rX8Iy.js',
    scss: './vs/assets/css.worker-cO8rX8Iy.js',
    less: './vs/assets/css.worker-cO8rX8Iy.js',
    html: './vs/assets/html.worker-BruuIJkK.js',
    handlebars: './vs/assets/html.worker-BruuIJkK.js',
    razor: './vs/assets/html.worker-BruuIJkK.js',
    typescript: './vs/assets/ts.worker-C4E4vgbE.js',
    javascript: './vs/assets/ts.worker-C4E4vgbE.js',
    editor: './vs/assets/editor.worker-DM0G1eFj.js'
  };
  
  window.MonacoEnvironment = {
    getWorkerUrl: function(_moduleId, label) {
      var workerPath = workerPaths[label] || './vs/assets/editor.worker-DM0G1eFj.js';
      console.log('[monaco-loader] Worker requested for "' + label + '": ' + workerPath);
      return workerPath;
    }
  };
  
  console.log('[monaco-loader] AMD and MonacoEnvironment configured');
})();

