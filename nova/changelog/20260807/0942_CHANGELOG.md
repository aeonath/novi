# Changelog — 2026-08-07 09:42

## Ad Hoc — Fix terminal tab not closing when the shell process exits

### Summary
When a user typed `exit` (or the shell process otherwise died on its own,
as opposed to closing the tab via the `x` button), the terminal tab would
sometimes stay open showing a dead terminal instead of closing.

Root cause: the `terminal-exit` IPC handler in `App.ts` called
`tabBarAPI.closeTab(terminalId)` — which is `TabBar.removeTab()`, an
**async** method — without awaiting it, then immediately read
`tabBarAPI.getTabs()` synchronously on the next line. `removeTab()` awaits
`onTabClose` (which itself awaits the `terminalKill` IPC round-trip) before
it mutates its internal `tabs` array, so the synchronous `getTabs()` call
returned the *stale* list that still included the just-exited terminal tab.
The handler then used that stale list to manually reimplement "pick the next
active tab / show the welcome screen" — for the common case of a single
terminal tab exiting, `tabs.length` was wrongly seen as 1 (not 0), so the
welcome-screen branch never ran, and the code instead re-activated the
already-dead terminal tab it was supposed to be closing.

`TabBar` already has correct, race-free logic for this via its
`onAllTabsClosed` / `onTabSwitch` config callbacks (already wired up when
`TabBar` is constructed in `App.ts`, and already used correctly by the
manual "click x to close" path). The fix removes the duplicated,
racy reimplementation and just awaits the close.

### Fix
- `setupIpcListeners()`'s `terminal-exit` handler is now `async` and
  `await`s `tabBarAPI.closeTab(terminalId)` instead of firing it and
  reading tab state synchronously afterward. Removed the manual
  `terminalTabs` filtering and next-tab/welcome-screen logic — `TabBar`'s
  own `onTabClose`/`onTabSwitch`/`onAllTabsClosed` callbacks (already wired)
  now handle it exactly as they do for the manual-close path.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | `terminal-exit` handler awaits `tabBarAPI.closeTab()` instead of racing it; removed duplicated/stale-state next-tab and welcome-screen logic |

### Test Results
- 686 tests passed, 0 failed (41 suites)
- `npm run build` completes cleanly

### Verification
- Traced the async control flow of `TabBar.removeTab()` vs. the previous
  fire-and-forget call site to confirm the stale-read race: `removeTab`
  suspends at `await this.config.onTabClose(tabId)` before filtering
  `this.tabs`, so a caller that doesn't await it observes the pre-close tab
  list. No existing test scaffolding instantiates `App.ts` directly (it's
  DOM/IPC-heavy with no current harness), so this was verified by code
  trace rather than a new automated regression test; `TabBar`'s own
  `removeTab` behavior already has coverage in `tab-bar.test.ts`.

### Commit
TBD
