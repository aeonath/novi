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
