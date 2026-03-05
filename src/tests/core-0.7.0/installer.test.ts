/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface NsisConfig {
  oneClick?: boolean;
  allowToChangeInstallationDirectory?: boolean;
  createDesktopShortcut?: boolean;
  createStartMenuShortcut?: boolean;
  installerIcon?: string;
  uninstallerIcon?: string;
  installerHeaderIcon?: string;
  shortcutName?: string;
  uninstallDisplayName?: string;
  allowElevation?: boolean;
}

interface PackageJson {
  scripts?: Record<string, string>;
  build?: {
    win?: {
      icon?: string;
      signAndEditExecutable?: boolean;
    };
    nsis?: NsisConfig;
    afterPack?: string;
    extraResources?: Array<{ from: string; to: string }>;
  };
}

describe('Windows Installer Configuration', () => {
  let packageJson: PackageJson;

  beforeAll(() => {
    const raw = readFileSync(join(__dirname, '..', '..', '..', 'package.json'), 'utf-8');
    packageJson = JSON.parse(raw);
  });

  describe('NSIS installer settings', () => {
    it('should have NSIS config with assisted installer (not one-click)', () => {
      expect(packageJson.build?.nsis).toBeDefined();
      expect(packageJson.build?.nsis?.oneClick).toBe(false);
    });

    it('should allow changing installation directory', () => {
      expect(packageJson.build?.nsis?.allowToChangeInstallationDirectory).toBe(true);
    });

    it('should create desktop and start menu shortcuts', () => {
      expect(packageJson.build?.nsis?.createDesktopShortcut).toBe(true);
      expect(packageJson.build?.nsis?.createStartMenuShortcut).toBe(true);
    });

    it('should display as "Novi" in shortcuts and Add/Remove Programs', () => {
      expect(packageJson.build?.nsis?.shortcutName).toBe('Novi');
      expect(packageJson.build?.nsis?.uninstallDisplayName).toBe('Novi');
    });

    it('should allow elevation for install/uninstall', () => {
      expect(packageJson.build?.nsis?.allowElevation).toBe(true);
    });

    it('should use icon.ico for installer icons', () => {
      expect(packageJson.build?.nsis?.installerIcon).toContain('icon.ico');
      expect(packageJson.build?.nsis?.uninstallerIcon).toContain('icon.ico');
    });
  });

  describe('Windows exe icon embedding', () => {
    it('should have signAndEditExecutable disabled (rcedit used via afterPack)', () => {
      expect(packageJson.build?.win?.signAndEditExecutable).toBe(false);
    });

    it('should have an afterPack hook for icon embedding', () => {
      expect(packageJson.build?.afterPack).toBeDefined();
      expect(packageJson.build?.afterPack).toContain('after-pack');
    });

    it('should have after-pack.js script present', () => {
      const afterPackPath = join(__dirname, '..', '..', '..', 'scripts', 'after-pack.js');
      expect(existsSync(afterPackPath)).toBe(true);
    });
  });

  describe('build scripts', () => {
    it('should have pack:win:installer script for NSIS builds', () => {
      expect(packageJson.scripts?.['pack:win:installer']).toBeDefined();
      expect(packageJson.scripts?.['pack:win:installer']).toContain('--win nsis');
    });

    it('should have pack:win script for portable builds', () => {
      expect(packageJson.scripts?.['pack:win']).toBeDefined();
      expect(packageJson.scripts?.['pack:win']).toContain('--win portable');
    });
  });

  describe('extra resources', () => {
    it('should include LICENSE in the install directory', () => {
      expect(packageJson.build?.extraResources).toBeDefined();
      const licenseResource = packageJson.build?.extraResources?.find(
        (r) => r.from === 'LICENSE'
      );
      expect(licenseResource).toBeDefined();
    });
  });

  describe('NSIS custom script', () => {
    it('should have installer.nsh for running app detection', () => {
      const nshPath = join(__dirname, '..', '..', '..', 'build', 'installer.nsh');
      expect(existsSync(nshPath)).toBe(true);
    });

    it('installer.nsh should check for running Novi process', () => {
      const nshPath = join(__dirname, '..', '..', '..', 'build', 'installer.nsh');
      const content = readFileSync(nshPath, 'utf-8');
      expect(content).toContain('customInit');
      expect(content).toContain('customUnInit');
      expect(content).toContain('Novi.exe');
      expect(content).toContain('taskkill');
    });
  });
});
