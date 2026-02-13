/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Unit tests for vimode setting (Sprint 6 Task 3).
 * Covers getSetting/setSetting for 'vimode' and default-on behavior.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { getSetting, setSetting, getSettingsFilePath } from '../../main/settings';

describe('vimode setting (core-0.6.0)', () => {
  let originalSettingsPath: string;
  let testSettingsBackup: string | null = null;

  beforeAll(() => {
    originalSettingsPath = getSettingsFilePath();
    if (existsSync(originalSettingsPath)) {
      testSettingsBackup = readFileSync(originalSettingsPath, 'utf-8');
    }
  });

  beforeEach(() => {
    if (existsSync(originalSettingsPath)) {
      unlinkSync(originalSettingsPath);
    }
  });

  afterAll(() => {
    if (existsSync(originalSettingsPath)) {
      unlinkSync(originalSettingsPath);
    }
    if (testSettingsBackup) {
      writeFileSync(originalSettingsPath, testSettingsBackup, 'utf-8');
    }
  });

  describe('getSetting default', () => {
    it('should return true when vimode is unset and default true is provided', () => {
      const value = getSetting<boolean>('vimode', true);
      expect(value).toBe(true);
    });

    it('should return false when vimode is unset and default false is provided', () => {
      const value = getSetting<boolean>('vimode', false);
      expect(value).toBe(false);
    });
  });

  describe('setSetting and getSetting round-trip', () => {
    it('should persist vimode on (true)', () => {
      setSetting('vimode', true);
      const value = getSetting<boolean>('vimode', false);
      expect(value).toBe(true);
    });

    it('should persist vimode off (false)', () => {
      setSetting('vimode', false);
      const value = getSetting<boolean>('vimode', true);
      expect(value).toBe(false);
    });

    it('should override vimode from on to off', () => {
      setSetting('vimode', true);
      expect(getSetting<boolean>('vimode', false)).toBe(true);
      setSetting('vimode', false);
      expect(getSetting<boolean>('vimode', true)).toBe(false);
    });

    it('should override vimode from off to on', () => {
      setSetting('vimode', false);
      expect(getSetting<boolean>('vimode', true)).toBe(false);
      setSetting('vimode', true);
      expect(getSetting<boolean>('vimode', false)).toBe(true);
    });
  });

  describe('compat setting (Sprint 6 Task 5)', () => {
    it('should return false when compat is unset and default false is provided', () => {
      const value = getSetting<boolean>('compat', false);
      expect(value).toBe(false);
    });

    it('should persist compat on and off', () => {
      setSetting('compat', true);
      expect(getSetting<boolean>('compat', false)).toBe(true);
      setSetting('compat', false);
      expect(getSetting<boolean>('compat', true)).toBe(false);
    });
  });

  describe('singlefiletree setting (Sprint 6 Task 7)', () => {
    it('should return false when singlefiletree is unset and default false is provided', () => {
      const value = getSetting<boolean>('singlefiletree', false);
      expect(value).toBe(false);
    });

    it('should persist singlefiletree on and off', () => {
      setSetting('singlefiletree', true);
      expect(getSetting<boolean>('singlefiletree', false)).toBe(true);
      setSetting('singlefiletree', false);
      expect(getSetting<boolean>('singlefiletree', true)).toBe(false);
    });
  });
});
