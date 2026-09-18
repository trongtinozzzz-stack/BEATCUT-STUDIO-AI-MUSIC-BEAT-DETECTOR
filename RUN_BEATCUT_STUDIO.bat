@echo off
chcp 65001 >nul
title BEATCUT STUDIO — AI Music Beat Detector
color 0b

cd /d "%~dp0"

echo ========================================================
echo        BEATCUT STUDIO — AI MUSIC BEAT DETECTOR
echo ========================================================
echo.

:: 1. Uu tien khoi chay file .exe da duoc dong goi san
if exist "release\win-unpacked\BeatCut Studio.exe" (
    echo [KHOI DONG] Dang mo BeatCut Studio (Ban Release)...
    start "" "%~dp0release\win-unpacked\BeatCut Studio.exe"
    exit /b 0
)

:: 2. Neu chua dong goi thi chay qua Electron Runner
if not exist "dist\index.html" (
    echo [THONG BAO] Dang bien dich giao dien lan dau...
    call npm.cmd run build
)

echo [KHOI DONG] Dang mo BeatCut Studio qua Electron...
call npx.cmd electron .

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [CANH BAO] Gap loi khi chay ung dung. Ma loi: %ERRORLEVEL%
    pause
)
