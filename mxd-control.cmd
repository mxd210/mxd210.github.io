@echo off
setlocal
set SITE_REPO=%~dp0..\mxd210.github.io
powershell -ExecutionPolicy Bypass -File "%~dp0mxd-control.ps1" -SiteRepo "%SITE_REPO%" %*
