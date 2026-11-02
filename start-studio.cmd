@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Sovia Avatar Studio
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.17 or a newer supported LTS version first.
  pause
  exit /b 1
)
if not exist node_modules\next\package.json (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo.
echo Studio URL: http://127.0.0.1:6080
echo Close this window to stop the studio.
start "" http://127.0.0.1:6080
call npm run dev
pause
