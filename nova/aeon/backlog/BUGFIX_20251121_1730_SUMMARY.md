# Bugfix: Terminal History Preservation, Prompt Display, and PWD Tracking

**Type:** Bugfix
**Date:** 2025-11-21
**Time:** 17:30

## Summary
Fixed terminal history loss on tab switch, initial prompt cutoff, and added PWD tracking to tab titles.

## Changes
- Modified Terminal.tsx cleanup to preserve xterm instance across tab switches
- Added scroll-to-bottom after initial fit and on tab activation
- Implemented PWD extraction from terminal output with directory name in tab title

## Impact
Terminal now maintains full 50k-line history buffer, displays complete prompt, and shows current directory in tab title (e.g., "💻 nova").

