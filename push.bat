@echo off
cd /d "%~dp0"
echo.
echo Oppdaterer TEGNE Dashboard...
echo.
git add -A
git commit -m "oppdater dashboard %date%"
git push
echo.
echo -----------------------------------------------
echo Dashboard oppdatert! Netlify deployer om 1-2 min
echo https://marthe-tegne-dashboard.netlify.app/
echo -----------------------------------------------
echo.
pause
