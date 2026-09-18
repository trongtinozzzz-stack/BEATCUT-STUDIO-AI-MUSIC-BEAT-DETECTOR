@echo off
chcp 65001 >nul
title BEATCUT STUDIO — AI Music Beat Detector
color 0b

echo ========================================================
echo        BEATCUT STUDIO — AI MUSIC BEAT DETECTOR
echo ========================================================
echo.

cd /d "%~dp0"

:: Kiem tra neu dist chua ton tai thi tien hanh build truoc
if not exist "dist\index.html" (
    echo [THONG BAO] Dang chuan bi giao dien lan dau...
    call npm.cmd run build
)

echo [KHOI DONG] Dang khoi chay ung dung desktop BEATCUT STUDIO...
echo.

:: Khoi chay Electron
call npx.cmd electron .

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [CANH BAO] Gap loi khi chay ung dung. Ma loi: %ERRORLEVEL%
    pause
)
