/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

const path = require('path');
const { rcedit } = require('rcedit');

/**
 * afterPack hook for electron-builder.
 * Embeds the app icon into the exe using rcedit directly,
 * since signAndEditExecutable is false (to avoid winCodeSign symlink issues).
 */
module.exports = async function afterPack(context) {
  if (process.platform !== 'win32') {
    return;
  }

  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const ico = path.resolve('build', 'icon.ico');

  try {
    await rcedit(exe, {
      icon: ico,
      'version-string': {
        FileDescription: context.packager.appInfo.productName,
        ProductName: context.packager.appInfo.productName,
        LegalCopyright: context.packager.appInfo.copyright,
      },
      'file-version': context.packager.appInfo.buildVersion,
      'product-version': context.packager.appInfo.buildVersion,
    });
    console.log(`  • icon embedded into ${path.basename(exe)}`);
  } catch (e) {
    console.error(`  ⨯ failed to embed icon: ${e.message}`);
  }
};
