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

