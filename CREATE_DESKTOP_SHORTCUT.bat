@echo off
chcp 65001 >nul
title Tao Shortcut Desktop — BEATCUT STUDIO
color 0a

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create_shortcut.ps1"

echo.
pause
