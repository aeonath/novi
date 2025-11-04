/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Monaco Editor AMD Loader Configuration
 * This file must load BEFORE Monaco's loader.js
 */

// Configure AMD loader paths
var require = {
  paths: { 
    'vs': './vs' 
  }
};

console.log('[Monaco Loader] AMD paths configured');

