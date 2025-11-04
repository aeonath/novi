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

