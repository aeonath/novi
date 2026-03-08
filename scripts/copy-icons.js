/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = path.resolve('build');
const iconsDir = path.join(buildDir, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const appIcon = path.resolve('src/renderer/assets/icon.png');
const installerIcon = path.resolve('src/renderer/assets/miranova_icon.png');

// Copy app icon PNG
fs.copyFileSync(appIcon, path.join(buildDir, 'icon.png'));

const isLinux = process.platform === 'linux';

if (isLinux) {
  // Generate Linux icon sizes with sharp
  const sharp = require('sharp');
  const sizes = [16, 32, 48, 64, 128, 256, 512];
  Promise.all(
    sizes.map(s =>
      sharp(appIcon)
        .resize(s, s)
        .png()
        .toFile(path.join(iconsDir, `${s}x${s}.png`))
        .then(() => console.log(`Generated icons/${s}x${s}.png`))
    )
  ).then(() => console.log('All Linux icon sizes generated'))
   .catch(e => console.error('Failed to generate Linux icon sizes: ' + e.message));
} else {
  // Generate app .ico (for Windows exe)
  try {
    execSync(`npx --yes png-to-ico "${appIcon}" > "${path.join(buildDir, 'icon.ico')}"`, { shell: true });
    console.log('Generated build/icon.ico');
  } catch (e) {
    console.log('Failed to generate icon.ico: ' + e.message);
  }
}

// Generate installer .ico from miranova icon (Windows only, needs to be square)
if (!isLinux) try {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (_) {
    // Try loading from temp install location
    const tmpSharp = path.join(require('os').tmpdir(), 'icongen', 'node_modules', 'sharp');
    sharp = require(tmpSharp);
  }
  sharp(installerIcon)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
    .then(buf => {
      const squarePath = path.join(buildDir, 'installer-icon-square.png');
      fs.writeFileSync(squarePath, buf);
      execSync(`npx --yes png-to-ico "${squarePath}" > "${path.join(buildDir, 'installer-icon.ico')}"`, { shell: true });
      console.log('Generated build/installer-icon.ico');
    })
    .catch(e => console.log('Failed to generate installer-icon.ico: ' + e.message));
} catch (e) {
  // Fallback: if sharp is unavailable and installer-icon.ico already exists, skip
  if (fs.existsSync(path.join(buildDir, 'installer-icon.ico'))) {
    console.log('Using existing build/installer-icon.ico (sharp not available)');
  } else {
    console.log('Cannot generate installer-icon.ico — sharp not available. Run: cd /tmp/icongen && npm install sharp');
  }
} // end !isLinux
