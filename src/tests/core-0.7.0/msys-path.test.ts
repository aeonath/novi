/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

// Re-implement msysToWindows for testing (same logic as main.ts)
function msysToWindows(posixPath: string, gitRoot: string | null): string {
  if (/^[A-Za-z]:/.test(posixPath)) return posixPath;
  if (!posixPath.startsWith('/')) return posixPath;

  const driveMatch = posixPath.match(/^\/([a-zA-Z])(\/.*)?$/);
  if (driveMatch) {
    const drive = driveMatch[1].toUpperCase();
    const rest = (driveMatch[2] || '\\').replace(/\//g, '\\');
    return `${drive}:${rest}`;
  }

  if (gitRoot) {
    if (posixPath === '/') return gitRoot;
    return gitRoot + posixPath.replace(/\//g, '\\');
  }

  return posixPath;
}

describe('MSYS path conversion', () => {
  const gitRoot = 'C:\\Program Files\\Git';

  test('drive letter paths: /c/Work → C:\\Work', () => {
    expect(msysToWindows('/c/Work', gitRoot)).toBe('C:\\Work');
  });

  test('drive letter root: /c/ → C:\\', () => {
    expect(msysToWindows('/c/', gitRoot)).toBe('C:\\');
  });

  test('drive letter bare: /c → C:\\', () => {
    expect(msysToWindows('/c', gitRoot)).toBe('C:\\');
  });

  test('drive letter with deep path: /d/projects/app → D:\\projects\\app', () => {
    expect(msysToWindows('/d/projects/app', gitRoot)).toBe('D:\\projects\\app');
  });

  test('MSYS root: / → Git root', () => {
    expect(msysToWindows('/', gitRoot)).toBe('C:\\Program Files\\Git');
  });

  test('MSYS /usr → Git root\\usr', () => {
    expect(msysToWindows('/usr', gitRoot)).toBe('C:\\Program Files\\Git\\usr');
  });

  test('MSYS /usr/bin → Git root\\usr\\bin', () => {
    expect(msysToWindows('/usr/bin', gitRoot)).toBe('C:\\Program Files\\Git\\usr\\bin');
  });

  test('MSYS /etc → Git root\\etc', () => {
    expect(msysToWindows('/etc', gitRoot)).toBe('C:\\Program Files\\Git\\etc');
  });

  test('MSYS /tmp → Git root\\tmp', () => {
    expect(msysToWindows('/tmp', gitRoot)).toBe('C:\\Program Files\\Git\\tmp');
  });

  test('MSYS /home → Git root\\home', () => {
    expect(msysToWindows('/home', gitRoot)).toBe('C:\\Program Files\\Git\\home');
  });

  test('Windows path passthrough: C:\\Work → C:\\Work', () => {
    expect(msysToWindows('C:\\Work', gitRoot)).toBe('C:\\Work');
  });

  test('non-POSIX passthrough: relative/path → relative/path', () => {
    expect(msysToWindows('relative/path', gitRoot)).toBe('relative/path');
  });

  test('MSYS root without Git root falls through: / → /', () => {
    expect(msysToWindows('/', null)).toBe('/');
  });

  test('MSYS /usr without Git root falls through', () => {
    expect(msysToWindows('/usr', null)).toBe('/usr');
  });

  test('drive letter still works without Git root', () => {
    expect(msysToWindows('/c/Work', null)).toBe('C:\\Work');
  });
});
