/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PackageJson {
  devDependencies?: Record<string, string>;
  build?: {
    productName?: string;
    appId?: string;
    win?: {
      signAndEditExecutable?: boolean;
      target?: Array<{
        target?: string;
        arch?: string[];
      }>;
    };
    files?: string[];
  };
  scripts?: Record<string, string>;
  version?: string;
  main?: string;
  description?: string;
}

describe('Windows Packaging Configuration', () => {
  let packageJson: PackageJson;

  beforeAll(() => {
    const packageJsonPath = join(process.cwd(), 'package.json');
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  });

  describe('electron-builder Configuration', () => {
    it('should have electron-builder in devDependencies', () => {
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.devDependencies).toHaveProperty('electron-builder');
      expect(packageJson.devDependencies?.['electron-builder']).toBeTruthy();
    });

    it('should have build configuration section', () => {
      expect(packageJson.build).toBeDefined();
      expect(typeof packageJson.build).toBe('object');
    });

    it('should have productName configured as "Novi"', () => {
      expect(packageJson.build?.productName).toBe('Novi');
    });

    it('should have appId configured as "studio.miranova.novi"', () => {
      expect(packageJson.build?.appId).toBe('studio.miranova.novi');
    });

    it('should have Windows target configuration', () => {
      expect(packageJson.build?.win).toBeDefined();
      expect(packageJson.build?.win).toBeInstanceOf(Object);
    });

    it('should have Windows portable target configured', () => {
      expect(packageJson.build?.win?.target).toBeDefined();
      expect(Array.isArray(packageJson.build?.win?.target)).toBe(true);

      const portableTarget = packageJson.build?.win?.target?.find(
        (t) => t?.target === 'portable'
      );
      expect(portableTarget).toBeDefined();
      expect(portableTarget?.arch).toContain('x64');
    });

    it('should have signAndEditExecutable set to false', () => {
      expect(packageJson.build?.win?.signAndEditExecutable).toBe(false);
    });

    it('should include dist/** in files array', () => {
      expect(packageJson.build?.files).toBeDefined();
      expect(Array.isArray(packageJson.build?.files)).toBe(true);
      expect(packageJson.build?.files).toContain('dist/**');
    });

    it('should include package.json in files array', () => {
      expect(packageJson.build?.files).toContain('package.json');
    });
  });

  describe('Packaging Scripts', () => {
    it('should have pack:win script for portable build', () => {
      expect(packageJson.scripts?.['pack:win']).toBeDefined();
      expect(packageJson.scripts?.['pack:win']).toContain('electron-builder');
      expect(packageJson.scripts?.['pack:win']).toContain('--win portable');
    });

    it('should have pack:win:exe script for NSIS installer', () => {
      expect(packageJson.scripts?.['pack:win:exe']).toBeDefined();
      expect(packageJson.scripts?.['pack:win:exe']).toContain('electron-builder');
      expect(packageJson.scripts?.['pack:win:exe']).toContain('--win nsis');
    });

    it('should build before packaging in pack scripts', () => {
      expect(packageJson.scripts?.['pack:win']).toContain('npm run build');
      expect(packageJson.scripts?.['pack:win:exe']).toContain('npm run build');
    });

    it('should disable code signing in pack scripts', () => {
      expect(packageJson.scripts?.['pack:win']).toContain('CSC_IDENTITY_AUTO_DISCOVERY=false');
      expect(packageJson.scripts?.['pack:win']).toContain(
        'ELECTRON_BUILDER_NSIS_SKIP_SIGNING=true'
      );
      expect(packageJson.scripts?.['pack:win:exe']).toContain('CSC_IDENTITY_AUTO_DISCOVERY=false');
      expect(packageJson.scripts?.['pack:win:exe']).toContain(
        'ELECTRON_BUILDER_NSIS_SKIP_SIGNING=true'
      );
    });
  });

  describe('Package Metadata', () => {
    it('should have version defined', () => {
      expect(packageJson.version).toBeDefined();
      expect(typeof packageJson.version).toBe('string');
    });

    it('should have main entry point configured', () => {
      expect(packageJson.main).toBe('dist/main/main.js');
    });

    it('should have description defined', () => {
      expect(packageJson.description).toBeDefined();
      expect(typeof packageJson.description).toBe('string');
    });
  });
});
