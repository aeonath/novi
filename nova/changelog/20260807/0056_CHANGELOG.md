# Changelog — 2026-08-07 00:56

## Ad Hoc — Fix SSH tab title not updating on custom prompts

### Summary
Live smoke test (real `ssh astra`) showed the tab title never changed at all.
Root cause: the `ssh <target>` detection regex required the accumulated line
buffer to *start* with `ssh`. Novi's own default terminal prompt (and any
custom `PS1`) prints without a trailing newline, so the prompt text stays in
the same line buffer as whatever gets typed next — the buffer actually
contained e.g. `Aeonath@SONNET:work/ : ssh astra`, not `ssh astra`, so the
anchored regex never matched and the feature silently did nothing.

### Fix
Replaced the anchored regex with a scan for the last standalone `ssh` word in
the line (bounded by whitespace/line-start and whitespace/line-end), and take
everything after it as the command's arguments — regardless of what prompt
text precedes it. This is robust to any prompt format since we no longer
assume the buffer starts cleanly at the typed command.

### Files Changed

| File | Change |
|------|--------|
| `src/main/services/ssh-title-tracker.ts` | `tryStartSsh()` now finds the last standalone `ssh` token in the accumulated line via `SSH_TOKEN_RE` scan instead of anchoring `SSH_CMD_RE` to line-start |
| `src/tests/core-0.8.0/ssh-title-tracker.test.ts` | New regression test: typed command detected correctly when glued to a no-newline custom prompt (`Aeonath@SONNET:work/ : ssh astra`) |

### Test Results
- 685 tests passed, 0 failed (41 suites)
- `npm run build` completes cleanly

### Verification
- Still not verified live against a real host from this environment (same
  constraint as the prior changelog entry). The regression test reproduces
  the exact buffer content seen in the user's screenshot and now passes;
  needs a repeat live `ssh astra` smoke test to confirm the tab title updates
  end-to-end.

### Commit
TBD
