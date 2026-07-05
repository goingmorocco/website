@echo off
cd /d "%~dp0"
start "GoingMorocco CMS Server" cmd /k "node server\index.mjs"
timeout /t 2 /nobreak >nul
start http://localhost:5321
