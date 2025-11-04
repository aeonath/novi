/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Monaco Editor Initialization
 * This file loads Monaco modules via AMD
 */

// Load Monaco editor modules
if (typeof require !== 'undefined' && require.config) {
  require(['vs/editor/editor.main'], function() {
    console.log('[Monaco] AMD modules loaded, editor ready');
    // Monaco is now available as global 'monaco'
  });
} else {
  console.error('[Monaco] AMD loader not available');
}

