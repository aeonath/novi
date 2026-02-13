/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Monaco Editor Initialization
 * Loads Monaco via AMD, then restores our worker factory so TS/JS/HTML/JSON/CSS workers work in Electron.
 */

(function () {
  if (typeof require === 'undefined' || !require.config) {
    console.error('[Monaco] AMD loader not available');
    return;
  }

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

  function resolveWorkerUrl(label) {
    var path = workerPaths[label] || workerPaths.editor;
    var base = typeof location !== 'undefined' && location.href
      ? location.href.replace(/\/[^/]*$/, '/')
      : '';
    try {
      return new URL(path, base).href;
    } catch (e) {
      return base + path;
    }
  }

  function createWorkerBootstrap(scriptUrl) {
    var blob = new Blob([
      "var ttPolicy = (typeof globalThis.trustedTypes !== 'undefined' && globalThis.trustedTypes.createPolicy) ? globalThis.trustedTypes.createPolicy('defaultWorkerFactory', { createScriptURL: function(v) { return v; } }) : null;",
      "globalThis.workerttPolicy = ttPolicy;",
      "importScripts(ttPolicy && ttPolicy.createScriptURL ? ttPolicy.createScriptURL(" + JSON.stringify(scriptUrl) + ") : " + JSON.stringify(scriptUrl) + ");",
      "if (typeof globalThis.postMessage === 'function') globalThis.postMessage({ type: 'vscode-worker-ready' });"
    ], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }

  require(['vs/editor/editor.main'], function () {
    // editor.main overwrote MonacoEnvironment with its own getWorker (using loader's toUrl).
    // In Electron that can fail. Restore our getWorker so workers load with our resolved URLs.
    var base = typeof location !== 'undefined' && location.href ? location.href.replace(/\/[^/]*$/, '/') : '';
    window.MonacoEnvironment = {
      getWorker: function (_moduleId, label) {
        var scriptUrl = resolveWorkerUrl(label);
        console.log('[Monaco] Worker for "' + label + '": ' + scriptUrl);
        var blobUrl = createWorkerBootstrap(scriptUrl);
        try {
          return new Worker(blobUrl, { name: label });
        } catch (e) {
          console.error('[Monaco] Failed to create worker for ' + label, e);
          throw e;
        }
      }
    };
    console.log('[Monaco] AMD modules loaded, editor ready (worker factory restored for Electron)');
  });
})();
