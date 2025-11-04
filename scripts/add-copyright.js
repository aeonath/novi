/**
 * Script to add copyright header to all source files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const COPYRIGHT_HEADER = `/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

`;

const COPYRIGHT_CHECK = '© 2025 MiraNova Studios';

function addCopyrightHeader(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if header already exists
  if (content.includes(COPYRIGHT_CHECK)) {
    console.log(`[Skip] ${filePath} (already has header)`);
    return false;
  }
  
  // Add header at the beginning
  const newContent = COPYRIGHT_HEADER + content;
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`[Add]  ${filePath}`);
  return true;
}

function processFiles() {
  const patterns = [
    'src/**/*.ts',
    'src/**/*.tsx',
    'src/**/*.js',
  ];
  
  let totalAdded = 0;
  let totalSkipped = 0;
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { nodir: true });
    
    files.forEach(file => {
      // Skip declaration files
      if (file.endsWith('.d.ts')) {
        console.log(`[Skip] ${file} (declaration file)`);
        totalSkipped++;
        return;
      }
      
      if (addCopyrightHeader(file)) {
        totalAdded++;
      } else {
        totalSkipped++;
      }
    });
  });
  
  console.log(`\n✓ Complete: ${totalAdded} files updated, ${totalSkipped} files skipped`);
}

processFiles();

