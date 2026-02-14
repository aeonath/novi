/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import { parseNoviCommand } from '../../renderer/utils/novi-command';

describe('parseNoviCommand', () => {
  it('returns handled: false for non-novi lines', () => {
    expect(parseNoviCommand('')).toEqual({ handled: false });
    expect(parseNoviCommand('ls')).toEqual({ handled: false });
    expect(parseNoviCommand('novix')).toEqual({ handled: false });
    expect(parseNoviCommand('echo novi')).toEqual({ handled: false });
  });

  it('returns kind: none for "novi" with no args', () => {
    expect(parseNoviCommand('novi')).toEqual({ handled: true, kind: 'none' });
  });

  it('returns kind: settings for "novi -s"', () => {
    expect(parseNoviCommand('novi -s')).toEqual({ handled: true, kind: 'settings' });
  });

  it('returns kind: shell for "novi -c"', () => {
    expect(parseNoviCommand('novi -c')).toEqual({ handled: true, kind: 'shell' });
  });

  it('returns kind: open with path for "novi <path>"', () => {
    expect(parseNoviCommand('novi myfile.py')).toEqual({ handled: true, kind: 'open', path: 'myfile.py' });
    expect(parseNoviCommand('novi src/main.ts')).toEqual({ handled: true, kind: 'open', path: 'src/main.ts' });
    expect(parseNoviCommand('novi  foo.txt')).toEqual({ handled: true, kind: 'open', path: 'foo.txt' });
  });

  it('allows leading and trailing whitespace (e.g. "$        novi        filename.md")', () => {
    expect(parseNoviCommand('   novi   filename.md')).toEqual({ handled: true, kind: 'open', path: 'filename.md' });
    expect(parseNoviCommand('  novi -s  ')).toEqual({ handled: true, kind: 'settings' });
    expect(parseNoviCommand('  novi  ')).toEqual({ handled: true, kind: 'none' });
  });

  it('does not treat -s or -c as path when they are the only arg', () => {
    expect(parseNoviCommand('novi -s')).toEqual({ handled: true, kind: 'settings' });
    expect(parseNoviCommand('novi -c')).toEqual({ handled: true, kind: 'shell' });
  });
});
