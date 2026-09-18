@echo off
chcp 65001 >nul
title Git Push — BEATCUT STUDIO
color 0b

echo ========================================================
echo         GIT PUSH AUTOMATION — BEATCUT STUDIO
echo ========================================================
echo Repo: https://github.com/trongtinozzzz-stack/BEATCUT-STUDIO-AI-MUSIC-BEAT-DETECTOR.git
echo.

cd /d "%~dp0"

:: 1. Khoi tao Git neu chua co
if not exist ".git" (
    echo [1/5] Khoi tao Git repository...
    git init
    git branch -M main
) else (
    echo [1/5] Git repository da ton tai.
)

:: 2. Cau hinh Remote Origin
echo [2/5] Kiem tra Remote Origin...
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo       Them remote origin: https://github.com/trongtinozzzz-stack/BEATCUT-STUDIO-AI-MUSIC-BEAT-DETECTOR.git
    git remote add origin https://github.com/trongtinozzzz-stack/BEATCUT-STUDIO-AI-MUSIC-BEAT-DETECTOR.git
) else (
    echo       Cap nhat URL remote origin...
    git remote set-url origin https://github.com/trongtinozzzz-stack/BEATCUT-STUDIO-AI-MUSIC-BEAT-DETECTOR.git
)

:: 3. Them tat ca cac thay doi (tuan thu .gitignore)
echo [3/5] Dang them file vao Staging (git add .)...
git add .

:: 4. Nhap noi dung Commit
echo.
set /p "COMMIT_MSG=Nhap noi dung commit (Nhan Enter de dung mac dinh): "
if "%COMMIT_MSG%"=="" (
    set "COMMIT_MSG=Release: BEATCUT STUDIO - AI Music Beat Detector with Librosa Engine"
)

echo.
echo [4/5] Dang tao Commit: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"

:: 5. Push len GitHub
echo.
echo [5/5] Dang day code len GitHub (git push -u origin main)...
git branch -M main
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo         DA PUSH CODE LEN GITHUB THANH CONG!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  [CHU Y] Push gap loi hoac can xac thuc GitHub Credentials.
    echo  Neu repo tren GitHub da co san file README/License,
    echo  ban co the can chay: git pull origin main --rebase
    echo ========================================================
)

echo.
pause
