@echo off
cd /d "%~dp0client"
echo Building the CMS editor...
call npm run build
echo.
echo Done. You can now use start-cms.bat to launch the CMS with one click.
pause
