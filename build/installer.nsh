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

; Writes the `novi` CLI wrapper into the install dir and adds that dir to the
; system PATH so `novi <file>` works from any shell (cmd, PowerShell, Git Bash).
!macro customInstall
  FileOpen $0 "$INSTDIR\novi.cmd" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 '"%~dp0NoviEditor.exe" --novi-cli %*$\r$\n'
  FileClose $0

  FileOpen $0 "$TEMP\novi-path-add.ps1" w
  FileWrite $0 "$$dir = $\"$INSTDIR$\".TrimEnd('\')$\r$\n"
  FileWrite $0 "$$path = [Environment]::GetEnvironmentVariable('Path','Machine')$\r$\n"
  FileWrite $0 "$$parts = @($$path -split ';' | Where-Object { $$_ -and $$_.TrimEnd('\') -ine $$dir })$\r$\n"
  FileWrite $0 "$$parts += $$dir$\r$\n"
  FileWrite $0 "[Environment]::SetEnvironmentVariable('Path', ($$parts -join ';'), 'Machine')$\r$\n"
  FileClose $0
  nsExec::Exec 'powershell -NoProfile -ExecutionPolicy Bypass -File "$TEMP\novi-path-add.ps1"'
  Delete "$TEMP\novi-path-add.ps1"
!macroend

; Removes the install dir from the system PATH. novi.cmd itself is already
; gone by this point — the uninstaller RMDir /r's $INSTDIR before this runs.
!macro customUnInstall
  FileOpen $0 "$TEMP\novi-path-remove.ps1" w
  FileWrite $0 "$$dir = $\"$INSTDIR$\".TrimEnd('\')$\r$\n"
  FileWrite $0 "$$path = [Environment]::GetEnvironmentVariable('Path','Machine')$\r$\n"
  FileWrite $0 "$$parts = @($$path -split ';' | Where-Object { $$_ -and $$_.TrimEnd('\') -ine $$dir })$\r$\n"
  FileWrite $0 "[Environment]::SetEnvironmentVariable('Path', ($$parts -join ';'), 'Machine')$\r$\n"
  FileClose $0
  nsExec::Exec 'powershell -NoProfile -ExecutionPolicy Bypass -File "$TEMP\novi-path-remove.ps1"'
  Delete "$TEMP\novi-path-remove.ps1"
!macroend
