/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Unit tests for SshTitleTracker
 */

import { SshTitleTracker } from '../../main/services/ssh-title-tracker';
import { readFileSync } from 'fs';
import { userInfo, homedir } from 'os';

jest.mock('fs');
jest.mock('os');

describe('SshTitleTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userInfo as jest.Mock).mockReturnValue({ username: 'localuser' });
    (homedir as jest.Mock).mockReturnValue('/home/testuser');
    // No ~/.ssh/config by default
    (readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('ENOENT');
    });
  });

  function type(tracker: SshTitleTracker, line: string) {
    return tracker.feed(`${line}\n`);
  }

  describe('command detection', () => {
    it('does nothing for unrelated input', () => {
      const tracker = new SshTitleTracker();
      expect(tracker.feed('ls -la\r\n')).toBeNull();
      expect(tracker.isActive).toBe(false);
    });

    it('ignores commands that merely start with "ssh" (e.g. sshfs)', () => {
      const tracker = new SshTitleTracker();
      expect(type(tracker, 'sshfs user@host:/ /mnt')).toBeNull();
      expect(tracker.isActive).toBe(false);
    });

    it('ignores bare ssh with no destination', () => {
      const tracker = new SshTitleTracker();
      expect(type(tracker, 'ssh')).toBeNull();
      expect(tracker.isActive).toBe(false);
    });

    it('falls back to the local username when there is no config match', () => {
      const tracker = new SshTitleTracker();
      const event = type(tracker, 'ssh astra');
      expect(event).toEqual({ type: 'title', value: 'localuser@astra' });
      expect(tracker.isActive).toBe(true);
    });

    it('uses an explicit user@host from the command line', () => {
      const tracker = new SshTitleTracker();
      const event = type(tracker, 'ssh admin@astra');
      expect(event).toEqual({ type: 'title', value: 'admin@astra' });
    });

    it('uses -l <user> from the command line', () => {
      const tracker = new SshTitleTracker();
      const event = type(tracker, 'ssh -l root astra');
      expect(event).toEqual({ type: 'title', value: 'root@astra' });
    });

    it('skips flag values (e.g. -p 2222) when finding the destination', () => {
      const tracker = new SshTitleTracker();
      const event = type(tracker, 'ssh -p 2222 astra');
      expect(event).toEqual({ type: 'title', value: 'localuser@astra' });
    });

    it('ignores a trailing remote command and only uses the destination', () => {
      const tracker = new SshTitleTracker();
      const event = type(tracker, 'ssh astra ls -la');
      expect(event).toEqual({ type: 'title', value: 'localuser@astra' });
    });

    it('picks up the User directive from a matching ~/.ssh/config Host block', () => {
      (readFileSync as jest.Mock).mockReturnValue(
        'Host astra\n  HostName 10.0.0.5\n  User admin\n\nHost other\n  User nobody\n'
      );
      const tracker = new SshTitleTracker();
      const event = type(tracker, 'ssh astra');
      expect(event).toEqual({ type: 'title', value: 'admin@astra' });
    });

    it('honors an explicit user over the config User directive', () => {
      (readFileSync as jest.Mock).mockReturnValue('Host astra\n  User admin\n');
      const tracker = new SshTitleTracker();
      const event = type(tracker, 'ssh root@astra');
      expect(event).toEqual({ type: 'title', value: 'root@astra' });
    });

    it('respects backspaces when reconstructing the typed line', () => {
      const tracker = new SshTitleTracker();
      // User typed "ssh wrongtarget", backspaced it all, then typed "ssh astra"
      const wrong = 'ssh wrongtarget';
      let event = null;
      for (const ch of wrong) event = tracker.feed(ch);
      expect(event).toBeNull();
      for (let i = 0; i < wrong.length; i++) tracker.feed('\x7f');
      for (const ch of 'ssh astra') event = tracker.feed(ch);
      event = tracker.feed('\n');
      expect(event).toEqual({ type: 'title', value: 'localuser@astra' });
    });

    it('finds the typed command even when a no-newline custom prompt is glued to the front of the line', () => {
      // Regression: a prompt like "user@host:dir : " has no trailing newline of its
      // own, so it ends up sharing the line buffer with whatever gets typed next.
      const tracker = new SshTitleTracker();
      const event = type(tracker, 'Aeonath@SONNET:work/ : ssh astra');
      expect(event).toEqual({ type: 'title', value: 'localuser@astra' });
    });
  });

  describe('while an ssh session is active', () => {
    function activeTracker(configContent?: string): SshTitleTracker {
      if (configContent) {
        (readFileSync as jest.Mock).mockReturnValue(configContent);
      }
      const tracker = new SshTitleTracker();
      type(tracker, 'ssh astra');
      return tracker;
    }

    it('does not change the title when the remote prompt matches what we already show', () => {
      const tracker = activeTracker();
      const event = tracker.feed('\r\nlocaluser@astra:~$ ');
      expect(event).toBeNull();
    });

    it('updates the user when the remote prompt shows a different user (e.g. after sudo)', () => {
      const tracker = activeTracker();
      const event = tracker.feed('\r\nroot@astra:~# ');
      expect(event).toEqual({ type: 'title', value: 'root@astra' });
    });

    it('keeps the alias as the host label even if the remote prompt reports a different hostname', () => {
      const tracker = activeTracker('Host astra\n  HostName 10.0.0.5\n');
      const event = tracker.feed('\r\nlocaluser@internal-node-1:~$ ');
      expect(event).toBeNull();
    });

    it('updates the host label from the live prompt when no alias was matched', () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const tracker = new SshTitleTracker();
      type(tracker, 'ssh 10.0.0.5');
      const event = tracker.feed('\r\nlocaluser@realbox:~$ ');
      expect(event).toEqual({ type: 'title', value: 'localuser@realbox' });
    });

    it('ends the session on a "Connection to ... closed" banner', () => {
      const tracker = activeTracker();
      const event = tracker.feed('Connection to astra closed.\r\n');
      expect(event).toEqual({ type: 'ended' });
      expect(tracker.isActive).toBe(false);
    });

    it('ends the session on a bare "logout" line', () => {
      const tracker = activeTracker();
      const event = tracker.feed('logout\r\n');
      expect(event).toEqual({ type: 'ended' });
    });
  });

  describe('notifyLocalPrompt', () => {
    it('is a no-op when no ssh session is active', () => {
      const tracker = new SshTitleTracker();
      expect(tracker.notifyLocalPrompt()).toBeNull();
    });

    it('ends an active ssh session', () => {
      const tracker = new SshTitleTracker();
      type(tracker, 'ssh astra');
      expect(tracker.isActive).toBe(true);
      const event = tracker.notifyLocalPrompt();
      expect(event).toEqual({ type: 'ended' });
      expect(tracker.isActive).toBe(false);
    });
  });
});
