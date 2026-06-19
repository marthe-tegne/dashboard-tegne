@echo off
cd /d "%~dp0"
echo.
echo Oppdaterer TEGNE Dashboard...
echo.
git add data.json
git commit -m "data: oppdater %date%"
git push
echo.
echo -----------------------------------------------
echo Dashboard oppdatert! Netlify deployer om 1-2 min
echo https://marthe-tegne-dashboard.netlify.app/
echo -----------------------------------------------
echo.
pause
