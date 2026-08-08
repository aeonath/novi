; © 2025-2026 MiraNova Studios. All rights reserved.
;
; electron-builder NSIS custom script.
; Terminates any running NoviEditor.exe before install/uninstall proceeds so
; the installer never fails to overwrite (or the uninstaller to remove) files
; that are locked by a running instance.

!macro customInit
  nsExec::Exec 'taskkill /F /IM NoviEditor.exe'
!macroend

!macro customUnInit
  nsExec::Exec 'taskkill /F /IM NoviEditor.exe'
!macroend

; Writes two `novi` CLI wrappers into the install dir and adds that dir to
; the current user's PATH:
;   - `novi.cmd`   found by cmd.exe / PowerShell (PATHEXT-based bare-name
;                  resolution; they never match an extensionless file)
;   - `novi`       found by git-bash's bash.exe (POSIX-style bare-name PATH
;                  search — it looks for an exact-name executable and reads
;                  the shebang itself; it does not consult PATHEXT/.cmd)
; Both can live in the same directory with no conflict since each shell's
; own resolution rule only ever matches one of them.
; User-scope (HKCU) PATH, not machine-scope: this installer runs
; per-machine=false / unelevated, so it has no rights to write HKLM's
; Environment key — a prior version targeted 'Machine' and silently failed.
!macro customInstall
  FileOpen $0 "$INSTDIR\novi.cmd" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 '"%~dp0NoviEditor.exe" --novi-cli %*$\r$\n'
  FileClose $0

  ; LF-only line endings — a stray $\r on the shebang line makes bash look
  ; for an interpreter literally named "bash$\r" and fail to run the script.
  FileOpen $0 "$INSTDIR\novi" w
  FileWrite $0 "#!/bin/bash$\n"
  FileWrite $0 'exec "$$(dirname "$$0")/NoviEditor.exe" --novi-cli "$$@"$\n'
  FileClose $0

  FileOpen $0 "$TEMP\novi-path-add.ps1" w
  FileWrite $0 "$$dir = $\"$INSTDIR$\".TrimEnd('\')$\r$\n"
  FileWrite $0 "$$path = [Environment]::GetEnvironmentVariable('Path','User')$\r$\n"
  FileWrite $0 "$$parts = @($$path -split ';' | Where-Object { $$_ -and $$_.TrimEnd('\') -ine $$dir })$\r$\n"
  FileWrite $0 "$$parts += $$dir$\r$\n"
  FileWrite $0 "[Environment]::SetEnvironmentVariable('Path', ($$parts -join ';'), 'User')$\r$\n"
  FileClose $0
  nsExec::Exec 'powershell -NoProfile -ExecutionPolicy Bypass -File "$TEMP\novi-path-add.ps1"'
  Delete "$TEMP\novi-path-add.ps1"
!macroend

; Removes the install dir from the current user's PATH. novi.cmd itself is
; already gone by this point — the uninstaller RMDir /r's $INSTDIR before
; customUnInstall runs.
!macro customUnInstall
  FileOpen $0 "$TEMP\novi-path-remove.ps1" w
  FileWrite $0 "$$dir = $\"$INSTDIR$\".TrimEnd('\')$\r$\n"
  FileWrite $0 "$$path = [Environment]::GetEnvironmentVariable('Path','User')$\r$\n"
  FileWrite $0 "$$parts = @($$path -split ';' | Where-Object { $$_ -and $$_.TrimEnd('\') -ine $$dir })$\r$\n"
  FileWrite $0 "[Environment]::SetEnvironmentVariable('Path', ($$parts -join ';'), 'User')$\r$\n"
  FileClose $0
  nsExec::Exec 'powershell -NoProfile -ExecutionPolicy Bypass -File "$TEMP\novi-path-remove.ps1"'
  Delete "$TEMP\novi-path-remove.ps1"
!macroend
