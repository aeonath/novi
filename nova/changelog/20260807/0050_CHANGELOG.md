# Changelog — 2026-08-07 00:50

## Ad Hoc — SSH tab title (user@host, live-updating)

### Summary
When you `ssh <alias>` from a Novi terminal tab, the tab title now updates to
`user@host` (e.g. `admin@astra`) instead of staying on the local directory name.
It reverts to the normal `dirname/` title once the ssh session ends.

Host label: the literal token you typed to `ssh` (e.g. `astra`) if it matches
an exact `Host` entry in `~/.ssh/config`; otherwise the hostname the remote
shell itself reports (via its own prompt), since an untyped alias is assumed
to just be the real hostname/IP.

User: tracked live by passively reading the remote shell's own prompt text
(the same `user@host` your default bash/zsh prompt already shows) rather than
guessing — so it reflects the true remote identity and updates automatically
after `sudo -i` / `sudo su - <user>` change it mid-session. Deliberately does
**not** touch the `ssh` invocation itself (no injected remote command, no
`-o`/env overrides) — connections to unusual/restricted/embedded SSH targets
during tomorrow's field testing are unaffected either way.

Session-end detection reuses the existing local OSC 7 (`PROMPT_COMMAND`)
mechanism: once the local shell's own prompt redraws, that can only mean the
ssh session ended, so the tab reverts. Along the way, tightened the OSC 7
handler to only treat sequences whose reported host is `localhost` (our own
injected format) as "local" — previously any OSC 7 the *remote* shell happened
to emit natively (common on Debian/Ubuntu-derived boxes via `/etc/profile.d/vte.sh`)
would have been misread as a local cwd change; this was a latent bug,
independent of this feature, now fixed as a side effect.

### Known limitations (best-effort by design)
- Only tracks the destination as the *first* non-flag argument to `ssh`
  (standard usage). A destination hidden behind shell variables/aliases won't
  be picked up.
- `~/.ssh/config` parsing is a flat line scan for `Host <token>` / `User`; it
  does not follow `Include` directives.
- Live user/host tracking relies on the remote shell's prompt containing a
  recognizable `user@host:` or `user@host ` pattern (the default on virtually
  all bash/zsh installs). A heavily customized prompt (starship, powerlevel10k,
  themes that omit host) or a non-Unix/appliance CLI prompt (network gear,
  embedded devices) won't be picked up — the tab just keeps showing the last
  known title in that case, nothing breaks.

### Files Changed

| File | Change |
|------|--------|
| `src/main/services/ssh-title-tracker.ts` | New — `SshTitleTracker`: watches typed-command echo for `ssh <target>`, resolves alias/user via `~/.ssh/config`, then passively scans subsequent output for the remote prompt's `user@host` (live updates) and common session-exit banners |
| `src/main/main.ts` | `terminal-create`'s `pty.onData` handler now feeds all data through a per-terminal `SshTitleTracker` and sends `terminal-ssh-title` IPC on change; `OSC7_RE` now captures the host component and only treats `localhost`-sourced OSC 7 as a local-prompt signal (bug fix + ssh-end detection) |
| `src/preload/preload.ts` | New `terminalOnSshTitle` / `terminalRemoveSshTitleListener` bridge methods |
| `src/types/global.d.ts` | Typings for the two new preload methods |
| `src/renderer/components/App.ts` | New `terminal-ssh-title` IPC listener — sets the tab title to `💻 user@host`, or reverts to the cwd-derived `💻 dirname/` title when the event signals the session ended |
| `src/tests/core-0.8.0/ssh-title-tracker.test.ts` | New — 19 tests covering command parsing (flags, `-l`, `user@host`, trailing remote commands, backspace-edited input), `~/.ssh/config` alias/User resolution, live prompt-driven user/host updates (including the sudo scenario), exit-banner detection, and `notifyLocalPrompt` |

### Test Results
- 684 tests passed, 0 failed (41 suites) — up from 665/665, 40 suites
- `npm run build` completes cleanly (tsc + esbuild renderer bundle)

### Verification
- Full logic covered by unit tests (see above); no live Electron GUI/E2E run
  performed — this environment has no reachable SSH target and setting up
  Playwright automation + a test SSH server for a one-off check wasn't
  proportionate to a same-day, pre-field-test change. **Needs a live
  smoke test against a real host (e.g. `ssh astra`) before relying on it in
  the field**, including confirming the title updates and then correctly
  flips to `root@astra` after `sudo -i`.

### Commit
TBD
