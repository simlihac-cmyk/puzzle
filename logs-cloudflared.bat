@echo off
setlocal

set "TARGET=sg_mac@100.74.55.70"
set "REMOTE_CMD=zsh -lc 'cd ~/puzzle-deploy && docker compose logs --tail=100 cloudflared'"

echo [LOGS] Connecting to %TARGET%
ssh %TARGET% "%REMOTE_CMD%"
pause
exit /b %ERRORLEVEL%
