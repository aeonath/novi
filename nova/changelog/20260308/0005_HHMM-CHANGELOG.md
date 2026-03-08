# Changelog — 20260308.0005

## Ad hoc: Add gtk-update-icon-cache to .deb postinst/postrm

### Problem
After installing the .deb package, users had to manually run `gtk-update-icon-cache` for GNOME to pick up the app icon.

### Changes

| File | Change |
|------|--------|
| `build/after-install.sh` | New — custom postinst script with all electron-builder defaults plus `gtk-update-icon-cache` call |
| `build/after-remove.sh` | New — custom postrm script with cleanup plus `gtk-update-icon-cache` call |
| `package.json` | Added `deb.afterInstall` and `deb.afterRemove` to electron-builder config |

### Notes
- `deb.afterInstall` replaces the auto-generated postinst entirely, so the script includes all original electron-builder content (update-alternatives, chrome-sandbox SUID, update-mime-database, update-desktop-database)
- Both scripts guard `gtk-update-icon-cache` with `hash` check and `|| true` for robustness

### Test Results
- 37 passed, 2 failed (pre-existing)

### Commit
`TBD`
