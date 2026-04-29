@echo off
set REPO=%~dp0..
"%REPO%\node_modules\.bin\electron.cmd" "%REPO%" --novi-cli %*
