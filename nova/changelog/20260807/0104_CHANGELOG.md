# Changelog — 2026-08-07 01:04

## Ad Hoc — Fix SSH tab title still not updating (OSC 0 escape sequence)

### Summary
The previous fix (00:56) addressed a no-newline custom prompt gluing itself to
the typed command, but a second live smoke test still showed no title change.
Reproduced locally with a real git-bash PTY (no actual SSH connection needed —
the bug is entirely in local detection, before any network activity) via a
throwaway script driving `@lydell/node-pty` directly and feeding real onData
chunks into `SshTitleTracker`.

Root cause: git-bash's default prompt emits an OSC 0 "set window title" escape
(`ESC ] 0 ; Aeonath@SONNET: ~ BEL`) immediately after the visible prompt text,
right before the cursor sits and the user starts typing. The tracker's
ANSI-stripper only understood CSI sequences (`ESC [ ... letter`), not OSC
sequences (`ESC ] ... BEL`), so that title-set escape survived stripping and
left `ssh` directly preceded by a raw BEL control character instead of
whitespace — failing the token-boundary match. Separately, bracketed-paste-mode
sequences like `ESC [ ? 2004 h` were also not being stripped, since the CSI
character class was missing `?`.

### Fix
- `ANSI_RE` now strips OSC sequences (`ESC ] ... (BEL | ESC \)`) in addition to
  CSI sequences, and the CSI class now includes `?` for private-mode sequences.
- Stripping now happens once at ingestion (on each raw chunk, before
  char-by-char accumulation into the command-line buffer) rather than only at
  final-match time — keeps the buffer clean throughout and avoids backspace
  accounting interacting with stray escape bytes.

### Files Changed

| File | Change |
|------|--------|
| `src/main/services/ssh-title-tracker.ts` | `ANSI_RE` now strips OSC sequences and `?`-prefixed CSI sequences; `scanForSshCommand` strips escapes from each chunk at ingestion instead of only in `tryStartSsh` |
| `src/tests/core-0.8.0/ssh-title-tracker.test.ts` | New regression test using the exact byte sequence captured from a real git-bash PTY (colored CSI prompt segments + trailing OSC 0 title-set escape) |

### Test Results
- 686 tests passed, 0 failed (41 suites)
- `npm run build` completes cleanly

### Verification
- Reproduced the exact reported failure locally against a real git-bash PTY
  (`@lydell/node-pty`, same spawn args/env as `terminal-service.ts`) and
  confirmed the fix: typing `ssh astra` now fires a `{"type":"title","value":"admin@astra"}`
  event the instant Enter is pressed — including correctly resolving `admin`
  from the user's real `~/.ssh/config` `Host astra` block — and `exit`/`logout`
  correctly fires `{"type":"ended"}`. This covers the local half of the
  feature end-to-end; the actual remote connection and live prompt-tracking
  (e.g. `sudo -i`) still hasn't been exercised against a real remote host from
  this environment — that part still needs the user's own field-test pass.

### Commit
TBD
